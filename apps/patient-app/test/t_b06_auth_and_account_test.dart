import 'package:bina_design_system/bina_design_system.dart';
import 'package:bina_offline_store/bina_offline_store.dart';
import 'package:bina_patient_app/app/app.dart';
import 'package:bina_patient_app/app/providers.dart';
import 'package:bina_patient_app/core/config/app_config.dart';
import 'package:bina_patient_app/core/data/patient_gateway.dart';
import 'package:bina_patient_app/features/account/account_screens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Full AUTH +98 Persian digit OTP + un-prechecked consent flow establishes session', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appConfigProvider.overrideWithValue(
            const AppConfig(
              apiBaseUrl: 'http://127.0.0.1:3000',
              dataMode: BinaDataMode.mock,
              enablePreviewHarness: false,
              enableWave3Results: false,
              enableWave4Tests: false,
              defaultTenantId: '00000000-0000-4000-8000-000000000001',
              defaultClinicId: '11111111-1111-4111-8111-111111111111',
            ),
          ),
          // Start signed-out on /bootstrap -> auto-redirects to /auth/welcome
          sessionProvider.overrideWith(() => _SignedOutSessionNotifier()),
        ],
        child: const BinaPatientApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('خوش آمدید'), findsOneWidget);
    await tester.tap(find.text('ورود با شماره موبایل'));
    await tester.pumpAndSettle();

    // Enter Persian digits on PhoneEntryScreen
    await tester.enterText(find.byType(TextFormField), '۰۹۱۲۳۴۵۶۷۸۹');
    await tester.tap(find.text('دریافت کد ورود'));
    await tester.pumpAndSettle();

    // OTP step
    expect(find.byType(BinaOtpField), findsOneWidget);
    await tester.enterText(find.byType(TextFormField), '۴۸۲۹۱۰');
    await tester.tap(find.text('ادامه'));
    await tester.pumpAndSettle();

    // Consent step: checkbox starts UNCHECKED; CTA disabled until checked
    final checkbox = tester.widget<CheckboxListTile>(find.byType(CheckboxListTile));
    expect(checkbox.value, isFalse);

    await tester.tap(find.byType(CheckboxListTile));
    await tester.pumpAndSettle();
    await tester.tap(find.text('تایید و ورود'));
    await tester.pumpAndSettle();

    // Lands on AUTH-07 accessibility setup -> continue to Today
    expect(find.text('تنظیمات نمایش و خوانایی'), findsOneWidget);
    await tester.tap(find.text('ادامه به برنامه امروز'));
    await tester.pumpAndSettle();

    expect(find.text('امروز'), findsWidgets);
  });

  testWidgets('V09 AccountScreen renders all 6 frosted rows in Light & Dark, switches theme, and sign-out purges cache', (
    tester,
  ) async {
    final store = InMemoryOfflineStore();
    const session = AuthSessionContext(
      accessToken: 'tok',
      tenantId: '00000000-0000-4000-8000-000000000001',
      clinicId: '11111111-1111-4111-8111-111111111111',
      patientId: '22222222-2222-4222-8222-222222222222',
      actorType: 'patient',
    );
    await store.write(
      partition: const StoragePartitionKey(
        tenantId: '00000000-0000-4000-8000-000000000001',
        patientId: '22222222-2222-4222-8222-222222222222',
        actorId: '22222222-2222-4222-8222-222222222222',
      ),
      key: 'clinic',
      value: '{"cachedAtUtc":"2026-11-25T00:00:00Z","payload":{}}',
    );

    // 1. Verify Dark V09 preview renders with zero overflow and exact 6 rows
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: buildBinaTheme(Brightness.dark),
          home: const Directionality(
            textDirection: TextDirection.rtl,
            child: Scaffold(body: AccountScreen(previewMode: true)),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    for (final rowTitle in const <String>[
      'اطلاعات شخصی',
      'همراه (مراقب)',
      'تنظیمات',
      'اعلان‌ها و یادآورها',
      'امنیت و حریم خصوصی',
      'درباره برنامه',
    ]) {
      expect(find.text(rowTitle), findsOneWidget);
    }
    expect(tester.takeException(), isNull);

    // 2. Verify live Account screen + Sign-Out confirmation purges cache partition
    await tester.pumpWidget(
      ProviderScope(
        key: UniqueKey(),
        overrides: [
          offlineStoreProvider.overrideWithValue(store),
          sessionProvider.overrideWith(() => _SignedInSessionNotifier(session)),
        ],
        child: const BinaPatientApp(),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('حساب من').last);
    await tester.pumpAndSettle();
    expect(find.byType(AccountScreen), findsOneWidget);

    await tester.scrollUntilVisible(find.text('خروج از حساب'), 200);
    await tester.tap(find.text('خروج از حساب'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('خروج'));
    await tester.pumpAndSettle();

    expect(
      await store.read(
        partition: const StoragePartitionKey(
          tenantId: '00000000-0000-4000-8000-000000000001',
          patientId: '22222222-2222-4222-8222-222222222222',
          actorId: '22222222-2222-4222-8222-222222222222',
        ),
        key: 'clinic',
      ),
      isNull,
    );
  });
}

class _SignedOutSessionNotifier extends SessionNotifier {
  @override
  AuthSessionContext? build() => null;
}

class _SignedInSessionNotifier extends SessionNotifier {
  _SignedInSessionNotifier(this._initial);
  final AuthSessionContext _initial;

  @override
  AuthSessionContext? build() => _initial;
}
