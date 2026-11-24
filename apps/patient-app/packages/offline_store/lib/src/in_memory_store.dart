import 'dart:collection';
import 'outbox.dart';
import 'store_port.dart';

/// Deterministic in-memory [OfflineStorePort] for unit tests and isolated
/// Flutter Web verification harnesses.
final class InMemoryOfflineStore implements OfflineStorePort {
  final Map<String, String> _data = <String, String>{};

  @override
  Future<void> write({
    required StoragePartitionKey partition,
    required String key,
    required String value,
  }) async {
    _data[partition.scopedKey(key)] = value;
  }

  @override
  Future<String?> read({
    required StoragePartitionKey partition,
    required String key,
  }) async {
    return _data[partition.scopedKey(key)];
  }

  @override
  Future<List<String>> keysForPartition(StoragePartitionKey partition) async {
    final prefix = '${partition.toNamespace()}::';
    return _data.keys
        .where((k) => k.startsWith(prefix))
        .map((k) => k.substring(prefix.length))
        .toList(growable: false);
  }

  @override
  Future<void> purgePartition(StoragePartitionKey partition) async {
    final prefix = '${partition.toNamespace()}::';
    _data.removeWhere((k, _) => k.startsWith(prefix));
  }

  @override
  Future<void> purgeAll() async {
    _data.clear();
  }
}

/// Partition-isolated idempotent outbox queue (`v2.1 §11.4`).
final class InMemoryOutboxQueue implements OutboxQueuePort {
  InMemoryOutboxQueue({required this.transport});

  final OutboxTransportPort transport;
  final Map<String, List<OutboxEntry>> _queues = <String, List<OutboxEntry>>{};

  @override
  Future<void> enqueue(OutboxEntry entry) async {
    final ns = entry.partition.toNamespace();
    final list = _queues.putIfAbsent(ns, () => <OutboxEntry>[]);
    final exists = list.any((e) => e.idempotencyKey == entry.idempotencyKey);
    if (!exists) {
      list.add(entry);
    }
  }

  @override
  Future<List<OutboxEntry>> listForPartition(StoragePartitionKey partition) async {
    final list = _queues[partition.toNamespace()] ?? const <OutboxEntry>[];
    return UnmodifiableListView<OutboxEntry>(list);
  }

  @override
  Future<void> flushPartition(StoragePartitionKey partition) async {
    final ns = partition.toNamespace();
    final list = _queues[ns];
    if (list == null || list.isEmpty) return;

    for (var i = 0; i < list.length; i += 1) {
      final current = list[i];
      if (current.status == OutboxSyncStatus.acknowledged ||
          current.status == OutboxSyncStatus.conflictOrRejected ||
          current.status == OutboxSyncStatus.unauthorizedOrRevoked) {
        continue;
      }

      list[i] = current.copyWith(status: OutboxSyncStatus.sending);
      final outcome = await transport.send(list[i]);
      list[i] = list[i].copyWith(
        status: outcome.status,
        attemptCount: current.attemptCount + 1,
        acknowledgedAtUtc: outcome.acknowledgedAtUtc,
        failureReasonFa: outcome.failureReasonFa,
      );

      // Fail closed immediately on 403/revoked access.
      if (outcome.status == OutboxSyncStatus.unauthorizedOrRevoked) {
        break;
      }
    }
  }

  @override
  Future<void> purgePartition(StoragePartitionKey partition) async {
    _queues.remove(partition.toNamespace());
  }
}
