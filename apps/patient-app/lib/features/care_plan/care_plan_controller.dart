import 'dart:convert';

import 'package:bina_api_dtos/bina_api_dtos.dart';
import 'package:bina_offline_store/bina_offline_store.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../app/providers.dart';
import '../../core/data/patient_gateway.dart';
import '../../core/data/session_cache_repository.dart';

/// Composite stable dose identifier (`episodeId::eye::vN::index`) preventing any
/// cross-eye or cross-version state collision (`ADR-043`).
String buildDoseRouteKey(PatientTodayDropCard item, int indexInList) =>
    '${item.episodeId}_${item.eyeLaterality.value}_v${item.prescriptionVersion}_$indexInList';

@immutable
class CarePlanSnapshot {
  const CarePlanSnapshot({
    required this.clinic,
    required this.todayPlan,
    required this.episodes,
    required this.outboxEntries,
    required this.isFromOfflineCache,
    required this.cachedAtUtc,
    required this.updatedEyes,
    required this.reminderPermissionGranted,
    required this.remindersEnabledByEye,
  });

  final ClinicProfile clinic;
  final PatientTodayResponse todayPlan;
  final List<PatientEpisodeWithPrescription> episodes;
  final List<OutboxEntry> outboxEntries;
  final bool isFromOfflineCache;
  final DateTime cachedAtUtc;
  final Set<EyeLaterality> updatedEyes;
  final bool reminderPermissionGranted;
  final Map<String, bool> remindersEnabledByEye;

  int get pendingOutboxCount =>
      outboxEntries.where((e) => e.status != OutboxSyncStatus.acknowledged).length;

  /// Latest adherence transport state matching a specific `(episodeId, eye, rxVersion)` card.
  OutboxEntry? latestOutboxForCard(PatientTodayDropCard card) {
    for (final entry in outboxEntries.reversed) {
      if (entry.operationType == 'adherence' &&
          entry.eyeLaterality == card.eyeLaterality.value &&
          entry.prescriptionVersion == card.prescriptionVersion &&
          entry.endpointPath.contains(card.episodeId)) {
        return entry;
      }
    }
    return null;
  }

  PatientTodayDropCard? findCardByRouteKey(String key) {
    for (var i = 0; i < todayPlan.scheduleItems.length; i += 1) {
      final item = todayPlan.scheduleItems[i];
      if (buildDoseRouteKey(item, i) == key) {
        return item;
      }
    }
    return null;
  }
}

class CarePlanController extends AsyncNotifier<CarePlanSnapshot> {
  final Map<String, int> _lastSeenRxVersionByEye = <String, int>{};
  final Map<String, bool> _reminderPrefByEye = <String, bool>{};
  static const Uuid _uuid = Uuid();

  @override
  Future<CarePlanSnapshot> build() async {
    final session = ref.watch(sessionProvider);
    if (session == null) {
      throw const PatientGatewayException(
        statusCode: 401,
        code: 'UNAUTHENTICATED',
        messageFa: 'برای مشاهده برنامه مراقبت وارد شوید.',
      );
    }
    return _loadForSession(session);
  }

  Future<void> refreshPlan() async {
    final session = ref.read(sessionProvider);
    if (session == null) return;
    state = AsyncValue.data(await _loadForSession(session));
  }

  Future<CarePlanSnapshot> _loadForSession(AuthSessionContext session) async {
    final gw = ref.read(patientGatewayProvider);
    final cache = ref.read(sessionCacheRepositoryProvider);
    final outbox = ref.read(outboxQueueProvider);
    final reminders = ref.read(localReminderPortProvider);
    final partition = SessionCacheRepository.partitionFor(session);

    ClinicProfile clinic;
    PatientTodayResponse todayPlan;
    PatientEpisodeListResponse episodesResp;
    var isFromCache = false;
    var cachedAt = DateTime.now().toUtc();

    try {
      clinic = await gw.getCurrentClinic(session: session);
      todayPlan = await gw.getPatientTodayPlan(session);
      episodesResp = await gw.listPatientEpisodes(session);
      await cache.saveClinic(session, clinic, cachedAt);
      await cache.saveTodayPlan(session, todayPlan, cachedAt);
      await cache.saveEpisodes(session, episodesResp, cachedAt);
    } on PatientGatewayException catch (err) {
      if (err.isUnauthorizedOrRevoked && session.actorType == 'caregiver') {
        await cache.purgeForSession(session);
      }
      rethrow;
    } catch (_) {
      final cachedClinic = await cache.loadClinic(session);
      final cachedPlan = await cache.loadTodayPlan(session);
      final cachedEps = await cache.loadEpisodes(session);
      if (cachedClinic == null || cachedPlan == null) {
        rethrow;
      }
      clinic = cachedClinic.data;
      todayPlan = cachedPlan.data;
      episodesResp = cachedEps?.data ?? const PatientEpisodeListResponse(items: []);
      isFromCache = true;
      cachedAt = cachedPlan.cachedAtUtc;
    }

    // Track per-eye prescription version changes without touching unaffected eyes (`CARE-12`).
    final updatedEyes = <EyeLaterality>{};
    for (final epPair in episodesResp.items) {
      final ep = epPair.episode;
      final eyeKey = '${ep.patientId}::${ep.episodeId}::${ep.eyeLaterality.value}';
      final prev = _lastSeenRxVersionByEye[eyeKey];
      if (prev != null && ep.activePrescriptionVersion > prev) {
        updatedEyes.add(ep.eyeLaterality);
      }
      _lastSeenRxVersionByEye[eyeKey] = ep.activePrescriptionVersion;
    }

    // Sync local reminders STRICTLY per (episodeId, eyeLaterality) (`ADR-043`).
    final osPermission = await reminders.hasOsPermission();
    for (final epPair in episodesResp.items) {
      final ep = epPair.episode;
      final eyeKey = '${ep.episodeId}::${ep.eyeLaterality.value}';
      final enabled = _reminderPrefByEye[eyeKey] ?? osPermission;
      final cards = todayPlan.scheduleItems
          .where((c) => c.episodeId == ep.episodeId && c.eyeLaterality == ep.eyeLaterality)
          .toList();
      final scheduledItems = (osPermission && enabled)
          ? <ReminderScheduleItem>[
              for (var i = 0; i < cards.length; i += 1)
                ReminderScheduleItem(
                  tenantId: ep.tenantId,
                  patientId: ep.patientId,
                  episodeId: ep.episodeId,
                  eyeLaterality: ep.eyeLaterality.value,
                  prescriptionVersion: ep.activePrescriptionVersion,
                  doseId: 'dose_${ep.activePrescriptionVersion}_$i',
                  scheduledAtIso: DateTime.now().toUtc().toIso8601String(),
                ),
            ]
          : const <ReminderScheduleItem>[];
      await reminders.syncEpisodeEyeReminders(
        tenantId: ep.tenantId,
        patientId: ep.patientId,
        episodeId: ep.episodeId,
        eyeLaterality: ep.eyeLaterality.value,
        items: scheduledItems,
      );
    }

    final entries = await outbox.listForPartition(partition);
    return CarePlanSnapshot(
      clinic: clinic,
      todayPlan: todayPlan,
      episodes: episodesResp.items,
      outboxEntries: entries,
      isFromOfflineCache: isFromCache,
      cachedAtUtc: cachedAt,
      updatedEyes: updatedEyes,
      reminderPermissionGranted: osPermission,
      remindersEnabledByEye: Map<String, bool>.unmodifiable(_reminderPrefByEye),
    );
  }

