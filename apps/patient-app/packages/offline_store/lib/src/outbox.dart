import 'package:meta/meta.dart';
import 'store_port.dart';

/// Authoritative transport states (`BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md` §11.4).
enum OutboxSyncStatus {
  draft,
  pendingUpload,
  sending,
  acknowledged,
  retryableFailure,
  conflictOrRejected,
  unauthorizedOrRevoked,
}

@immutable
class OutboxEntry {
  const OutboxEntry({
    required this.idempotencyKey,
    required this.partition,
    required this.operationType,
    required this.endpointPath,
    required this.payloadJson,
    required this.createdAtUtc,
    required this.status,
    this.eyeLaterality,
    this.prescriptionVersion,
    this.attemptCount = 0,
    this.acknowledgedAtUtc,
    this.failureReasonFa,
  });

  final String idempotencyKey;
  final StoragePartitionKey partition;
  final String operationType;
  final String endpointPath;
  final String payloadJson;
  final DateTime createdAtUtc;
  final OutboxStatusValue status;
  final String? eyeLaterality;
  final int? prescriptionVersion;
  final int attemptCount;
  final DateTime? acknowledgedAtUtc;
  final String? failureReasonFa;

  OutboxEntry copyWith({
    OutboxStatusValue? status,
    int? attemptCount,
    DateTime? acknowledgedAtUtc,
    String? failureReasonFa,
  }) {
    return OutboxEntry(
      idempotencyKey: idempotencyKey,
      partition: partition,
      operationType: operationType,
      endpointPath: endpointPath,
      payloadJson: payloadJson,
      createdAtUtc: createdAtUtc,
      status: status ?? this.status,
      eyeLaterality: eyeLaterality,
      prescriptionVersion: prescriptionVersion,
      attemptCount: attemptCount ?? this.attemptCount,
      acknowledgedAtUtc: acknowledgedAtUtc ?? this.acknowledgedAtUtc,
      failureReasonFa: failureReasonFa ?? this.failureReasonFa,
    );
  }
}

typedef OutboxStatusValue = OutboxSyncStatus;

@immutable
class OutboxDispatchResult {
  const OutboxDispatchResult({
    required this.status,
    this.acknowledgedAtUtc,
    this.failureReasonFa,
  });

  final OutboxSyncStatus status;
  final DateTime? acknowledgedAtUtc;
  final String? failureReasonFa;
}

/// Pluggable transport handler executed by [OutboxCoordinator].
abstract interface class OutboxTransportPort {
  Future<OutboxDispatchResult> send(OutboxEntry entry);
}

/// Manages durable idempotent persistence without losing or mutating keys.
abstract interface class OutboxQueuePort {
  Future<void> enqueue(OutboxEntry entry);

  Future<List<OutboxEntry>> listForPartition(StoragePartitionKey partition);

  Future<void> flushPartition(StoragePartitionKey partition);

  Future<void> purgePartition(StoragePartitionKey partition);
}
