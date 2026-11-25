import 'package:bina_api_dtos/bina_api_dtos.dart';
import 'package:bina_design_system/bina_design_system.dart';
import 'package:bina_patient_app/app/app.dart';
import 'package:bina_patient_app/app/providers.dart';
import 'package:bina_patient_app/core/config/app_config.dart';
import 'package:bina_patient_app/core/data/patient_gateway.dart';
import 'package:bina_patient_app/features/diagnostic_results/diagnostic_results_screens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _ConfigurableResultsGateway extends MockPatientGateway {
  List<PatientDiagnosticSummary>? overrideSummaries;

  @override
  Future<PatientDiagnosticSummaryList> listDiagnosticSummaries(AuthSessionContext session) async {
    if (overrideSummaries != null) {
      return PatientDiagnosticSummaryList(items: overrideSummaries!);
    }
    return super.listDiagnosticSummaries(session);
  }
}

void main() {
  testWidgets('RES-01 empty signed summaries shows exact empty text & clinic help', (tester) async {
    tester.view.physicalSize = const Size(412, 824);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final gw = _ConfigurableResultsGateway()..overrideSummaries = const <PatientDiagnosticSummary>[];
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appConfigProvider.overrideWithValue(
            const AppConfig(
              apiBaseUrl: 'http://127.0.0.1:3000',
              dataMode: BinaDataMode.mock,
              enablePreviewHarness: false,
              enableWave3Results: true,
              enableWave4Tests: false,
              defaultTenantId: '00000000-0000-4000-8000-000000000001',
              defaultClinicId: '11111111-1111-4111-8111-111111111111',
            ),
          ),
          patientGatewayProvider.overrideWithValue(gw),
        ],
        child: const BinaPatientApp(),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('نتایج'));
    await tester.pumpAndSettle();

    expect(find.text('هنوز گزارش تأییدشده‌ای در دسترس نیست'), findsOneWidget);
    expect(find.text('تماس با کلینیک / کمک فوری'), findsOneWidget);
  });

  testWidgets('RES-01/02/03/04 signed urgent summary prioritizes action card and hides raw AI metrics', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(412, 824);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final gw = _ConfigurableResultsGateway()
      ..overrideSummaries = const <PatientDiagnosticSummary>[
        PatientDiagnosticSummary(
          studyId: 'signed-urgent-1',
          signedAtJalali: '۱۴۰۵/۰۹/۰۱',
          eyeLabelFa: 'چشم چپ',
          urgencyTier: UrgencyTier.urgent,
          urgencyLabelFa: 'ارجاع فوری',
          patientGuidanceFa: 'یافته‌ها توسط چشم‌پزشک بررسی شد و مراجعه فوری به کلینیک ضروری است.',
          nextStepFa: 'مراجعه فوری در همان روز به اورژانس چشم کلینیک',
        ),
      ];

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appConfigProvider.overrideWithValue(
            const AppConfig(
              apiBaseUrl: 'http://127.0.0.1:3000',
              dataMode: BinaDataMode.mock,
              enablePreviewHarness: false,
              enableWave3Results: true,
              enableWave4Tests: false,
              defaultTenantId: '00000000-0000-4000-8000-000000000001',
              defaultClinicId: '11111111-1111-4111-8111-111111111111',
            ),
          ),
          patientGatewayProvider.overrideWithValue(gw),
        ],
        child: const BinaPatientApp(),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('نتایج'));
    await tester.pumpAndSettle();

    expect(find.byType(BinaUrgentActionCard), findsOneWidget);
    await tester.tap(find.text('مشاهده خلاصه فوری و تماس با کلینیک'));
    await tester.pumpAndSettle();

    // RES-02 & RES-04 detail checks: action-first, signed guidance only, NO raw AI scores/PDF
    expect(find.byType(SignedReportDetailScreen), findsOneWidget);
    expect(find.byType(BinaUrgentActionCard), findsOneWidget);
    expect(find.textContaining('یافته‌ها توسط چشم‌پزشک بررسی شد'), findsOneWidget);
    expect(find.textContaining('Grad-CAM'), findsNothing);
    expect(find.text('دانلود گزارش (PDF)'), findsNothing);

    await tester.scrollUntilVisible(
      find.text('جزئیات پیگیری و ویزیت بعدی'),
      200,
      scrollable:
          find.descendant(of: find.byType(SignedReportDetailScreen), matching: find.byType(Scrollable)).first,
    );
    await tester.tap(find.text('جزئیات پیگیری و ویزیت بعدی'));
    await tester.pumpAndSettle();

    expect(find.byType(ReportFollowUpScreen), findsOneWidget);
    expect(find.textContaining('به‌طور خودکار نوبت تقویمی رزرو نشده است'), findsOneWidget);
  });

  testWidgets('RES-05 unknown signedReportId renders unavailable guard', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: buildBinaTheme(Brightness.light),
          home: const Directionality(
            textDirection: TextDirection.rtl,
            child: SignedReportDetailScreen(signedReportId: 'unsigned-or-missing-id'),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('گزارش درخواستی در دسترس نیست یا بروزرسانی شده است'), findsOneWidget);
  });

  testWidgets('V04, V05, V07, V08 previews render cleanly in Dark and 200% TextScaler with zero overflow', (
    tester,
  ) async {
    for (final child in const <Widget>[
      Scaffold(body: ResultsScreen(previewMode: true)),
      SignedReportDetailScreen(signedReportId: 'preview', previewMode: true),
      VfDetailPreviewScreen(),
      IopDetailPreviewScreen(),
    ]) {
      await tester.pumpWidget(
        ProviderScope(
          child: MediaQuery(
            data: const MediaQueryData(size: Size(360, 800), textScaler: TextScaler.linear(2.0)),
            child: MaterialApp(
              theme: buildBinaTheme(Brightness.dark),
              home: Directionality(textDirection: TextDirection.rtl, child: child),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    }
  });
}
