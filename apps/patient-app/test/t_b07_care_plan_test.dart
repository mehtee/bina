import 'dart:io';

import 'package:bina_api_dtos/bina_api_dtos.dart';
import 'package:bina_design_system/bina_design_system.dart';
import 'package:bina_offline_store/bina_offline_store.dart';
import 'package:bina_patient_app/app/app.dart';
import 'package:bina_patient_app/app/providers.dart';
import 'package:bina_patient_app/core/data/patient_gateway.dart';
import 'package:bina_patient_app/features/care_plan/care_plan_controller.dart';
import 'package:bina_patient_app/features/care_plan/care_screens.dart';
import 'package:bina_patient_app/features/care_plan/today_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

class _DualEyeMutableGateway extends MockPatientGateway {
  int osRxVersion = 1;
  bool failNetwork = false;
  int adherencePostCount = 0;

  @override
  Future<PatientEpisodeListResponse> listPatientEpisodes(AuthSessionContext session) async {
    return PatientEpisodeListResponse(
      items: <PatientEpisodeWithPrescription>[
        PatientEpisodeWithPrescription(
          episode: CareEpisode(
            episodeId: 'ep-od',
            tenantId: session.tenantId,
            patientId: session.patientId,
            protocolType: 'post_cataract',
            eyeLaterality: EyeLaterality.oD,
            eyeLabelFa: 'چشم راست',
            accessMode: AccessMode.app,
            activePrescriptionVersion: 1,
            status: 'active',
            anchorAt: '2026-11-20T06:00:00.000Z',
          ),
        ),
        PatientEpisodeWithPrescription(
          episode: CareEpisode(
            episodeId: 'ep-os',
            tenantId: session.tenantId,
            patientId: session.patientId,
            protocolType: 'post_cataract',
            eyeLaterality: EyeLaterality.oS,
            eyeLabelFa: 'چشم چپ',
            accessMode: AccessMode.app,
            activePrescriptionVersion: osRxVersion,
            status: 'active',
            anchorAt: '2026-11-20T06:00:00.000Z',
          ),
        ),
      ],
    );
  }

  @override
  Future<PatientTodayResponse> getPatientTodayPlan(AuthSessionContext session) async {
    return PatientTodayResponse(
      todayJalali: '۱۴۰۵/۰۹/۰۵',
      emergencyHotlinePhone: '+982182400000',
      clinicStaffedHoursFa: '۸ تا ۲۰',
      scheduleItems: <PatientTodayDropCard>[
        const PatientTodayDropCard(
          episodeId: 'ep-od',
          prescriptionVersion: 1,
          eyeLaterality: EyeLaterality.oD,
          eyeLabelFa: 'چشم راست',
          drugNameFa: 'قطره بتامتازون',
          bottleCapColorFa: 'درِ صورتی',
          scheduledTimeJalali: '۱۴:۰۰',
          instructionsFa: 'یک قطره در چشم راست',
          taken: false,
        ),
        PatientTodayDropCard(
          episodeId: 'ep-os',
          prescriptionVersion: osRxVersion,
          eyeLaterality: EyeLaterality.oS,
          eyeLabelFa: 'چشم چپ',
          drugNameFa: osRxVersion == 1 ? 'قطره سیپروفلوکساسین' : 'قطره لووفلوکساسین',
          bottleCapColorFa: 'درِ سفید',
          scheduledTimeJalali: '۱۶:۰۰',
          instructionsFa: 'یک قطره در چشم چپ',
          taken: false,
        ),
      ],
    );
  }

  @override
  Future<AdherenceEventResponse> recordMedicationAdherence({
    required AuthSessionContext session,
    required String episodeId,
    required String idempotencyKey,
    required AdherenceEventRequest request,
  }) async {
    if (failNetwork) {
      throw const SocketException('offline');
    }
    adherencePostCount += 1;
    return super.recordMedicationAdherence(
      session: session,
      episodeId: episodeId,
      idempotencyKey: idempotencyKey,
      request: request,
    );
  }
}

