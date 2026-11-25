import 'dart:io';

import 'package:bina_api_dtos/bina_api_dtos.dart';
import 'package:bina_design_system/bina_design_system.dart';
import 'package:bina_patient_app/app/app.dart';
import 'package:bina_patient_app/app/providers.dart';
import 'package:bina_patient_app/core/config/app_config.dart';
import 'package:bina_patient_app/core/data/patient_gateway.dart';
import 'package:bina_patient_app/features/education/education_screens.dart';
import 'package:bina_patient_app/features/symptoms_sos/sos_screens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _SosCaregiverTestGateway extends MockPatientGateway {
  bool failNetwork = false;
  bool revokeFailNetwork = false;
  bool throw403ForCaregiver = false;

  @override
  Future<ClinicProfile> getCurrentClinic({AuthSessionContext? session}) async {
    if (failNetwork) throw const SocketException('offline');
    if (throw403ForCaregiver && session?.actorType == 'caregiver') {
      throw const PatientGatewayException(
        statusCode: 403,
        code: 'CAREGIVER_REVOKED',
        messageFa: 'دسترسی لغو شده است.',
      );
    }
    return super.getCurrentClinic(session: session);
  }

  @override
  Future<PatientTodayResponse> getPatientTodayPlan(AuthSessionContext session) async {
    if (failNetwork) throw const SocketException('offline');
    if (throw403ForCaregiver && session.actorType == 'caregiver') {
      throw const PatientGatewayException(
        statusCode: 403,
        code: 'CAREGIVER_REVOKED',
        messageFa: 'دسترسی لغو شده است.',
      );
    }
    return super.getPatientTodayPlan(session);
  }

  @override
  Future<PatientEpisodeListResponse> listPatientEpisodes(AuthSessionContext session) async {
    if (failNetwork) throw const SocketException('offline');
    if (throw403ForCaregiver && session.actorType == 'caregiver') {
      throw const PatientGatewayException(
        statusCode: 403,
        code: 'CAREGIVER_REVOKED',
        messageFa: 'دسترسی لغو شده است.',
      );
    }
    return super.listPatientEpisodes(session);
  }

  @override
  Future<SymptomReportResponse> submitSymptomReport({
    required AuthSessionContext session,
    required String episodeId,
    required String idempotencyKey,
    required SymptomReportRequest request,
  }) async {
    if (failNetwork) throw const SocketException('offline');
    return super.submitSymptomReport(
      session: session,
      episodeId: episodeId,
      idempotencyKey: idempotencyKey,
      request: request,
    );
  }

  @override
  Future<void> revokeCaregiverAccess({
    required AuthSessionContext session,
    required String grantId,
  }) async {
    if (revokeFailNetwork) throw const SocketException('offline');
  }

  @override
  Future<CaregiverPatientListResponse> listCaregiverPatients(AuthSessionContext session) async {
    if (throw403ForCaregiver) {
      throw const PatientGatewayException(
        statusCode: 403,
        code: 'CAREGIVER_REVOKED',
        messageFa: 'دسترسی لغو شده است.',
      );
    }
    return const CaregiverPatientListResponse(
      items: <CaregiverPatientLink>[
        CaregiverPatientLink(
          grantId: 'grant-a',
          patientId: 'pat-a',
          patientNameFa: 'فاطمه محمدی',
          relationshipFa: 'مادر',
          scopes: <String>['care_plan:read'],
          clinicId: '11111111-1111-4111-8111-111111111111',
          active: true,
          createdAt: '2026-11-20T08:00:00.000Z',
        ),
        CaregiverPatientLink(
          grantId: 'grant-b',
          patientId: 'pat-b',
          patientNameFa: 'حسین رضایی',
          relationshipFa: 'پدر',
          scopes: <String>['care_plan:read', 'adherence:write'],
          clinicId: '11111111-1111-4111-8111-111111111111',
          active: true,
          createdAt: '2026-11-21T08:00:00.000Z',
        ),
      ],
    );
  }
}

class _UnauthenticatedLiveConfigSession extends SessionNotifier {
  @override
  AuthSessionContext? build() => null;
}

class _StaticSession extends SessionNotifier {
  _StaticSession(this._initial);
  final AuthSessionContext? _initial;
  @override
  AuthSessionContext? build() => _initial;
}

