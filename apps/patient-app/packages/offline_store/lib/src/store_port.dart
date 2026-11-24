import 'package:meta/meta.dart';

/// Enforces tenant, patient, and acting-user isolation across all locally cached
/// records and outbox entries (`v2.1 §9.5 & §11.4`).
@immutable
class StoragePartitionKey {
  const StoragePartitionKey({
    required this.tenantId,
    required this.patientId,
    required this.actorId,
  });

  final String tenantId;
  final String patientId;
  final String actorId;

  String toNamespace() => '$tenantId::$patientId::$actorId';

  String scopedKey(String key) => '${toNamespace()}::$key';

  @override
  bool operator ==(Object other) =>
      other is StoragePartitionKey &&
      other.tenantId == tenantId &&
      other.patientId == patientId &&
      other.actorId == actorId;

  @override
  int get hashCode => Object.hash(tenantId, patientId, actorId);
}

/// Abstract encrypted key-value store port implemented differently per platform
/// (native secure enclave/SQLCipher vs Web verification adapter) per OCP.
abstract interface class OfflineStorePort {
  Future<void> write({
    required StoragePartitionKey partition,
    required String key,
    required String value,
  });

  Future<String?> read({
    required StoragePartitionKey partition,
    required String key,
  });

  Future<List<String>> keysForPartition(StoragePartitionKey partition);

  Future<void> purgePartition(StoragePartitionKey partition);

  Future<void> purgeAll();
}
