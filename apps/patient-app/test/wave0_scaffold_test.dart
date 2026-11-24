import 'dart:io';

import 'package:bina_api_dtos/bina_api_dtos.dart';
import 'package:bina_clinical_renderer/bina_clinical_renderer.dart';
import 'package:bina_design_system/bina_design_system.dart';
import 'package:bina_device_sensors/bina_device_sensors.dart';
import 'package:bina_offline_store/bina_offline_store.dart';
import 'package:bina_patient_app/app/app.dart';
import 'package:bina_patient_app/app/providers.dart';
import 'package:bina_patient_app/app/router.dart';
import 'package:bina_patient_app/core/config/app_config.dart';
import 'package:bina_patient_app/core/data/patient_gateway.dart';
import 'package:bina_patient_app/core/i18n/bina_i18n.dart';
import 'package:bina_patient_app/features/preview_harness/preview_harness_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

final class _FakeOutboxTransport implements OutboxTransportPort {
  _FakeOutboxTransport(this.outcomes);

  final List<OutboxDispatchResult> outcomes;
  int callCount = 0;

  @override
  Future<OutboxDispatchResult> send(OutboxEntry entry) async {
    final idx = callCount < outcomes.length ? callCount : outcomes.length - 1;
    callCount += 1;
    return outcomes[idx];
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('All 10 runtime derivatives resolve & load cleanly; source PNGs excluded from pubspec', () async {
    final activePubspecLines = File('pubspec.yaml')
        .readAsLinesSync()
        .map((line) => line.split('#').first)
        .join('\n');
    expect(activePubspecLines.contains('assets/design/runtime/'), isTrue);
    expect(activePubspecLines.contains('assets/design/source/'), isFalse);

    for (final brightness in Brightness.values) {
      for (final id in BinaArtId.values) {
        final descriptor = BinaArtResolver.resolve(id, brightness);
        expect(descriptor.assetPath.startsWith('assets/design/runtime/'), isTrue);
        final bytes = await rootBundle.load(descriptor.assetPath);
        expect(bytes.lengthInBytes, greaterThan(100));
      }
    }
    expect(BinaArtResolver.allRuntimeAssetPaths.length, 10);
  });

  test('Bundled contracts match canonical workspace packages byte-for-byte', () {
    final appI18n = File('assets/contracts/fa-IR.json').readAsStringSync();
    final pkgI18n = File('../../packages/i18n-catalog/catalog/fa-IR.json').readAsStringSync();
    expect(appI18n, pkgI18n);

    final appFix = File('assets/contracts/v01-v09-preview.json').readAsStringSync();
    final pkgFix = File('../../packages/clinical-fixtures/fixtures/v01-v09-preview.json').readAsStringSync();
    expect(appFix, pkgFix);
  });

  test('BinaBrand & BinaI18nCatalog centralize brand and normalize fa-IR / +98 / OD-OS', () async {
    final catalog = await BinaI18nCatalog.loadFromAsset();
    expect(BinaBrand.format('به {appName} خوش آمدید', overrideBrandFa: 'نوربین'), 'به نوربین خوش آمدید');
    expect(catalog.lateralityLabel(EyeLaterality.oD), 'چشم راست');
    expect(catalog.lateralityLabel(EyeLaterality.oS), 'چشم چپ');
    expect(catalog.urgencyLabel(UrgencyTier.urgent), 'ارجاع فوری');
    expect(BinaI18nCatalog.normalizeIranMobileE164('۰۹۱۲-۳۴۵-۶۷۸۹'), '+989123456789');
    expect(BinaI18nCatalog.normalizeIranMobileE164('٠٩١٢٣٤٥٦٧٨٩'), '+989123456789');
    expect(BinaI18nCatalog.toPersianDigits('1405/09/02'), '۱۴۰۵/۰۹/۰۲');
    expect(BinaI18nCatalog.isolateLtr('18.0 mmHg'), '\u206618.0 mmHg\u2069');
  });

  test('MockPatientGateway parses canonical DTOs from golden clinical fixtures', () async {
    final gw = MockPatientGateway();
    const session = AuthSessionContext(
      accessToken: 't',
      tenantId: '00000000-0000-4000-8000-000000000001',
      clinicId: '11111111-1111-4111-8111-111111111111',
      patientId: '22222222-2222-4222-8222-222222222222',
      actorType: 'patient',
    );
    final clinic = await gw.getCurrentClinic(session: session);
    expect(clinic.calendarMode, 'jalali');
    final today = await gw.getPatientTodayPlan(session);
    expect(today.scheduleItems.length, greaterThanOrEqualTo(2));
    final summaries = await gw.listDiagnosticSummaries(session);
    expect(summaries.items.single.eyeLabelFa, 'چشم راست');
  });

  test('OfflineStore & OutboxQueue enforce partition isolation, idempotency, and fail-closed 403', () async {
    final store = InMemoryOfflineStore();
    const p1 = StoragePartitionKey(tenantId: 't1', patientId: 'pat1', actorId: 'pat1');
    const p2 = StoragePartitionKey(tenantId: 't1', patientId: 'pat2', actorId: 'cg1');
    await store.write(partition: p1, key: 'today', value: 'plan-p1');
    await store.write(partition: p2, key: 'today', value: 'plan-p2');
    await store.purgePartition(p2);
    expect(await store.read(partition: p1, key: 'today'), 'plan-p1');
    expect(await store.read(partition: p2, key: 'today'), isNull);

    final transport = _FakeOutboxTransport([
      const OutboxDispatchResult(status: OutboxSyncStatus.unauthorizedOrRevoked, failureReasonFa: 'لغو شد'),
      const OutboxDispatchResult(status: OutboxSyncStatus.acknowledged),
    ]);
    final outbox = InMemoryOutboxQueue(transport: transport);
    final entry1 = OutboxEntry(
      idempotencyKey: 'k-1',
      partition: p2,
      operationType: 'adherence',
      endpointPath: '/v1/episodes/e1/adherence',
      payloadJson: '{}',
      createdAtUtc: DateTime.utc(2026, 11, 24),
      status: OutboxSyncStatus.pendingUpload,
    );
    final entry2 = OutboxEntry(
      idempotencyKey: 'k-2',
      partition: p2,
      operationType: 'adherence',
      endpointPath: '/v1/episodes/e1/adherence',
      payloadJson: '{}',
      createdAtUtc: DateTime.utc(2026, 11, 24),
      status: OutboxSyncStatus.pendingUpload,
    );
    await outbox.enqueue(entry1);
    await outbox.enqueue(entry1); // duplicate ignored
    await outbox.enqueue(entry2);
    expect((await outbox.listForPartition(p2)).length, 2);

    await outbox.flushPartition(p2);
    expect(transport.callCount, 1); // halted on unauthorizedOrRevoked
    final after = await outbox.listForPartition(p2);
    expect(after[0].status, OutboxSyncStatus.unauthorizedOrRevoked);
    expect(after[1].status, OutboxSyncStatus.pendingUpload);
  });

  test('WebVerificationSensorAdapter reports unavailable by default', () async {
    const adapter = WebVerificationSensorAdapter();
    final elig = await adapter.checkEligibility();
    expect(elig.eligible, isFalse);
    final obs = await adapter.sampleOnce();
    expect(obs.allPassed, isFalse);
    expect(obs.viewingDistanceStatus, SensorQualityStatus.unavailable);
  });

  test('Destination gates: R1 shows 3 tabs, W3 adds Results, W4 adds Tests', () {
    const r1 = AppConfig(
      apiBaseUrl: 'http://127.0.0.1:3000',
      dataMode: BinaDataMode.mock,
      enablePreviewHarness: false,
      enableWave3Results: false,
      enableWave4Tests: false,
      defaultTenantId: 't',
      defaultClinicId: 'c',
    );
    expect(
      BinaDestinationId.enabledFor(r1),
      [BinaDestinationId.today, BinaDestinationId.care, BinaDestinationId.account],
    );

    const w4 = AppConfig(
      apiBaseUrl: 'http://127.0.0.1:3000',
      dataMode: BinaDataMode.mock,
      enablePreviewHarness: false,
      enableWave3Results: true,
      enableWave4Tests: true,
      defaultTenantId: 't',
      defaultClinicId: 'c',
    );
    expect(BinaDestinationId.enabledFor(w4).length, 5);
  });

  testWidgets('IsolatedClinicalSurface blocks outer TextScaler 2.0 and RTL mirroring', (tester) async {
    late double capturedScale;
    late TextDirection capturedDir;

    await tester.pumpWidget(
      Directionality(
        textDirection: TextDirection.rtl,
        child: MediaQuery(
          data: const MediaQueryData(textScaler: TextScaler.linear(2.0)),
          child: IsolatedClinicalSurface(
            backgroundColor: const Color(0xFFFFFFFF),
            child: Builder(
              builder: (ctx) {
                capturedScale = MediaQuery.textScalerOf(ctx).scale(14);
                capturedDir = Directionality.of(ctx);
                return const SizedBox(width: 100, height: 100);
              },
            ),
          ),
        ),
      ),
    );

    expect(capturedScale, 14.0);
    expect(capturedDir, TextDirection.ltr);
  });

  testWidgets('Wave 0 shell renders RTL fa-IR and isolated 412x824 preview harness works', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appConfigProvider.overrideWithValue(
            const AppConfig(
              apiBaseUrl: 'http://127.0.0.1:3000',
              dataMode: BinaDataMode.mock,
              enablePreviewHarness: true,
              enableWave3Results: true,
              enableWave4Tests: true,
              defaultTenantId: '00000000-0000-4000-8000-000000000001',
              defaultClinicId: '11111111-1111-4111-8111-111111111111',
            ),
          ),
        ],
        child: const BinaPatientApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('امروز'), findsWidgets);
    expect(find.text('کمک فوری'), findsOneWidget);

    await tester.tap(find.text('پیش‌نمایش V01–V09'));
    await tester.pumpAndSettle();
    expect(find.byType(PreviewHarnessScreen), findsOneWidget);
    expect(find.textContaining('01-Today.png'), findsOneWidget);
  });
}
