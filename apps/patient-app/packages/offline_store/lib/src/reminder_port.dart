import 'dart:collection';
import 'package:meta/meta.dart';

/// Eye-isolated, PHI-free local notification record (`ADR-019`, `ADR-043`, `v2.1 §11.3`).
@immutable
class ReminderScheduleItem {
  const ReminderScheduleItem({
    required this.tenantId,
    required this.patientId,
    required this.episodeId,
    required this.eyeLaterality,
    required this.prescriptionVersion,
    required this.doseId,
    required this.scheduledAtIso,
    this.genericBodyFa = defaultPhiFreeBodyFa,
  });

  /// Generic PHI-free lock-screen copy mandated by `v2.1 §11.3`.
  static const String defaultPhiFreeBodyFa = 'زمان بررسی برنامه مراقبت شماست';

  final String tenantId;
  final String patientId;
  final String episodeId;
  final String eyeLaterality; // 'OD' | 'OS'
  final int prescriptionVersion;
  final String doseId;
  final String scheduledAtIso;
  final String genericBodyFa;

  String get stableKey =>
      '$tenantId::$patientId::$episodeId::$eyeLaterality::v$prescriptionVersion::$doseId';
}

/// Abstract local notification scheduler port isolating OS notification engines
/// from care-plan features (`v2.1 §11.3`).
abstract interface class LocalReminderPort {
  Future<bool> hasOsPermission();

  Future<bool> requestPermission();

  Future<void> syncEpisodeEyeReminders({
    required String tenantId,
    required String patientId,
    required String episodeId,
    required String eyeLaterality,
    required List<ReminderScheduleItem> items,
  });

  Future<void> cancelForPatient({
    required String tenantId,
    required String patientId,
  });

  Future<void> cancelAll();

  Future<List<ReminderScheduleItem>> listScheduled({
    required String tenantId,
    required String patientId,
  });
}

/// Deterministic in-memory [LocalReminderPort] used in tests & Web verification.
final class InMemoryLocalReminderAdapter implements LocalReminderPort {
  InMemoryLocalReminderAdapter({bool initialOsPermission = false})
      : _hasPermission = initialOsPermission;

  bool _hasPermission;
  final Map<String, ReminderScheduleItem> _items = <String, ReminderScheduleItem>{};

  @override
  Future<bool> hasOsPermission() async => _hasPermission;

  @override
  Future<bool> requestPermission() async => _hasPermission;

  void setPermissionForTest(bool granted) => _hasPermission = granted;

  @override
  Future<void> syncEpisodeEyeReminders({
    required String tenantId,
    required String patientId,
    required String episodeId,
    required String eyeLaterality,
    required List<ReminderScheduleItem> items,
  }) async {
    // Only clear notifications for the EXACT (tenant, patient, episode, eyeLaterality) tuple.
    // Updating OS must NEVER touch OD reminders!
    _items.removeWhere(
      (_, item) =>
          item.tenantId == tenantId &&
          item.patientId == patientId &&
          item.episodeId == episodeId &&
          item.eyeLaterality == eyeLaterality,
    );
    if (!_hasPermission) return;
    for (final item in items) {
      if (item.tenantId == tenantId &&
          item.patientId == patientId &&
          item.episodeId == episodeId &&
          item.eyeLaterality == eyeLaterality) {
        _items[item.stableKey] = item;
      }
    }
  }

  @override
  Future<void> cancelForPatient({
    required String tenantId,
    required String patientId,
  }) async {
    _items.removeWhere((_, item) => item.tenantId == tenantId && item.patientId == patientId);
  }

  @override
  Future<void> cancelAll() async {
    _items.clear();
  }

  @override
  Future<List<ReminderScheduleItem>> listScheduled({
    required String tenantId,
    required String patientId,
  }) async {
    return UnmodifiableListView<ReminderScheduleItem>(
      _items.values.where((i) => i.tenantId == tenantId && i.patientId == patientId),
    );
  }
}
