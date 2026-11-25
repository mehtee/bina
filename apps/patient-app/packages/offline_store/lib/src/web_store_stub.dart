import 'in_memory_store.dart';
import 'store_port.dart';

/// Fallback storage factory for Dart VM, native tests, and platforms without browser `localStorage`.
OfflineStorePort createPlatformOfflineStore({bool allowClinicalPayloads = true}) =>
    InMemoryOfflineStore();
