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

final appConfigProvider = Provider<AppConfig>((ref) => AppConfig.fromEnvironment());

class ThemeModeNotifier extends Notifier<ThemeMode> {
  @override
  ThemeMode build() => ThemeMode.light;

  void setMode(ThemeMode mode) => state = mode;
}

final themeModeProvider = NotifierProvider<ThemeModeNotifier, ThemeMode>(ThemeModeNotifier.new);

class HighContrastNotifier extends Notifier<bool> {
  @override
  bool build() => false;

  void setEnabled(bool enabled) => state = enabled;
}

final highContrastProvider = NotifierProvider<HighContrastNotifier, bool>(HighContrastNotifier.new);

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

final offlineStoreProvider = Provider<OfflineStorePort>((ref) => InMemoryOfflineStore());

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

final sensorPortProvider = Provider<SensorPreflightPort>((ref) {
  return const WebVerificationSensorAdapter();
});
