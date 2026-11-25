import 'dart:js_interop';

import 'in_memory_store.dart';
import 'store_port.dart';

@JS('window.localStorage')
external _WebStorage? get _localStorage;

extension type _WebStorage(JSObject _) implements JSObject {
  external int get length;
  external String? key(int index);
  external String? getItem(String key);
  external void setItem(String key, String value);
  external void removeItem(String key);
}

/// Partition-isolated Web `localStorage` adapter (`v2.1 §11.4`).
/// Persists non-PHI UI preferences (`app_prefs`) across browser refreshes, while
/// gating clinical cache/outbox persistence strictly to [allowClinicalPayloads]
/// (enabled only for synthetic mock/verification builds, never live PHI).
final class WebLocalStorageOfflineStore implements OfflineStorePort {
  WebLocalStorageOfflineStore({required this.allowClinicalPayloads});

  final bool allowClinicalPayloads;
  final InMemoryOfflineStore _volatileFallback = InMemoryOfflineStore();
  static const String _globalPrefix = 'bina_ls_v1::';

  bool _shouldPersistPartition(StoragePartitionKey partition) =>
      allowClinicalPayloads || partition.patientId == 'app_prefs';

  String _storageKey(StoragePartitionKey partition, String key) =>
      '$_globalPrefix${partition.scopedKey(key)}';

  @override
  Future<void> write({
    required StoragePartitionKey partition,
    required String key,
    required String value,
  }) async {
    final ls = _localStorage;
    if (ls == null || !_shouldPersistPartition(partition)) {
      await _volatileFallback.write(partition: partition, key: key, value: value);
      return;
    }
    ls.setItem(_storageKey(partition, key), value);
  }

  @override
  Future<String?> read({
    required StoragePartitionKey partition,
    required String key,
  }) async {
    final ls = _localStorage;
    if (ls == null || !_shouldPersistPartition(partition)) {
      return _volatileFallback.read(partition: partition, key: key);
    }
    return ls.getItem(_storageKey(partition, key));
  }

  @override
  Future<List<String>> keysForPartition(StoragePartitionKey partition) async {
    final ls = _localStorage;
    if (ls == null || !_shouldPersistPartition(partition)) {
      return _volatileFallback.keysForPartition(partition);
    }
    final prefix = '$_globalPrefix${partition.toNamespace()}::';
    final result = <String>[];
    for (var i = 0; i < ls.length; i += 1) {
      final k = ls.key(i);
      if (k != null && k.startsWith(prefix)) {
        result.add(k.substring(prefix.length));
      }
    }
    return result;
  }

  @override
  Future<void> purgePartition(StoragePartitionKey partition) async {
    await _volatileFallback.purgePartition(partition);
    final ls = _localStorage;
    if (ls == null) return;
    final prefix = '$_globalPrefix${partition.toNamespace()}::';
    final toDelete = <String>[];
    for (var i = 0; i < ls.length; i += 1) {
      final k = ls.key(i);
      if (k != null && k.startsWith(prefix)) {
        toDelete.add(k);
      }
    }
    for (final k in toDelete) {
      ls.removeItem(k);
    }
  }

  @override
  Future<void> purgeAll() async {
    await _volatileFallback.purgeAll();
    final ls = _localStorage;
    if (ls == null) return;
    final toDelete = <String>[];
    for (var i = 0; i < ls.length; i += 1) {
      final k = ls.key(i);
      if (k != null && k.startsWith(_globalPrefix)) {
        toDelete.add(k);
      }
    }
    for (final k in toDelete) {
      ls.removeItem(k);
    }
  }
}

OfflineStorePort createPlatformOfflineStore({bool allowClinicalPayloads = true}) =>
    WebLocalStorageOfflineStore(allowClinicalPayloads: allowClinicalPayloads);
