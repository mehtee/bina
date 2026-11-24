import 'package:flutter/foundation.dart';

enum BinaDataMode {
  mock,
  live,
}

@immutable
class AppConfig {
  const AppConfig({
    required this.apiBaseUrl,
    required this.dataMode,
    required this.enablePreviewHarness,
    required this.enableWave3Results,
    required this.enableWave4Tests,
    required this.defaultTenantId,
    required this.defaultClinicId,
  });

  final String apiBaseUrl;
  final BinaDataMode dataMode;
  final bool enablePreviewHarness;
  final bool enableWave3Results;
  final bool enableWave4Tests;
  final String defaultTenantId;
  final String defaultClinicId;

  static AppConfig fromEnvironment() {
    const rawMode = String.fromEnvironment('BINA_DATA_MODE', defaultValue: 'mock');
    const previewFlag = bool.fromEnvironment(
      'ENABLE_PREVIEW_HARNESS',
      defaultValue: !kReleaseMode,
    );
    return AppConfig(
      apiBaseUrl: const String.fromEnvironment(
        'API_BASE_URL',
        defaultValue: 'http://127.0.0.1:3000',
      ),
      dataMode: rawMode.toLowerCase() == 'live' ? BinaDataMode.live : BinaDataMode.mock,
      // Spec v2.1 §12.3 & §13.4: Synthetic preview must never appear in release production builds.
      enablePreviewHarness: !kReleaseMode && previewFlag,
      enableWave3Results: const bool.fromEnvironment(
        'ENABLE_WAVE3_RESULTS',
        defaultValue: false,
      ),
      enableWave4Tests: const bool.fromEnvironment(
        'ENABLE_WAVE4_TESTS',
        defaultValue: false,
      ),
      defaultTenantId: const String.fromEnvironment(
        'DEFAULT_TENANT_ID',
        defaultValue: '00000000-0000-4000-8000-000000000001',
      ),
      defaultClinicId: const String.fromEnvironment(
        'DEFAULT_CLINIC_ID',
        defaultValue: '11111111-1111-4111-8111-111111111111',
      ),
    );
  }
}