void main() {
  testWidgets('Dual-eye OD/OS isolation: updating OS to v2 leaves OD reminders & cards untouched', (
    tester,
  ) async {
    final gw = _DualEyeMutableGateway();
    final reminders = InMemoryLocalReminderAdapter(initialOsPermission: true);
    const session = AuthSessionContext(
      accessToken: 'tok',
      tenantId: 't1',
      clinicId: 'c1',
      patientId: 'pat1',
      actorType: 'patient',
    );

    final container = ProviderContainer(
      overrides: [
        patientGatewayProvider.overrideWithValue(gw),
        localReminderPortProvider.overrideWithValue(reminders),
        sessionProvider.overrideWith(() => _StaticSession(session)),
      ],
    );
    addTearDown(container.dispose);

    final snap1 = await container.read(carePlanControllerProvider.future);
    expect(snap1.updatedEyes, isEmpty);
    final rem1 = await reminders.listScheduled(tenantId: 't1', patientId: 'pat1');
    final odBefore = rem1.firstWhere((r) => r.eyeLaterality == 'OD');
    final osBefore = rem1.firstWhere((r) => r.eyeLaterality == 'OS');
    expect(odBefore.prescriptionVersion, 1);
    expect(osBefore.prescriptionVersion, 1);

    // Server publishes OS Rx v2 -> only OS updates; OD remains untouched!
    gw.osRxVersion = 2;
    await container.read(carePlanControllerProvider.notifier).refreshPlan();
    final snap2 = container.read(carePlanControllerProvider).requireValue;
    expect(snap2.updatedEyes, {EyeLaterality.oS});

    final rem2 = await reminders.listScheduled(tenantId: 't1', patientId: 'pat1');
    final odAfter = rem2.firstWhere((r) => r.eyeLaterality == 'OD');
    final osAfter = rem2.firstWhere((r) => r.eyeLaterality == 'OS');
    expect(odAfter.stableKey, odBefore.stableKey);
    expect(osAfter.prescriptionVersion, 2);
  });

  testWidgets('Offline adherence recording shows honest pending receipt, then syncs once with same key', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(412, 824);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    final gw = _DualEyeMutableGateway()..failNetwork = true;
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          onboardingCompletedProvider.overrideWith(() => _DoneOnboarding()),
          patientGatewayProvider.overrideWithValue(gw),
        ],
        child: const BinaPatientApp(),
      ),
    );
    await tester.pumpAndSettle();

    // Verify Today displays explicit Persian OD & OS headings
    final todayScroll = find.descendant(
      of: find.byType(TodayScreen),
      matching: find.byType(Scrollable),
    );
    await tester.scrollUntilVisible(find.text('چشم راست (OD)'), 200, scrollable: todayScroll);
    expect(find.text('چشم راست (OD)'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('چشم چپ (OS)'), 200, scrollable: todayScroll);
    expect(find.text('چشم چپ (OS)'), findsOneWidget);

    // Open Dose Detail -> Record -> Submit while offline
    await tester.scrollUntilVisible(find.text('مشاهده و ثبت مصرف').first, 200, scrollable: todayScroll);
    await tester.tap(find.text('مشاهده و ثبت مصرف').first);
    await tester.pumpAndSettle();
    expect(find.text('جزئیات دارو'), findsOneWidget);

    final medScroll = find.descendant(
      of: find.byType(MedicationDetailScreen),
      matching: find.byType(Scrollable),
    );
    await tester.scrollUntilVisible(find.text('ثبت مصرف'), 200, scrollable: medScroll);
    await tester.tap(find.text('ثبت مصرف'));
    await tester.pumpAndSettle();
    final recordScroll = find.descendant(
      of: find.byType(DoseRecordScreen),
      matching: find.byType(Scrollable),
    );
    await tester.scrollUntilVisible(find.text('تایید و ثبت وضعیت'), 200, scrollable: recordScroll);
    await tester.tap(find.text('تایید و ثبت وضعیت'));
    await tester.pumpAndSettle();

    // Receipt MUST say pending, NEVER server confirmed while offline!
    expect(find.text('ثبت شد؛ در انتظار ارسال'), findsOneWidget);
    expect(find.text('ارسال شد'), findsNothing);
    expect(gw.adherencePostCount, 0);

    // Go back to Today, go online, open Sync and flush once
    gw.failNetwork = false;
    await tester.tap(find.text('بازگشت به برنامه امروز'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('وضعیت همگام‌سازی'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('تلاش دوباره برای ارسال صف'));
    await tester.pumpAndSettle();

    expect(gw.adherencePostCount, 1);
    expect(find.text('همه ثبت‌ها به سرور ارسال شده‌اند'), findsOneWidget);
  });

  testWidgets('V01, V02, V06 previews render cleanly in Dark and 200% TextScaler with zero overflow', (
    tester,
  ) async {
    for (final child in const <Widget>[
      Scaffold(body: TodayScreen(previewMode: true)),
      Scaffold(body: CareHubScreen(previewMode: true)),
      MedicationDetailScreen(doseOrMedicationKey: 'preview', previewMode: true),
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

class _DoneOnboarding extends OnboardingCompletedNotifier {
  @override
  bool? build() => true;
}

class _StaticSession extends SessionNotifier {
  _StaticSession(this._session);
  final AuthSessionContext _session;
  @override
  AuthSessionContext? build() => _session;
}