void main() {
  testWidgets('SOS-01/09 works unauthenticated & offline with zero decorative art', (tester) async {
    tester.view.physicalSize = const Size(412, 824);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appConfigProvider.overrideWithValue(
            const AppConfig(
              apiBaseUrl: 'http://127.0.0.1:3000',
              dataMode: BinaDataMode.live,
              enablePreviewHarness: false,
              enableWave3Results: false,
              enableWave4Tests: false,
              defaultTenantId: 't1',
              defaultClinicId: 'c1',
            ),
          ),
          sessionProvider.overrideWith(_UnauthenticatedLiveConfigSession.new),
        ],
        child: const BinaPatientApp(),
      ),
    );
    await tester.pumpAndSettle();

    // Open Urgent Help directly from Welcome AppBar without authentication
    await tester.tap(find.text('کمک فوری').first);
    await tester.pumpAndSettle();

    expect(find.byType(UrgentHelpScreen), findsOneWidget);
    // Zero decorative art allowed on SOS screen
    expect(find.byType(BinaIrisArtwork), findsNothing);
    expect(find.byType(BinaHeaderWave), findsNothing);
    expect(find.byType(BinaFooterWave), findsNothing);
    expect(find.textContaining('۱۱۵'), findsWidgets);
    expect(find.textContaining('۲۴ ساعته'), findsOneWidget);
  });

  testWidgets('SOS-03/04/06/07 enforces explicit eye, immediate red-flag banner & offline pending receipt', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(412, 824);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final gw = _SosCaregiverTestGateway()..failNetwork = true;
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          patientGatewayProvider.overrideWithValue(gw),
        ],
        child: const BinaPatientApp(),
      ),
    );
    await tester.pumpAndSettle();

    // Go to Urgent Help -> Start Symptom Report
    await tester.tap(find.text('کمک فوری').first);
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('ثبت علائم ساختاریافته'),
      200,
      scrollable: find.descendant(of: find.byType(UrgentHelpScreen), matching: find.byType(Scrollable)).first,
    );
    await tester.tap(find.text('ثبت علائم ساختاریافته'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('شروع ثبت علائم'));
    await tester.pumpAndSettle();

    // SOS-03: No default eye; continue button is disabled until eye selected
    expect(find.byType(SymptomEyeScreen), findsOneWidget);
    await tester.tap(find.text('چشم چپ (OS)'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('ادامه'));
    await tester.pumpAndSettle();

    // SOS-04/08: Toggle severePain -> immediate static BinaUrgentActionCard BEFORE submit
    expect(find.text('نیاز به اقدام فوری — منتظر تکمیل فرم نمانید'), findsNothing);
    await tester.tap(find.text('درد شدید یا رو به افزایش چشم'));
    await tester.pumpAndSettle();
    expect(find.byType(BinaUrgentActionCard), findsOneWidget);
    expect(find.text('نیاز به اقدام فوری — منتظر تکمیل فرم نمانید'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('بازبینی و ارسال گزارش'),
      200,
      scrollable:
          find.descendant(of: find.byType(SymptomQuestionsScreen), matching: find.byType(Scrollable)).first,
    );
    await tester.tap(find.text('بازبینی و ارسال گزارش'));
    await tester.pumpAndSettle();
    expect(find.text('چشم چپ (OS)'), findsOneWidget);

    await tester.scrollUntilVisible(
      find.text('ارسال گزارش علائم'),
      200,
      scrollable:
          find.descendant(of: find.byType(SymptomReviewScreen), matching: find.byType(Scrollable)).first,
    );
    await tester.tap(find.text('ارسال گزارش علائم'));
    await tester.pumpAndSettle();

    // SOS-07: Offline receipt shows pending status + review warning + urgent card
    expect(find.text('روی دستگاه ثبت شد؛ در انتظار ارسال'), findsOneWidget);
    expect(find.textContaining('به معنی بررسی فوری توسط پزشک نیست'), findsOneWidget);
    expect(find.byType(BinaUrgentActionCard), findsOneWidget);
  });

  testWidgets('EDU-01/02/04 displays 18sp text, non-autoplaying audio, and missing-topic fallback', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(412, 824);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      const ProviderScope(
        child: BinaPatientApp(),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('مراقبت'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('آموزش و راهنما'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('روش صحیح چکاندن قطره چشمی'));
    await tester.pumpAndSettle();

    expect(find.textContaining('پخش صوتی اختیاری'), findsOneWidget);
    final stepText = tester.widget<Text>(find.textContaining('حداقل ۵ دقیقه بین آن‌ها فاصله بگذارید'));
    expect(stepText.style?.fontSize, 18);

    // EDU-04: Unavailable/missing topic fallback
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: buildBinaTheme(Brightness.light),
          home: const Directionality(
            textDirection: TextDirection.rtl,
            child: EducationDetailScreen(topicId: 'missing-topic-xyz'),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('مطلب آموزشی در دسترس نیست'), findsOneWidget);
    expect(find.text('کمک فوری و تماس با کلینیک'), findsOneWidget);
  });

  testWidgets('CG-01..09 least privilege, offline revoke failure, switch patient & 403 fail-closed purge', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(412, 824);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final gw = _SosCaregiverTestGateway()..revokeFailNetwork = true;
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          patientGatewayProvider.overrideWithValue(gw),
        ],
        child: const BinaPatientApp(),
      ),
    );
    await tester.pumpAndSettle();

    // Patient opens Caregivers from Account
    await tester.tap(find.text('حساب من'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('همراه (مراقب)'));
    await tester.pumpAndSettle();

    // Verify least-privilege scopes on Invite -> Scope
    await tester.tap(find.text('افزودن همراه جدید'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).first, '۰۹۱۲۳۴۵۶۷۸۹');
    await tester.tap(find.text('ادامه و انتخاب مجوزها'));
    await tester.pumpAndSettle();

    final readBox = tester.widget<CheckboxListTile>(
      find.widgetWithText(CheckboxListTile, 'مشاهده برنامه مراقبت و زمان‌بندی قطره‌ها'),
    );
    final adherBox = tester.widget<CheckboxListTile>(
      find.widgetWithText(CheckboxListTile, 'ثبت مصرف دارو و گزارش پایبندی'),
    );
    expect(readBox.value, isTrue);
    expect(adherBox.value, isFalse);

    // Go back to grant detail and test offline revoke honesty
    await tester.tap(find.byTooltip('بازگشت'));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('بازگشت'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('فرزند بیمار').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('لغو دسترسی همراه'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('لغو دسترسی'));
    await tester.pumpAndSettle();

    expect(find.textContaining('دسترسی هنوز در سرور لغو نشده است'), findsOneWidget);
  });

  testWidgets('CG-07/09 caregiver patient switch clears prior state & 403 triggers fail-closed purge', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(412, 824);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    // Caregiver session switching & 403 fail-closed cache purge
    const caregiverSession = AuthSessionContext(
      accessToken: 'cg-tok',
      tenantId: '00000000-0000-4000-8000-000000000001',
      clinicId: '11111111-1111-4111-8111-111111111111',
      patientId: 'pat-a',
      actorType: 'caregiver',
      grantId: 'grant-a',
      activePatientNameFa: 'فاطمه محمدی',
    );

    final containerGw = _SosCaregiverTestGateway();
    late ProviderContainer container;
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          patientGatewayProvider.overrideWithValue(containerGw),
          sessionProvider.overrideWith(() => _StaticSession(caregiverSession)),
        ],
        child: Builder(
          builder: (ctx) {
            container = ProviderScope.containerOf(ctx);
            return const BinaPatientApp();
          },
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('در حال مراقبت از: فاطمه محمدی'), findsOneWidget);
    // Cache populated for pat-a
    expect(await container.read(sessionCacheRepositoryProvider).loadTodayPlan(caregiverSession), isNotNull);

    // Switch patient via BinaContextBanner -> resets prior draft & switches context
    container.read(symptomDraftProvider.notifier).setEye(EyeLaterality.oD);
    await tester.tap(find.text('تغییر بیمار'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('حسین رضایی'));
    await tester.pumpAndSettle();

    expect(find.text('در حال مراقبت از: حسین رضایی'), findsOneWidget);
    expect(container.read(symptomDraftProvider).selectedEye, isNull);

    // Trigger 403 revocation -> purges cache and shows neutral CaregiverRevokedScreen
    final activeSessionAfterSwitch = container.read(sessionProvider)!;
    containerGw.throw403ForCaregiver = true;
    await tester.tap(find.text('تغییر بیمار'));
    await tester.pumpAndSettle();
    expect(find.text('دسترسی پایان یافته است'), findsOneWidget);
    await tester.tap(find.text('ادامه'));
    await tester.pumpAndSettle();

    expect(find.text('بازگشت به صفحه ورود'), findsOneWidget);
    expect(container.read(sessionProvider), isNull);
    expect(
      await container.read(sessionCacheRepositoryProvider).loadTodayPlan(activeSessionAfterSwitch),
      isNull,
    );
  });
}
