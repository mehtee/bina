import 'package:bina_api_dtos/bina_api_dtos.dart';
import 'package:bina_device_sensors/bina_device_sensors.dart';
import 'package:bina_offline_store/bina_offline_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/config/app_config.dart';
import '../core/data/http_outbox_transport.dart';
import '../core/data/patient_gateway.dart';
import '../core/data/session_cache_repository.dart';
import '../core/i18n/bina_i18n.dart';

const StoragePartitionKey appPrefsPartition = StoragePartitionKey(
  tenantId: 'global',
  patientId: 'app_prefs',
  actorId: 'device',
);

final appConfigProvider = Provider<AppConfig>((ref) => AppConfig.fromEnvironment());

class ThemeModeNotifier extends Notifier<ThemeMode> {
  @override
  ThemeMode build() {
    _hydrate();
    return ThemeMode.light;
  }

  Future<void> _hydrate() async {
    final raw = await ref.read(offlineStoreProvider).read(
          partition: appPrefsPartition,
          key: 'theme_mode',
        );
    if (raw == 'dark') state = ThemeMode.dark;
    if (raw == 'system') state = ThemeMode.system;
  }

  void setMode(ThemeMode mode) {
    state = mode;
    ref.read(offlineStoreProvider).write(
          partition: appPrefsPartition,
          key: 'theme_mode',
          value: mode.name,
        );
  }
}

final themeModeProvider = NotifierProvider<ThemeModeNotifier, ThemeMode>(ThemeModeNotifier.new);

class HighContrastNotifier extends Notifier<bool> {
  @override
  bool build() {
    _hydrate();
    return false;
  }

  Future<void> _hydrate() async {
    final raw = await ref.read(offlineStoreProvider).read(
          partition: appPrefsPartition,
          key: 'high_contrast',
        );
    if (raw == 'true') state = true;
  }

  void setEnabled(bool enabled) {
    state = enabled;
    ref.read(offlineStoreProvider).write(
          partition: appPrefsPartition,
          key: 'high_contrast',
          value: enabled ? 'true' : 'false',
        );
  }
}

final highContrastProvider = NotifierProvider<HighContrastNotifier, bool>(HighContrastNotifier.new);

class ReduceMotionNotifier extends Notifier<bool> {
  @override
  bool build() {
    _hydrate();
    return false;
  }

  Future<void> _hydrate() async {
    final raw = await ref.read(offlineStoreProvider).read(
          partition: appPrefsPartition,
          key: 'reduce_motion',
        );
    if (raw == 'true') state = true;
  }

  void setEnabled(bool enabled) {
    state = enabled;
    ref.read(offlineStoreProvider).write(
          partition: appPrefsPartition,
          key: 'reduce_motion',
          value: enabled ? 'true' : 'false',
        );
  }
}

final reduceMotionProvider = NotifierProvider<ReduceMotionNotifier, bool>(ReduceMotionNotifier.new);

class OnboardingCompletedNotifier extends Notifier<bool?> {
  @override
  bool? build() {
    final config = ref.watch(appConfigProvider);
    if (!config.enableOnboarding) return true;
    _hydrate();
    return null;
  }

  Future<void> _hydrate() async {
    final raw = await ref.read(offlineStoreProvider).read(
          partition: appPrefsPartition,
          key: 'onboarding_completed_v1',
        );
    if (state == null) {
      state = raw == 'true';
    }
  }

  Future<void> markCompleted() async {
    state = true;
    await ref.read(offlineStoreProvider).write(
          partition: appPrefsPartition,
          key: 'onboarding_completed_v1',
          value: 'true',
        );
  }

  Future<void> resetForReplay() async {
    state = false;
    await ref.read(offlineStoreProvider).write(
          partition: appPrefsPartition,
          key: 'onboarding_completed_v1',
          value: 'false',
        );
  }
}

final onboardingCompletedProvider =
    NotifierProvider<OnboardingCompletedNotifier, bool?>(OnboardingCompletedNotifier.new);

class SessionNotifier extends Notifier<AuthSessionContext?> {
  @override
  AuthSessionContext? build() {
    final config = ref.watch(appConfigProvider);
    if (config.dataMode == BinaDataMode.mock) {
      return AuthSessionContext(
        accessToken: 'mock-patient-token',
        tenantId: config.defaultTenantId,
        clinicId: config.defaultClinicId,
        patientId: '22222222-2222-4222-8222-222222222222',
        actorType: 'patient',
      );
    }
    return null;
  }

  void setSession(AuthSessionContext? session) => state = session;

  Future<void> switchCaregiverPatient(CaregiverPatientLink link) async {
    final current = state;
    if (current == null) return;
    state = AuthSessionContext(
      accessToken: current.accessToken,
      tenantId: current.tenantId,
      clinicId: link.clinicId,
      patientId: link.patientId,
      actorType: 'caregiver',
      grantId: link.grantId,
      activePatientNameFa: link.patientNameFa,
    );
  }

  Future<void> _purgeSessionPartition(AuthSessionContext current) async {
    final partition = SessionCacheRepository.partitionFor(current);
    await ref.read(offlineStoreProvider).purgePartition(partition);
    await ref.read(outboxQueueProvider).purgePartition(partition);
    await ref.read(localReminderPortProvider).cancelForPatient(
          tenantId: current.tenantId,
          patientId: current.patientId,
        );
  }

  Future<void> handleCaregiverRevoked() async {
    final current = state;
    if (current != null) {
      await _purgeSessionPartition(current);
    }
    state = null;
  }

  Future<void> signOutAndPurge() async {
    final current = state;
    if (current != null) {
      await _purgeSessionPartition(current);
    }
    state = null;
  }
}

final sessionProvider = NotifierProvider<SessionNotifier, AuthSessionContext?>(SessionNotifier.new);

final i18nCatalogProvider = FutureProvider<BinaI18nCatalog>((ref) {
  return BinaI18nCatalog.loadFromAsset();
});

final patientGatewayProvider = Provider<PatientGatewayPort>((ref) {
  final config = ref.watch(appConfigProvider);
  return switch (config.dataMode) {
    BinaDataMode.mock => MockPatientGateway(),
    BinaDataMode.live => HttpPatientGateway(baseUrl: config.apiBaseUrl),
  };
});

final offlineStoreProvider = Provider<OfflineStorePort>((ref) {
  final config = ref.watch(appConfigProvider);
  return createPlatformOfflineStore(
    allowClinicalPayloads: config.dataMode == BinaDataMode.mock,
  );
});

final sessionCacheRepositoryProvider = Provider<SessionCacheRepository>(
  (ref) => SessionCacheRepository(ref.watch(offlineStoreProvider)),
);

final outboxQueueProvider = Provider<OutboxQueuePort>((ref) {
  final gateway = ref.watch(patientGatewayProvider);
  final store = ref.watch(offlineStoreProvider);
  return PersistentOutboxQueue(
    store: store,
    transport: PatientOutboxTransport(
      gateway: gateway,
      sessionProvider: () => ref.read(sessionProvider),
    ),
  );
});

final localReminderPortProvider = Provider<LocalReminderPort>((ref) {
  return InMemoryLocalReminderAdapter();
});

final deviceQualificationPortProvider = Provider<DeviceQualificationPort>((ref) {
  final config = ref.watch(appConfigProvider);
  return WebVerificationSensorAdapter(allowLabVerification: config.enableWebLabMode);
});

final sensorPortProvider = Provider<SensorPreflightPort>((ref) {
  final config = ref.watch(appConfigProvider);
  return WebVerificationSensorAdapter(allowLabVerification: config.enableWebLabMode);
});
