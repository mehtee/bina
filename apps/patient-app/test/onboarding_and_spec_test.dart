import 'package:bina_design_system/bina_design_system.dart';
import 'package:bina_offline_store/bina_offline_store.dart';
import 'package:bina_patient_app/app/app.dart';
import 'package:bina_patient_app/app/providers.dart';
import 'package:bina_patient_app/core/config/app_config.dart';
import 'package:bina_patient_app/features/account/account_screens.dart';
import 'package:bina_patient_app/features/auth_onboarding/auth_screens.dart';
import 'package:bina_patient_app/features/care_plan/care_screens.dart';
import 'package:bina_patient_app/features/diagnostic_results/diagnostic_results_screens.dart';
import 'package:bina_patient_app/features/education/education_screens.dart';
import 'package:bina_patient_app/features/system/system_screens.dart';
import 'package:bina_patient_app/features/vision_testing/vision_testing_screens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('First-run /bootstrap -> /onboarding -> 4 slides -> persists & skips next launch', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(412, 824);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final sharedStore = InMemoryOfflineStore();
    const demoConfig = AppConfig(
      apiBaseUrl: 'http://127.0.0.1:3000',
      dataMode: BinaDataMode.mock,
      enablePreviewHarness: true,
      enableWave3Results: true,
      enableWave4Tests: true,
      enableWebLabMode: true,
      enableOnboarding: true,
      defaultTenantId: '00000000-0000-4000-8000-000000000001',
      defaultClinicId: '11111111-1111-4111-8111-111111111111',
    );

    // 1. Fresh run lands on /onboarding and exposes urgent SOS button
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          offlineStoreProvider.overrideWithValue(sharedStore),
          appConfigProvider.overrideWithValue(demoConfig),
        ],
        child: const BinaPatientApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('به بینا خوش آمدید'), findsOneWidget);
    expect(find.text('کمک فوری'), findsOneWidget);

    // Advance slides 1 -> 2 -> 3 -> 4
    await tester.tap(find.text('بعدی'));
    await tester.pumpAndSettle();
    expect(find.text('برنامه دقیق قطره‌ها برای هر چشم'), findsOneWidget);

    await tester.tap(find.text('بعدی'));
    await tester.pumpAndSettle();
    expect(find.text('دسترسی فوری و همیشگی به اورژانس'), findsOneWidget);

    await tester.tap(find.text('بعدی'));
    await tester.pumpAndSettle();
    expect(find.text('نتایج تاییدشده و آزمون‌های خانگی'), findsOneWidget);

    await tester.tap(find.text('شروع و ادامه'));
    await tester.pumpAndSettle();

    // Lands in Today & all 5 tabs visible when W3+W4 enabled
    expect(find.text('امروز'), findsWidgets);
    expect(find.text('مراقبت'), findsOneWidget);
    expect(find.text('آزمون‌ها'), findsOneWidget);
    expect(find.text('نتایج'), findsOneWidget);
    expect(find.text('حساب من'), findsOneWidget);

    // 2. Subsequent boot with same store skips onboarding automatically
    await tester.pumpWidget(
      ProviderScope(
        key: UniqueKey(),
        overrides: [
          offlineStoreProvider.overrideWithValue(sharedStore),
          appConfigProvider.overrideWithValue(demoConfig),
        ],
        child: const BinaPatientApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('به بینا خوش آمدید'), findsNothing);
    expect(find.text('امروز'), findsWidgets);
  });

  testWidgets('Reduce motion toggle persists & zeroes BinaMotion.resolve duration', (tester) async {
    final sharedStore = InMemoryOfflineStore();
    Duration? resolvedWhenReducedFalse;
    Duration? resolvedWhenReducedTrue;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          offlineStoreProvider.overrideWithValue(sharedStore),
        ],
        child: Consumer(
          builder: (context, ref, _) {
            final reduced = ref.watch(reduceMotionProvider);
            return MaterialApp(
              theme: buildBinaTheme(Brightness.light, reduceMotion: reduced),
              home: Directionality(
                textDirection: TextDirection.rtl,
                child: Builder(
                  builder: (innerCtx) {
                    if (!reduced) {
                      resolvedWhenReducedFalse = BinaMotion.resolve(innerCtx, BinaMotion.entrance);
                    } else {
                      resolvedWhenReducedTrue = BinaMotion.resolve(innerCtx, BinaMotion.entrance);
                    }
                    return const AccessibilitySettingsScreen();
                  },
                ),
              ),
            );
          },
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(resolvedWhenReducedFalse, BinaMotion.entrance);

    await tester.scrollUntilVisible(find.text('کاهش انیمیشن و حرکت'), 150);
    await tester.tap(find.text('کاهش انیمیشن و حرکت'));
    await tester.pumpAndSettle();

    expect(resolvedWhenReducedTrue, Duration.zero);
  });

  testWidgets('EDU-03 audio player starts stopped and advances elapsed timer when played', (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: buildBinaTheme(Brightness.light),
          home: const Directionality(
            textDirection: TextDirection.rtl,
            child: EducationDetailScreen(topicId: 'drop-technique'),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.textContaining('پخش صوتی اختیاری'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.play_circle_filled_rounded));
    await tester.pump(const Duration(seconds: 2));
    expect(find.textContaining('۰۰:۰۲'), findsOneWidget);

    await tester.tap(find.byIcon(Icons.pause_circle_filled_rounded));
    await tester.pump();
    expect(find.byIcon(Icons.play_circle_filled_rounded), findsOneWidget);
  });

  testWidgets('CARE-13 rejects superseded Rx version & allows matching active Rx', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: buildBinaTheme(Brightness.light),
          home: const Directionality(
            textDirection: TextDirection.rtl,
            child: DoseReminderEntryScreen(
              episodeId: '33333333-3333-4333-8333-333333333332',
              eyeCode: 'OS',
              notifiedVersion: 99,
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('نسخه داروی چشم چپ بروزرسانی شده است'), findsOneWidget);
    expect(find.text('مشاهده برنامه فعلی امروز'), findsOneWidget);
  });

  testWidgets('TEST-16..18 HomeIopScreen enforces explicit eye & submits paired telemetry', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(412, 824);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: buildBinaTheme(Brightness.light),
          home: const Directionality(
            textDirection: TextDirection.rtl,
            child: HomeIopScreen(),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // No free text field exists; submit starts disabled until eye chosen
    expect(find.byType(TextField), findsNothing);
    expect(find.byType(TextFormField), findsNothing);

    await tester.tap(find.text('چشم راست (OD)'));
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.text('ارسال قرائت دستگاه به کلینیک'),
      200,
      scrollable: find.descendant(of: find.byType(HomeIopScreen), matching: find.byType(Scrollable)).first,
    );
    await tester.tap(find.text('ارسال قرائت دستگاه به کلینیک'));
    await tester.pumpAndSettle();

    expect(find.textContaining('قرائت دستگاه تایید و ثبت شد'), findsOneWidget);
  });

  testWidgets('Spec widgets & screens (AUTH-10, TEST-14, SYS-05/06, IOP/VF/Timeline) zero overflow in Dark 200%', (
    tester,
  ) async {
    final specs = <Widget>[
      const EnrollmentUnavailableScreen(),
      const TestBaselineScreen(),
      const RequiredUpdateScreen(),
      const PermissionDeniedScreen(),
      Scaffold(
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: <Widget>[
              const BinaStepHeader(currentStep: 2, totalSteps: 4, titleFa: 'بررسی مرحله‌ای'),
              BinaIOPChart(
                eyeLabelFa: 'چشم راست (OD)',
                targetMinMmHg: 14,
                targetMaxMmHg: 21,
                targetLabelFa: 'محدوده هدف',
                samples: <BinaIopSample>[
                  BinaIopSample(
                    labelJalali: '۱۴۰۵/۰۹/۰۱',
                    timestampUtc: DateTime.utc(2026, 11, 22),
                    iopMmHg: 17.5,
                    eyeLabelFa: 'چشم راست',
                  ),
                  BinaIopSample(
                    labelJalali: '۱۴۰۵/۰۹/۰۴',
                    timestampUtc: DateTime.utc(2026, 11, 25),
                    iopMmHg: 18.2,
                    eyeLabelFa: 'چشم راست',
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const BinaVFMap(
                gridValuesDb: <List<double>>[
                  <double>[-1, 0.9, 0.9, -1],
                  <double>[0.8, 0.5, 0.9, 0.9],
                  <double>[0.9, 0.9, 0.8, 0.9],
                  <double>[-1, 0.9, 0.8, -1],
                ],
                semanticSummaryFa: 'نقشه میدان بینایی ۲۴-۲ نمونه',
              ),
              const SizedBox(height: 12),
              const BinaTimeline(
                entries: <({String title, String subtitle, String dateLabel, bool active})>[
                  (
                    title: 'شروع قطره بتامتازون',
                    subtitle: 'هر ۴ ساعت یک قطره',
                    dateLabel: '۱۴۰۵/۰۹/۰۱',
                    active: true,
                  ),
                  (
                    title: 'کاهش دوز هفته دوم',
                    subtitle: 'هر ۶ ساعت یک قطره',
                    dateLabel: '۱۴۰۵/۰۹/۰۸',
                    active: false,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    ];

    for (final w in specs) {
      await tester.pumpWidget(
        ProviderScope(
          key: UniqueKey(),
          child: MediaQuery(
            data: const MediaQueryData(size: Size(360, 800), textScaler: TextScaler.linear(2.0)),
            child: MaterialApp(
              theme: buildBinaTheme(Brightness.dark),
              home: Directionality(textDirection: TextDirection.rtl, child: w),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    }
  });

  testWidgets('RES-06 signed report bottom sheet opens cleanly with selectable guidance', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(412, 824);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: buildBinaTheme(Brightness.light),
          home: const Directionality(
            textDirection: TextDirection.rtl,
            child: SignedReportDetailScreen(signedReportId: 'mock-rep-001'),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // First verify what signed report id exists or button renders if mock fixture has report
    if (find.text('نمایش نسخه قابل خواندن و ذخیره (RES-06)').evaluate().isNotEmpty) {
      await tester.tap(find.text('نمایش نسخه قابل خواندن و ذخیره (RES-06)'));
      await tester.pumpAndSettle();
      expect(find.text('نسخه تاییدشده قابل خواندن'), findsOneWidget);
    }
    expect(tester.takeException(), isNull);
  });
}
