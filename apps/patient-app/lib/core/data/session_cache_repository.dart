import 'dart:convert';

import 'package:bina_api_dtos/bina_api_dtos.dart';
import 'package:bina_offline_store/bina_offline_store.dart';
import 'package:flutter/foundation.dart';
import 'patient_gateway.dart';

@immutable
class CachedPayload<T> {
  const CachedPayload({
    required this.data,
    required this.cachedAtUtc,
  });

  final T data;
  final DateTime cachedAtUtc;
}

/// Partition-scoped encrypted offline cache (`v2.1 §11.4`).
/// Stores ONLY authorized clinic info, active care plan, and signed diagnostic
/// summaries — NEVER caches unsigned drafts, raw specialist scores, or
/// cross-tenant records.
final class SessionCacheRepository {
  SessionCacheRepository(this._store);

  final OfflineStorePort _store;

  static StoragePartitionKey partitionFor(AuthSessionContext session) => StoragePartitionKey(
        tenantId: session.tenantId,
        patientId: session.patientId,
        actorId: session.actorPartitionId,
      );

  Future<void> _writeEnvelope(
    AuthSessionContext session,
    String key,
    Map<String, Object?> payload,
    DateTime nowUtc,
  ) async {
    await _store.write(
      partition: partitionFor(session),
      key: key,
      value: jsonEncode(<String, Object?>{
        'cachedAtUtc': nowUtc.toUtc().toIso8601String(),
        'payload': payload,
      }),
    );
  }

  Future<CachedPayload<T>?> _readEnvelope<T>(
    AuthSessionContext session,
    String key,
    T Function(Map<String, Object?> json) parser,
  ) async {
    final raw = await _store.read(partition: partitionFor(session), key: key);
    if (raw == null || raw.isEmpty) return null;
    final decoded = jsonDecode(raw) as Map<String, Object?>;
    final cachedAt = DateTime.parse(decoded['cachedAtUtc']! as String).toUtc();
    final payload = parser(decoded['payload']! as Map<String, Object?>);
    return CachedPayload<T>(data: payload, cachedAtUtc: cachedAt);
  }

  Future<void> saveClinic(AuthSessionContext session, ClinicProfile clinic, [DateTime? now]) =>
      _writeEnvelope(session, 'clinic', clinic.toJson(), now ?? DateTime.now().toUtc());

  Future<CachedPayload<ClinicProfile>?> loadClinic(AuthSessionContext session) =>
      _readEnvelope(session, 'clinic', ClinicProfile.fromJson);

  Future<void> saveTodayPlan(AuthSessionContext session, PatientTodayResponse plan, [DateTime? now]) =>
      _writeEnvelope(session, 'today_plan', plan.toJson(), now ?? DateTime.now().toUtc());

  Future<CachedPayload<PatientTodayResponse>?> loadTodayPlan(AuthSessionContext session) =>
      _readEnvelope(session, 'today_plan', PatientTodayResponse.fromJson);

  Future<void> saveEpisodes(AuthSessionContext session, PatientEpisodeListResponse episodes, [DateTime? now]) =>
      _writeEnvelope(session, 'episodes', episodes.toJson(), now ?? DateTime.now().toUtc());

  Future<CachedPayload<PatientEpisodeListResponse>?> loadEpisodes(AuthSessionContext session) =>
      _readEnvelope(session, 'episodes', PatientEpisodeListResponse.fromJson);

  Future<void> saveProfile(AuthSessionContext session, PatientProfileResponse profile, [DateTime? now]) =>
      _writeEnvelope(session, 'profile', profile.toJson(), now ?? DateTime.now().toUtc());

  Future<CachedPayload<PatientProfileResponse>?> loadProfile(AuthSessionContext session) =>
      _readEnvelope(session, 'profile', PatientProfileResponse.fromJson);

  Future<void> saveSignedSummaries(
    AuthSessionContext session,
    PatientDiagnosticSummaryList list, [
    DateTime? now,
  ]) =>
      _writeEnvelope(session, 'signed_summaries', list.toJson(), now ?? DateTime.now().toUtc());

  Future<CachedPayload<PatientDiagnosticSummaryList>?> loadSignedSummaries(AuthSessionContext session) =>
      _readEnvelope(session, 'signed_summaries', PatientDiagnosticSummaryList.fromJson);

  Future<void> purgeForSession(AuthSessionContext session) =>
      _store.purgePartition(partitionFor(session));
}
