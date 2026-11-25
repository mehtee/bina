import 'dart:convert';

import 'package:bina_api_dtos/bina_api_dtos.dart';
import 'package:bina_offline_store/bina_offline_store.dart';
import 'patient_gateway.dart';

/// OCP transport adapter wiring [OutboxCoordinator] to [PatientGatewayPort]
/// while preserving idempotency keys and fail-closed 403/revocation semantics.
final class PatientOutboxTransport implements OutboxTransportPort {
  PatientOutboxTransport({
    required this.gateway,
    required this.sessionProvider,
  });

  final PatientGatewayPort gateway;
  final AuthSessionContext? Function() sessionProvider;

  @override
  Future<OutboxDispatchResult> send(OutboxEntry entry) async {
    final session = sessionProvider();
    if (session == null) {
      return const OutboxDispatchResult(
        status: OutboxSyncStatus.unauthorizedOrRevoked,
        failureReasonFa: 'نشست کاربری فعال نیست.',
      );
    }

    try {
      final decoded = jsonDecode(entry.payloadJson) as Map<String, Object?>;
      if (entry.operationType == 'adherence') {
        final episodeId = decoded['episodeId']! as String;
        final req = AdherenceEventRequest.fromJson(decoded['request']! as Map<String, Object?>);
        final res = await gateway.recordMedicationAdherence(
          session: session,
          episodeId: episodeId,
          idempotencyKey: entry.idempotencyKey,
          request: req,
        );
        return OutboxDispatchResult(
          status: OutboxSyncStatus.acknowledged,
          acknowledgedAtUtc: DateTime.tryParse(res.recordedAt) ?? DateTime.now().toUtc(),
        );
      }
      if (entry.operationType == 'symptoms') {
        final episodeId = decoded['episodeId']! as String;
        final req = SymptomReportRequest.fromJson(decoded['request']! as Map<String, Object?>);
        await gateway.submitSymptomReport(
          session: session,
          episodeId: episodeId,
          idempotencyKey: entry.idempotencyKey,
          request: req,
        );
        return OutboxDispatchResult(
          status: OutboxSyncStatus.acknowledged,
          acknowledgedAtUtc: DateTime.now().toUtc(),
        );
      }
      if (entry.operationType == 'home_vision_test') {
        final req = HomeVisionTestRequest.fromJson(decoded['request']! as Map<String, Object?>);
        await gateway.submitHomeVisionTest(
          session: session,
          idempotencyKey: entry.idempotencyKey,
          request: req,
        );
        return OutboxDispatchResult(
          status: OutboxSyncStatus.acknowledged,
          acknowledgedAtUtc: DateTime.now().toUtc(),
        );
      }
      return const OutboxDispatchResult(
        status: OutboxSyncStatus.conflictOrRejected,
        failureReasonFa: 'نوع عملیات پشتیبانی نمی‌شود.',
      );
    } on PatientGatewayException catch (err) {
      if (err.isUnauthorizedOrRevoked) {
        return OutboxDispatchResult(
          status: OutboxSyncStatus.unauthorizedOrRevoked,
          failureReasonFa: err.messageFa,
        );
      }
      if (err.statusCode >= 400 && err.statusCode < 500) {
        return OutboxDispatchResult(
          status: OutboxSyncStatus.conflictOrRejected,
          failureReasonFa: err.messageFa,
        );
      }
      return OutboxDispatchResult(
        status: OutboxSyncStatus.retryableFailure,
        failureReasonFa: err.messageFa,
      );
    } catch (_) {
      return const OutboxDispatchResult(
        status: OutboxSyncStatus.retryableFailure,
        failureReasonFa: 'اتصال اینترنت برقرار نیست.',
      );
    }
  }
}
