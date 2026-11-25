import 'dart:collection';
import 'dart:convert';

import 'outbox.dart';
import 'store_port.dart';

/// Durable partition-isolated [OutboxQueuePort] backed by [OfflineStorePort].
/// Survives simulated app restarts and preserves exact idempotency keys (`v2.1 §11.4`).
final class PersistentOutboxQueue implements OutboxQueuePort {
  PersistentOutboxQueue({
    required this.store,
    required this.transport,
  });

  static const String _entriesKey = '__outbox_entries__';

  final OfflineStorePort store;
  final OutboxTransportPort transport;

  Future<List<OutboxEntry>> _readEntries(StoragePartitionKey partition) async {
    final raw = await store.read(partition: partition, key: _entriesKey);
    if (raw == null || raw.isEmpty) return <OutboxEntry>[];
    final decoded = jsonDecode(raw) as List<Object?>;
    return decoded
        .map((item) => OutboxEntry.fromJson(item! as Map<String, Object?>))
        .toList();
  }

  Future<void> _writeEntries(StoragePartitionKey partition, List<OutboxEntry> entries) async {
    await store.write(
      partition: partition,
      key: _entriesKey,
      value: jsonEncode(entries.map((e) => e.toJson()).toList(growable: false)),
    );
  }

  @override
  Future<void> enqueue(OutboxEntry entry) async {
    final entries = await _readEntries(entry.partition);
    final exists = entries.any((e) => e.idempotencyKey == entry.idempotencyKey);
    if (exists) return;
    entries.add(entry);
    await _writeEntries(entry.partition, entries);
  }

  @override
  Future<List<OutboxEntry>> listForPartition(StoragePartitionKey partition) async {
    return UnmodifiableListView<OutboxEntry>(await _readEntries(partition));
  }

  @override
  Future<void> flushPartition(StoragePartitionKey partition) async {
    final entries = await _readEntries(partition);
    if (entries.isEmpty) return;

    var dirty = false;
    for (var i = 0; i < entries.length; i += 1) {
      final current = entries[i];
      if (current.status == OutboxSyncStatus.acknowledged ||
          current.status == OutboxSyncStatus.conflictOrRejected ||
          current.status == OutboxSyncStatus.unauthorizedOrRevoked) {
        continue;
      }

      entries[i] = current.copyWith(status: OutboxSyncStatus.sending);
      await _writeEntries(partition, entries);

      final outcome = await transport.send(entries[i]);
      entries[i] = entries[i].copyWith(
        status: outcome.status,
        attemptCount: current.attemptCount + 1,
        acknowledgedAtUtc: outcome.acknowledgedAtUtc,
        failureReasonFa: outcome.failureReasonFa,
      );
      dirty = true;
      await _writeEntries(partition, entries);

      if (outcome.status == OutboxSyncStatus.unauthorizedOrRevoked) {
        break;
      }
    }

    if (dirty) {
      await _writeEntries(partition, entries);
    }
  }

  @override
  Future<void> purgePartition(StoragePartitionKey partition) async {
    await store.purgePartition(partition);
  }
}