  /// Writes durable outbox record FIRST (`pendingUpload` with fixed `idempotencyKey`),
  /// then attempts flush (`v2.1 §11.4`). Never returns premature server ack when offline.
  Future<OutboxEntry> recordDoseAdherence({
    required PatientTodayDropCard card,
    required AdherenceState outcomeState,
    String? reasonFa,
  }) async {
    final session = ref.read(sessionProvider);
    if (session == null) {
      throw const PatientGatewayException(
        statusCode: 401,
        code: 'UNAUTHENTICATED',
        messageFa: 'برای ثبت مصرف ابتدا وارد شوید.',
      );
    }

    final partition = SessionCacheRepository.partitionFor(session);
    final outbox = ref.read(outboxQueueProvider);
    final idempotencyKey = _uuid.v4();
    final nowUtc = DateTime.now().toUtc();

    final req = AdherenceEventRequest(
      eyeLaterality: card.eyeLaterality,
      prescriptionVersion: card.prescriptionVersion,
      state: outcomeState,
      reasonFa: reasonFa,
      occurredAt: nowUtc.toIso8601String(),
    );

    final entry = OutboxEntry(
      idempotencyKey: idempotencyKey,
      partition: partition,
      operationType: 'adherence',
      endpointPath: '/v1/episodes/${card.episodeId}/adherence',
      payloadJson: jsonEncode(<String, Object?>{
        'episodeId': card.episodeId,
        'request': req.toJson(),
      }),
      createdAtUtc: nowUtc,
      status: OutboxSyncStatus.pendingUpload,
      eyeLaterality: card.eyeLaterality.value,
      prescriptionVersion: card.prescriptionVersion,
    );

    await outbox.enqueue(entry);
    await outbox.flushPartition(partition);

    final entries = await outbox.listForPartition(partition);
    final committed = entries.firstWhere((e) => e.idempotencyKey == idempotencyKey, orElse: () => entry);

    final current = state.asData?.value;
    if (current != null) {
      state = AsyncValue.data(
        CarePlanSnapshot(
          clinic: current.clinic,
          todayPlan: current.todayPlan,
          episodes: current.episodes,
          outboxEntries: entries,
          isFromOfflineCache: current.isFromOfflineCache,
          cachedAtUtc: current.cachedAtUtc,
          updatedEyes: current.updatedEyes,
          reminderPermissionGranted: current.reminderPermissionGranted,
          remindersEnabledByEye: current.remindersEnabledByEye,
        ),
      );
    }
    return committed;
  }

  /// Requests OS permission and toggles eye-specific reminder honestly (`CARE-05`).
  Future<bool> toggleEyeReminder({
    required String episodeId,
    required EyeLaterality eye,
    required bool desiredEnabled,
  }) async {
    final reminders = ref.read(localReminderPortProvider);
    final granted = desiredEnabled ? await reminders.requestPermission() : true;
    final key = '$episodeId::${eye.value}';
    if (!granted && desiredEnabled) {
      _reminderPrefByEye[key] = false;
      await refreshPlan();
      return false;
    }
    _reminderPrefByEye[key] = desiredEnabled;
    await refreshPlan();
    return desiredEnabled;
  }
}

final carePlanControllerProvider =
    AsyncNotifierProvider<CarePlanController, CarePlanSnapshot>(CarePlanController.new);
