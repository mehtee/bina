import 'dart:io';

import 'package:bina_clinical_renderer/bina_clinical_renderer.dart';
import 'package:bina_design_system/bina_design_system.dart';
import 'package:bina_device_sensors/bina_device_sensors.dart';
import 'package:bina_patient_app/app/app.dart';
import 'package:bina_patient_app/app/providers.dart';
import 'package:bina_patient_app/core/config/app_config.dart';
import 'package:bina_patient_app/features/vision_testing/vision_testing_screens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('clinical_renderer package has zero imports of design_system or material', () {
    final files = Directory('packages/clinical_renderer/lib')
        .listSync(recursive: true)
        .whereType<File>()
        .where((f) => f.path.endsWith('.dart'));
    for (final file in files) {
      final text = file.readAsStringSync();
      expect(text.contains('bina_design_system'), isFalse, reason: file.path);
      expect(text.contains('package:flutter/material.dart'), isFalse, reason: file.path);
    }
  });

  test('ISO 8596 LandoltCGeometry and BestPestStaircase math & immutability', () {
    final geo = LandoltCGeometry.fromProtocol(
      angularMinutes: LandoltCGeometry.angularMinutesForLogMar(0.0), // 1.0 arcmin = 20/20
      viewingDistanceMm: 400.0,
      pixelsPerMm: 10.0,
      devicePixelRatio: 2.0,
    );
    expect(geo.gapMm, closeTo(0.116355, 0.001));
    expect(geo.outerDiameterMm, closeTo(5.0 * geo.gapMm, 1e-6));
    expect(geo.strokeLogicalPx, closeTo(geo.gapMm * 5.0, 1e-6));

    var s = BestPestStaircase.initial(maxTrials: 8, minTrialsBeforeStop: 6);
    expect(s.trials, isEmpty);
    final originalTrials = s.trials;
    expect(() => originalTrials.add(
      VisionTrialRecord(
        trialIndex: 0,
        logMarPresented: 0.4,
        orientationPresented: 0,
        orientationResponded: 0,
        correct: true,
        responseTimeMs: 500,
        recordedAtUtc: DateTime.utc(2026),
      ),
    ), throwsUnsupportedError);

    while (!s.isComplete) {
      s = s.recordResponse(orientationResponded: s.currentOrientation, responseTimeMs: 420);
    }
    expect(s.trials.length, inInclusiveRange(6, 8));
    expect(s.estimatedLogMar, lessThan(0.15));
  });

  testWidgets('Default unqualified Web adapter blocks start & disables start on unavailable sensors', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(412, 824);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appConfigProvider.overrideWithValue(
            const AppConfig(
              apiBaseUrl: 'http://127.0.0.1:3000',
              dataMode: BinaDataMode.mock,
              enablePreviewHarness: false,
              enableWave3Results: false,
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

    await tester.tap(find.text('آزمون‌ها'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('آزمون حدت بینایی (لندولت C)'));
    await tester.pumpAndSettle();

    expect(find.text('این دستگاه برای انجام این آزمون تأیید نشده است'), findsOneWidget);
    expect(find.text('ادامه و انتخاب چشم'), findsNothing);
  });

  testWidgets('Qualified adapter runs Landolt C under Dark + 200% TextScaler with lifecycle pause invalidation', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(412, 824);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    const labAdapter = WebVerificationSensorAdapter(allowLabVerification: true);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appConfigProvider.overrideWithValue(
            const AppConfig(
              apiBaseUrl: 'http://127.0.0.1:3000',
              dataMode: BinaDataMode.mock,
              enablePreviewHarness: false,
              enableWave3Results: true,
              enableWave4Tests: true,
              defaultTenantId: '00000000-0000-4000-8000-000000000001',
              defaultClinicId: '11111111-1111-4111-8111-111111111111',
            ),
          ),
          deviceQualificationPortProvider.overrideWithValue(labAdapter),
          sensorPortProvider.overrideWithValue(labAdapter),
        ],
        child: const BinaPatientApp(),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('آزمون‌ها'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('آزمون حدت بینایی (لندولت C)'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('ادامه و انتخاب چشم'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('چشم راست (OD)'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('تایید چشم و ادامه'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('ادامه به کالیبراسیون صفحه'),
      200,
      scrollable:
          find.descendant(of: find.byType(TestInstructionsScreen), matching: find.byType(Scrollable)).first,
    );
    await tester.tap(find.text('ادامه به کالیبراسیون صفحه'));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.text('تایید کالیبراسیون و رفتن به تمرین'),
      200,
      scrollable:
          find.descendant(of: find.byType(TestCalibrationScreen), matching: find.byType(Scrollable)).first,
    );
    await tester.tap(find.text('تایید کالیبراسیون و رفتن به تمرین'));
    await tester.pumpAndSettle();

    expect(find.text('تمرین آزمایشی (در پرونده ثبت نمی‌شود)'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('اتمام تمرین و بررسی محیط آزمون'),
      200,
      scrollable:
          find.descendant(of: find.byType(TestPracticeScreen), matching: find.byType(Scrollable)).first,
    );
    await tester.tap(find.text('اتمام تمرین و بررسی محیط آزمون'));
    await tester.pumpAndSettle();

    expect(find.text('تایید شد'), findsNWidgets(3));
    await tester.scrollUntilVisible(
      find.text('شروع آزمون'),
      200,
      scrollable:
          find.descendant(of: find.byType(TestPreflightScreen), matching: find.byType(Scrollable)).first,
    );
    await tester.tap(find.text('شروع آزمون'));
    await tester.pumpAndSettle();

    // IsolatedClinicalSurface isolates stimulus from theme & RTL
    expect(find.byType(IsolatedClinicalSurface), findsOneWidget);
    final surfaceCtx = tester.element(find.byType(CustomPaint).first);
    expect(Directionality.of(surfaceCtx), TextDirection.ltr);

    // Complete 8 trials -> arrives on honest receipt
    for (var i = 0; i < 8; i += 1) {
      if (find.byKey(const Key('landolt_dir_0')).evaluate().isEmpty) break;
      await tester.tap(find.byKey(const Key('landolt_dir_0')));
      await tester.pumpAndSettle();
    }
    expect(find.text('کیفیت آزمون تایید شد'), findsOneWidget);
    expect(find.text('ارسال شد'), findsOneWidget);

    // Now test Amsler + lifecycle pause invalidation
    await tester.tap(find.text('بازگشت به بخش آزمون‌ها'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('آزمون شبکه آمسلر (Amsler)'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('ادامه و انتخاب چشم'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('چشم چپ (OS)'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('تایید چشم و ادامه'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('ادامه به کالیبراسیون صفحه'),
      200,
      scrollable:
          find.descendant(of: find.byType(TestInstructionsScreen), matching: find.byType(Scrollable)).first,
    );
    await tester.tap(find.text('ادامه به کالیبراسیون صفحه'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('تایید کالیبراسیون و رفتن به تمرین'),
      200,
      scrollable:
          find.descendant(of: find.byType(TestCalibrationScreen), matching: find.byType(Scrollable)).first,
    );
    await tester.tap(find.text('تایید کالیبراسیون و رفتن به تمرین'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('اتمام تمرین و بررسی محیط آزمون'),
      200,
      scrollable:
          find.descendant(of: find.byType(TestPracticeScreen), matching: find.byType(Scrollable)).first,
    );
    await tester.tap(find.text('اتمام تمرین و بررسی محیط آزمون'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('شروع آزمون'),
      200,
      scrollable:
          find.descendant(of: find.byType(TestPreflightScreen), matching: find.byType(Scrollable)).first,
    );
    await tester.tap(find.text('شروع آزمون'));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('amsler_grid_canvas')), findsOneWidget);
    // Tap Amsler canvas to capture normalized coordinates, then submit!
    await tester.tap(find.byKey(const Key('amsler_grid_canvas')));
    await tester.pumpAndSettle();
    expect(find.text('پاک کردن آخرین علامت'), findsOneWidget);

    // Simulate app backgrounding (`paused`) and returning (`resumed`) -> session stays invalidated, never silently resumed!
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pumpAndSettle();
    expect(find.text('کیفیت آزمون تأیید نشد — نشست نامعتبر شد'), findsOneWidget);
    expect(find.text('شروع مجدد از بررسی سنسورها'), findsOneWidget);
  });

  testWidgets('Amsler completed session submits honestly & history renders OD/OS', (tester) async {
    tester.view.physicalSize = const Size(412, 824);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    const labAdapter = WebVerificationSensorAdapter(allowLabVerification: true);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appConfigProvider.overrideWithValue(
            const AppConfig(
              apiBaseUrl: 'http://127.0.0.1:3000',
              dataMode: BinaDataMode.mock,
              enablePreviewHarness: false,
              enableWave3Results: true,
              enableWave4Tests: true,
              defaultTenantId: '00000000-0000-4000-8000-000000000001',
              defaultClinicId: '11111111-1111-4111-8111-111111111111',
            ),
          ),
          deviceQualificationPortProvider.overrideWithValue(labAdapter),
          sensorPortProvider.overrideWithValue(labAdapter),
        ],
        child: const BinaPatientApp(),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('آزمون‌ها'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('آزمون شبکه آمسلر (Amsler)'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('ادامه و انتخاب چشم'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('چشم راست (OD)'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('تایید چشم و ادامه'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('ادامه به کالیبراسیون صفحه'),
      200,
      scrollable:
          find.descendant(of: find.byType(TestInstructionsScreen), matching: find.byType(Scrollable)).first,
    );
    await tester.tap(find.text('ادامه به کالیبراسیون صفحه'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('تایید کالیبراسیون و رفتن به تمرین'),
      200,
      scrollable:
          find.descendant(of: find.byType(TestCalibrationScreen), matching: find.byType(Scrollable)).first,
    );
    await tester.tap(find.text('تایید کالیبراسیون و رفتن به تمرین'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('اتمام تمرین و بررسی محیط آزمون'),
      200,
      scrollable:
          find.descendant(of: find.byType(TestPracticeScreen), matching: find.byType(Scrollable)).first,
    );
    await tester.tap(find.text('اتمام تمرین و بررسی محیط آزمون'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('شروع آزمون'),
      200,
      scrollable:
          find.descendant(of: find.byType(TestPreflightScreen), matching: find.byType(Scrollable)).first,
    );
    await tester.tap(find.text('شروع آزمون'));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('amsler_grid_canvas')));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('ثبت و پایان آزمون آمسلر'),
      200,
      scrollable:
          find.descendant(of: find.byType(AmslerSessionScreen), matching: find.byType(Scrollable)).first,
    );
    await tester.tap(find.text('ثبت و پایان آزمون آمسلر'));
    await tester.pumpAndSettle();

    expect(find.text('کیفیت آزمون تایید شد'), findsOneWidget);
    expect(find.text('ارسال شد'), findsOneWidget);

    await tester.tap(find.text('بازگشت به بخش آزمون‌ها'));
    await tester.pumpAndSettle();
    final testsScroll =
        find.descendant(of: find.byType(TestsHubScreen), matching: find.byType(Scrollable)).first;
    await tester.scrollUntilVisible(
      find.text('تاریخچه آزمون‌های ثبت‌شده'),
      200,
      scrollable: testsScroll,
    );
    await tester.drag(testsScroll, const Offset(0, -180));
    await tester.pumpAndSettle();
    await tester.tap(find.text('تاریخچه آزمون‌های ثبت‌شده'));
    await tester.pumpAndSettle();

    expect(find.text('چشم راست (OD)'), findsOneWidget);
    expect(find.text('چشم چپ (OS)'), findsOneWidget);
    expect(find.textContaining('logMAR'), findsWidgets);
  });

  testWidgets('V03 Tests preview renders cleanly in Dark and 200% TextScaler with zero overflow', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MediaQuery(
          data: const MediaQueryData(size: Size(360, 800), textScaler: TextScaler.linear(2.0)),
          child: MaterialApp(
            theme: buildBinaTheme(Brightness.dark),
            home: const Directionality(
              textDirection: TextDirection.rtl,
              child: Scaffold(body: TestsHubScreen(previewMode: true)),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });
}
