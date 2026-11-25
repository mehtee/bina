import 'dart:convert';

import 'package:bina_api_dtos/bina_api_dtos.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;

@immutable
class AuthSessionContext {
  const AuthSessionContext({
    required this.accessToken,
    required this.tenantId,
    required this.clinicId,
    required this.patientId,
    required this.actorType,
    this.grantId,
    this.activePatientNameFa,
  });

  final String accessToken;
  final String tenantId;
  final String clinicId;
  final String patientId;
  final String actorType; // 'patient' | 'caregiver'
  final String? grantId;
  final String? activePatientNameFa;

  String get actorPartitionId => actorType == 'caregiver' ? (grantId ?? 'caregiver') : patientId;
}

class PatientGatewayException implements Exception {
  const PatientGatewayException({
    required this.statusCode,
    required this.code,
    required this.messageFa,
  });

  final int statusCode;
  final String code;
  final String messageFa;

  bool get isUnauthorizedOrRevoked => statusCode == 401 || statusCode == 403;

  @override
  String toString() => 'PatientGatewayException($statusCode, $code: $messageFa)';
}

/// OCP boundary separating all Patient App UI & state from backend transport vs.
/// deterministic mock fixtures (`ADR-048` + `v2.1 §0 Rule 1`).
abstract interface class PatientGatewayPort {
  Future<ClinicProfile> getCurrentClinic({AuthSessionContext? session});

  Future<OtpDispatchResponse> requestPatientOtp(PatientOtpRequest request);

  Future<PatientSessionResponse> verifyPatientOtp(PatientOtpVerifyRequest request);

  Future<CaregiverSessionResponse> verifyCaregiverOtp(CaregiverOtpVerifyRequest request);

  Future<PatientProfileResponse> getPatientProfile(AuthSessionContext session);

  Future<PatientTodayResponse> getPatientTodayPlan(AuthSessionContext session);

  Future<PatientEpisodeListResponse> listPatientEpisodes(AuthSessionContext session);

  Future<AdherenceEventListResponse> listMedicationAdherence({
    required AuthSessionContext session,
    required String episodeId,
  });

  Future<AdherenceEventResponse> recordMedicationAdherence({
    required AuthSessionContext session,
    required String episodeId,
    required String idempotencyKey,
    required AdherenceEventRequest request,
  });

  Future<SymptomReportResponse> submitSymptomReport({
    required AuthSessionContext session,
    required String episodeId,
    required String idempotencyKey,
    required SymptomReportRequest request,
  });

  Future<CaregiverGrantListResponse> listPatientCaregivers(AuthSessionContext session);

  Future<CaregiverPatientListResponse> listCaregiverPatients(AuthSessionContext session);

  Future<CaregiverGrant> grantCaregiverAccess({
    required AuthSessionContext session,
    required CaregiverGrantRequest request,
  });

  Future<void> revokeCaregiverAccess({
    required AuthSessionContext session,
    required String grantId,
  });

  Future<PatientDiagnosticSummaryList> listDiagnosticSummaries(AuthSessionContext session);

  Future<CalibrationProfileResponse> registerCalibrationProfile({
    required AuthSessionContext session,
    required CalibrationProfileRequest request,
  });

  Future<HomeVisionTestResponse> submitHomeVisionTest({
    required AuthSessionContext session,
    required String idempotencyKey,
    required HomeVisionTestRequest request,
  });

  Future<PatientVisionTrendsResponse> getVisionTrends(AuthSessionContext session);
}

/// Deterministic contract mock adapter reading `assets/contracts/v01-v09-preview.json`
/// or resolving [defaultPreviewFixtureJson] synchronously without blocking FakeAsync tests.
class MockPatientGateway implements PatientGatewayPort {
  MockPatientGateway({
    AssetBundle? bundle,
    bool useAssetBundle = false,
    String fixturePath = 'assets/contracts/v01-v09-preview.json',
  })  : _bundle = bundle,
        _useAssetBundle = useAssetBundle,
        _fixturePath = fixturePath;

  final AssetBundle? _bundle;
  final bool _useAssetBundle;
  final String _fixturePath;
  Map<String, Object?>? _cachedJson;

  static const Map<String, Object?> defaultPreviewFixtureJson = <String, Object?>{
    'schemaVersion': '1.0.0',
    'syntheticNotice':
        '100% synthetic golden clinical fixtures for V01-V09 preview harness and R1/W3/W4 tests. Zero real PHI.',
    'clinic': <String, Object?>{
      'clinicId': '11111111-1111-4111-8111-111111111111',
      'tenantId': '00000000-0000-4000-8000-000000000001',
      'nameFa': 'کلینیک فوق‌تخصصی چشم نور تهران',
      'locale': 'fa-IR',
      'calendarMode': 'jalali',
      'emergencyPhone': '+982182400000',
      'staffedHoursFa': 'شنبه تا چهارشنبه ۸ تا ۲۰ — پنج‌شنبه ۸ تا ۱۴',
      'todayJalali': '۱۴۰۵/۰۹/۰۲',
      'currentlyStaffed': true,
    },
    'patient': <String, Object?>{
      'patientId': '22222222-2222-4222-8222-222222222222',
      'fullNameFa': 'علی رضایی (نمونه)',
      'phoneMasked': '+98912***6789',
      'preferredLocale': 'fa-IR',
      'accessMode': 'app',
    },
    'todayPlan': <String, Object?>{
      'todayJalali': '۱۴۰۵/۰۹/۰۲',
      'emergencyHotlinePhone': '+982182400000',
      'clinicStaffedHoursFa': 'همه‌روزه ۸ تا ۲۰؛ در ساعات غیرکاری به اورژانس چشم مراجعه کنید',
      'scheduleItems': <Object?>[
        <String, Object?>{
          'episodeId': '33333333-3333-4333-8333-333333333331',
          'prescriptionVersion': 2,
          'eyeLaterality': 'OD',
          'eyeLabelFa': 'چشم راست',
          'drugNameFa': 'قطره بتامتازون چشمی ۰.۱٪',
          'bottleCapColorFa': 'درِ صورتی',
          'scheduledTimeJalali': '۱۴۰۵/۰۹/۰۲ — ۱۴:۰۰',
          'instructionsFa': 'یک قطره در چشم راست، ۵ دقیقه فاصله با قطره بعدی',
          'taken': false,
        },
        <String, Object?>{
          'episodeId': '33333333-3333-4333-8333-333333333331',
          'prescriptionVersion': 2,
          'eyeLaterality': 'OD',
          'eyeLabelFa': 'چشم راست',
          'drugNameFa': 'قطره سیپروفلوکساسین ۰.۳٪',
          'bottleCapColorFa': 'درِ سفید',
          'scheduledTimeJalali': '۱۴۰۵/۰۹/۰۲ — ۱۴:۰۵',
          'instructionsFa': 'یک قطره در چشم راست (۴ بار در روز)',
          'taken': true,
        },
        <String, Object?>{
          'episodeId': '33333333-3333-4333-8333-333333333332',
          'prescriptionVersion': 1,
          'eyeLaterality': 'OS',
          'eyeLabelFa': 'چشم چپ',
          'drugNameFa': 'قطره اشک مصنوعی بدون نگهدارنده',
          'bottleCapColorFa': 'درِ آبی',
          'scheduledTimeJalali': '۱۴۰۵/۰۹/۰۲ — ۱۶:۰۰',
          'instructionsFa': 'یک قطره در چشم چپ در صورت خشکی',
          'taken': false,
        },
      ],
    },
    'caregivers': <Object?>[
      <String, Object?>{
        'grantId': '44444444-4444-4444-8444-444444444441',
        'patientId': '22222222-2222-4222-8222-222222222222',
        'caregiverPhone': '***',
        'relationshipFa': 'فرزند بیمار',
        'scopes': <Object?>['care_plan:read', 'adherence:write'],
        'active': true,
        'createdAt': '2026-11-20T08:30:00.000Z',
      },
    ],
    'diagnosticSummaries': <Object?>[
      <String, Object?>{
        'studyId': '55555555-5555-4555-8555-555555555551',
        'signedAtJalali': '۱۴۰۵/۰۸/۲۹',
        'eyeLabelFa': 'چشم راست',
        'urgencyTier': 'followup_3_6m',
        'urgencyLabelFa': 'پیگیری ۳ تا ۶ ماه',
        'patientGuidanceFa':
            'تصویربرداری شبکیه و OCT شما توسط چشم‌پزشک بررسی و تایید شد. وضعیت فعلی پایدار است و معاینه کنترلی طی ۳ ماه آینده توصیه می‌شود.',
        'nextStepFa': 'هماهنگی نوبت ویزیت سه‌ماهه با پذیرش کلینیک',
      },
    ],
    'r2Trends': <String, Object?>{
      'patientId': '22222222-2222-4222-8222-222222222222',
      'od': <Object?>[
        <String, Object?>{
          'testId': '66666666-6666-4666-8666-666666666661',
          'testType': 'landolt_c',
          'eyeLaterality': 'OD',
          'vaLogmar': 0.1,
          'amslerDistortionScore': null,
          'recordedAt': '2026-11-18T09:00:00.000Z',
        },
        <String, Object?>{
          'testId': '66666666-6666-4666-8666-666666666662',
          'testType': 'landolt_c',
          'eyeLaterality': 'OD',
          'vaLogmar': 0.08,
          'amslerDistortionScore': null,
          'recordedAt': '2026-11-23T09:15:00.000Z',
        },
      ],
      'os': <Object?>[
        <String, Object?>{
          'testId': '66666666-6666-4666-8666-666666666663',
          'testType': 'amsler',
          'eyeLaterality': 'OS',
          'vaLogmar': null,
          'amslerDistortionScore': 0.0,
          'recordedAt': '2026-11-23T09:20:00.000Z',
        },
      ],
    },
  };

  Future<Map<String, Object?>> _loadFixture() async {
    if (_cachedJson != null) return _cachedJson!;
    if (_bundle == null && !_useAssetBundle) {
      _cachedJson = defaultPreviewFixtureJson;
      return _cachedJson!;
    }
    final raw = await (_bundle ?? rootBundle).loadString(_fixturePath);
    _cachedJson = jsonDecode(raw) as Map<String, Object?>;
    return _cachedJson!;
  }

  @override
  Future<ClinicProfile> getCurrentClinic({AuthSessionContext? session}) async {
    final json = await _loadFixture();
    return ClinicProfile.fromJson(json['clinic']! as Map<String, Object?>);
  }

  @override
  Future<OtpDispatchResponse> requestPatientOtp(PatientOtpRequest request) async {
    return const OtpDispatchResponse(
      challengeId: '77777777-7777-4777-8777-777777777771',
      expiresInSeconds: 180,
      maskedPhone: '+98912***6789',
    );
  }

  @override
  Future<PatientSessionResponse> verifyPatientOtp(PatientOtpVerifyRequest request) async {
    final json = await _loadFixture();
    final clinic = json['clinic']! as Map<String, Object?>;
    final patient = json['patient']! as Map<String, Object?>;
    return PatientSessionResponse(
      accessToken: 'mock-patient-token',
      patientId: patient['patientId']! as String,
      tenantId: request.tenantId ?? (clinic['tenantId']! as String),
      clinicId: clinic['clinicId']! as String,
      locale: 'fa-IR',
      calendarMode: 'jalali',
    );
  }

  @override
  Future<CaregiverSessionResponse> verifyCaregiverOtp(CaregiverOtpVerifyRequest request) async {
    final json = await _loadFixture();
    final clinic = json['clinic']! as Map<String, Object?>;
    final patient = json['patient']! as Map<String, Object?>;
    final link = CaregiverPatientLink(
      grantId: '44444444-4444-4444-8444-444444444441',
      patientId: patient['patientId']! as String,
      patientNameFa: patient['fullNameFa']! as String,
      relationshipFa: 'فرزند بیمار',
      scopes: const ['care_plan:read', 'adherence:write'],
      clinicId: clinic['clinicId']! as String,
      active: true,
      createdAt: '2026-11-20T08:30:00.000Z',
    );
    return CaregiverSessionResponse(
      accessToken: 'mock-caregiver-token',
      grantId: link.grantId,
      patientId: link.patientId,
      tenantId: request.tenantId ?? (clinic['tenantId']! as String),
      clinicId: link.clinicId,
      locale: 'fa-IR',
      calendarMode: 'jalali',
      patients: [link],
    );
  }

  @override
  Future<PatientProfileResponse> getPatientProfile(AuthSessionContext session) async {
    final json = await _loadFixture();
    final clinic = json['clinic']! as Map<String, Object?>;
    final patient = json['patient']! as Map<String, Object?>;
    return PatientProfileResponse(
      patientId: patient['patientId']! as String,
      tenantId: clinic['tenantId']! as String,
      clinicId: clinic['clinicId']! as String,
      fullNameFa: patient['fullNameFa']! as String,
      phoneMasked: patient['phoneMasked']! as String,
      preferredLocale: 'fa-IR',
      accessMode: AccessMode.app,
      consents: const [
        ConsentRecord(
          consentId: '88888888-8888-4888-8888-888888888881',
          consentVersion: 'fa-IR-v1.0',
          locale: 'fa-IR',
          acceptedAt: '2026-11-20T08:00:00.000Z',
        ),
      ],
    );
  }

  @override
  Future<PatientTodayResponse> getPatientTodayPlan(AuthSessionContext session) async {
    final json = await _loadFixture();
    return PatientTodayResponse.fromJson(json['todayPlan']! as Map<String, Object?>);
  }

  @override
  Future<PatientEpisodeListResponse> listPatientEpisodes(AuthSessionContext session) async {
    final json = await _loadFixture();
    final clinic = json['clinic']! as Map<String, Object?>;
    final patient = json['patient']! as Map<String, Object?>;
    return PatientEpisodeListResponse(
      items: [
        PatientEpisodeWithPrescription(
          episode: CareEpisode(
            episodeId: '33333333-3333-4333-8333-333333333331',
            tenantId: clinic['tenantId']! as String,
            patientId: patient['patientId']! as String,
            protocolType: 'post_cataract',
            eyeLaterality: EyeLaterality.oD,
            eyeLabelFa: 'چشم راست',
            accessMode: AccessMode.app,
            activePrescriptionVersion: 2,
            status: 'active',
            anchorAt: '2026-11-19T06:00:00.000Z',
          ),
          activePrescription: const PrescriptionVersion(
            prescriptionId: '99999999-9999-4999-8999-999999999991',
            episodeId: '33333333-3333-4333-8333-333333333331',
            version: 2,
            eyeLaterality: EyeLaterality.oD,
            eyeLabelFa: 'چشم راست',
            items: [
              DropItemInput(
                drugNameFa: 'قطره بتامتازون چشمی ۰.۱٪',
                genericName: 'Betamethasone 0.1%',
                bottleCapColorFa: 'درِ صورتی',
                frequencyPerDay: 4,
                durationDays: 14,
                instructionsFa: 'یک قطره در چشم راست، ۵ دقیقه فاصله با قطره بعدی',
              ),
            ],
            publishedAt: '2026-11-19T08:00:00.000Z',
          ),
        ),
      ],
    );
  }

  @override
  Future<AdherenceEventListResponse> listMedicationAdherence({
    required AuthSessionContext session,
    required String episodeId,
  }) async {
    return AdherenceEventListResponse(
      items: <AdherenceEventResponse>[
        AdherenceEventResponse(
          eventId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1',
          episodeId: episodeId,
          state: AdherenceState.taken,
          deduplicated: false,
          recordedAt: '2026-11-24T10:30:00.000Z',
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
    return AdherenceEventResponse(
      eventId: idempotencyKey,
      episodeId: episodeId,
      state: request.state,
      deduplicated: false,
      recordedAt: request.occurredAt,
    );
  }

  @override
  Future<SymptomReportResponse> submitSymptomReport({
    required AuthSessionContext session,
    required String episodeId,
    required String idempotencyKey,
    required SymptomReportRequest request,
  }) async {
    final isUrgent = request.severePain ||
        request.suddenVisionLoss ||
        request.purulentDischarge ||
        (request.flashesOrCurtain ?? false);
    return SymptomReportResponse(
      reportId: idempotencyKey,
      urgencyTier: isUrgent ? UrgencyTier.urgent : UrgencyTier.routine,
      urgencyLabelFa: isUrgent ? 'ارجاع فوری' : 'عادی',
      triggeredTriageCaseId: isUrgent ? 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' : null,
      guidanceFa: isUrgent
          ? 'لطفاً فوراً با شماره اورژانس کلینیک تماس بگیرید و به اورژانس چشم مراجعه کنید.'
          : 'گزارش شما ثبت شد؛ برنامه مراقبت خود را طبق دستور ادامه دهید.',
    );
  }

  @override
  Future<CaregiverGrantListResponse> listPatientCaregivers(AuthSessionContext session) async {
    final json = await _loadFixture();
    final rawList = (json['caregivers'] as List<Object?>?) ?? const <Object?>[];
    return CaregiverGrantListResponse(
      items: rawList.map((e) => CaregiverGrant.fromJson(e! as Map<String, Object?>)).toList(),
    );
  }

  @override
  Future<CaregiverPatientListResponse> listCaregiverPatients(AuthSessionContext session) async {
    final json = await _loadFixture();
    final clinic = json['clinic']! as Map<String, Object?>;
    final patient = json['patient']! as Map<String, Object?>;
    return CaregiverPatientListResponse(
      items: [
        CaregiverPatientLink(
          grantId: '44444444-4444-4444-8444-444444444441',
          patientId: patient['patientId']! as String,
          patientNameFa: patient['fullNameFa']! as String,
          relationshipFa: 'فرزند بیمار',
          scopes: const ['care_plan:read', 'adherence:write'],
          clinicId: clinic['clinicId']! as String,
          active: true,
          createdAt: '2026-11-20T08:30:00.000Z',
        ),
      ],
    );
  }

  @override
  Future<CaregiverGrant> grantCaregiverAccess({
    required AuthSessionContext session,
    required CaregiverGrantRequest request,
  }) async {
    return CaregiverGrant(
      grantId: '44444444-4444-4444-8444-444444444442',
      patientId: session.patientId,
      caregiverPhone: '***',
      relationshipFa: request.relationshipFa,
      scopes: request.scopes,
      active: true,
      createdAt: DateTime.now().toUtc().toIso8601String(),
    );
  }

  @override
  Future<void> revokeCaregiverAccess({
    required AuthSessionContext session,
    required String grantId,
  }) async {}

  @override
  Future<PatientDiagnosticSummaryList> listDiagnosticSummaries(AuthSessionContext session) async {
    final json = await _loadFixture();
    final items = (json['diagnosticSummaries'] as List<Object?>?) ?? const <Object?>[];
    return PatientDiagnosticSummaryList(
      items: items.map((e) => PatientDiagnosticSummary.fromJson(e! as Map<String, Object?>)).toList(),
    );
  }

  @override
  Future<CalibrationProfileResponse> registerCalibrationProfile({
    required AuthSessionContext session,
    required CalibrationProfileRequest request,
  }) async {
    return CalibrationProfileResponse(
      calibrationProfileId: 'cal-${session.patientId}-v1',
      patientId: session.patientId,
      screenWidthMm: request.screenWidthMm,
      viewingDistanceCm: request.viewingDistanceCm,
      calibratedBy: request.calibratedBy,
      verified: request.verified ?? true,
      createdAt: DateTime.now().toUtc().toIso8601String(),
    );
  }

  @override
  Future<HomeVisionTestResponse> submitHomeVisionTest({
    required AuthSessionContext session,
    required String idempotencyKey,
    required HomeVisionTestRequest request,
  }) async {
    final qcOk = request.viewingDistanceCm >= 25.0 &&
        request.ambientLux >= 50.0 &&
        request.deviceTiltDeg <= 25.0 &&
        !(request.glareDetected ?? false);
    return HomeVisionTestResponse(
      testId: idempotencyKey,
      eyeLaterality: request.eyeLaterality,
      eyeLabelFa: request.eyeLaterality == EyeLaterality.oD ? 'چشم راست' : 'چشم چپ',
      testType: request.testType,
      qualityPassed: qcOk,
      qualityIssuesFa: qcOk ? const <String>[] : const <String>['شرایط نور، فاصله یا ثبات دستگاه کافی نبود'],
      triggeredTriageCaseId: null,
      guidanceFa: qcOk
          ? 'نتیجه آزمون با کیفیت قابل قبول ثبت شد و برای بررسی تیم درمان در دسترس است.'
          : 'کیفیت آزمون تأیید نشد؛ لطفاً در شرایط نوری و فاصله مناسب دوباره آزمون دهید.',
    );
  }

  @override
  Future<PatientVisionTrendsResponse> getVisionTrends(AuthSessionContext session) async {
    final json = await _loadFixture();
    return PatientVisionTrendsResponse.fromJson(json['r2Trends']! as Map<String, Object?>);
  }
}

/// Live OpenAPI HTTP client targeting containerized `apps/backend`.
final class HttpPatientGateway implements PatientGatewayPort {
  HttpPatientGateway({
    required this.baseUrl,
    http.Client? client,
  }) : _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;

  Uri _uri(String path, [Map<String, String>? query]) {
    final normalizedBase = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl;
    return Uri.parse('$normalizedBase$path').replace(queryParameters: query);
  }

  Map<String, String> _headers({
    AuthSessionContext? session,
    String? tenantId,
    String? idempotencyKey,
  }) {
    return <String, String>{
      'Content-Type': 'application/json',
      if (session != null) 'Authorization': 'Bearer ${session.accessToken}',
      if (tenantId != null || session != null) 'X-Tenant-Id': tenantId ?? session!.tenantId,
      'Idempotency-Key': ?idempotencyKey,
    };
  }

  Map<String, Object?> _decodeJson(http.Response res) {
    final decoded = res.body.isEmpty ? <String, Object?>{} : jsonDecode(res.body) as Map<String, Object?>;
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw PatientGatewayException(
        statusCode: res.statusCode,
        code: (decoded['error'] as String?) ?? 'HTTP_${res.statusCode}',
        messageFa: (decoded['messageFa'] as String?) ?? 'خطا در ارتباط با سرور رخ داد.',
      );
    }
    return decoded;
  }

  Map<String, String>? _patientQueryIfCaregiver(AuthSessionContext session) {
    if (session.actorType == 'caregiver') {
      return <String, String>{'patientId': session.patientId};
    }
    return null;
  }

  @override
  Future<ClinicProfile> getCurrentClinic({AuthSessionContext? session}) async {
    final res = await _client.get(_uri('/v1/clinics/current'), headers: _headers(session: session));
    return ClinicProfile.fromJson(_decodeJson(res));
  }

  @override
  Future<OtpDispatchResponse> requestPatientOtp(PatientOtpRequest request) async {
    final res = await _client.post(
      _uri('/v1/auth/patient/otp/request'),
      headers: _headers(tenantId: request.tenantId),
      body: jsonEncode(request.toJson()),
    );
    return OtpDispatchResponse.fromJson(_decodeJson(res));
  }

  @override
  Future<PatientSessionResponse> verifyPatientOtp(PatientOtpVerifyRequest request) async {
    final res = await _client.post(
      _uri('/v1/auth/patient/otp/verify'),
      headers: _headers(tenantId: request.tenantId),
      body: jsonEncode(request.toJson()),
    );
    return PatientSessionResponse.fromJson(_decodeJson(res));
  }

  @override
  Future<CaregiverSessionResponse> verifyCaregiverOtp(CaregiverOtpVerifyRequest request) async {
    final res = await _client.post(
      _uri('/v1/auth/caregiver/otp/verify'),
      headers: _headers(tenantId: request.tenantId),
      body: jsonEncode(request.toJson()),
    );
    return CaregiverSessionResponse.fromJson(_decodeJson(res));
  }

  @override
  Future<PatientProfileResponse> getPatientProfile(AuthSessionContext session) async {
    final res = await _client.get(
      _uri('/v1/patient/profile', _patientQueryIfCaregiver(session)),
      headers: _headers(session: session),
    );
    return PatientProfileResponse.fromJson(_decodeJson(res));
  }

  @override
  Future<PatientTodayResponse> getPatientTodayPlan(AuthSessionContext session) async {
    final res = await _client.get(
      _uri('/v1/patient/today', _patientQueryIfCaregiver(session)),
      headers: _headers(session: session),
    );
    return PatientTodayResponse.fromJson(_decodeJson(res));
  }

  @override
  Future<PatientEpisodeListResponse> listPatientEpisodes(AuthSessionContext session) async {
    final res = await _client.get(
      _uri('/v1/patient/episodes', _patientQueryIfCaregiver(session)),
      headers: _headers(session: session),
    );
    return PatientEpisodeListResponse.fromJson(_decodeJson(res));
  }

  @override
  Future<AdherenceEventListResponse> listMedicationAdherence({
    required AuthSessionContext session,
    required String episodeId,
  }) async {
    final res = await _client.get(
      _uri('/v1/episodes/$episodeId/adherence'),
      headers: _headers(session: session),
    );
    return AdherenceEventListResponse.fromJson(_decodeJson(res));
  }

  @override
  Future<AdherenceEventResponse> recordMedicationAdherence({
    required AuthSessionContext session,
    required String episodeId,
    required String idempotencyKey,
    required AdherenceEventRequest request,
  }) async {
    final res = await _client.post(
      _uri('/v1/episodes/$episodeId/adherence'),
      headers: _headers(session: session, idempotencyKey: idempotencyKey),
      body: jsonEncode(request.toJson()),
    );
    return AdherenceEventResponse.fromJson(_decodeJson(res));
  }

  @override
  Future<SymptomReportResponse> submitSymptomReport({
    required AuthSessionContext session,
    required String episodeId,
    required String idempotencyKey,
    required SymptomReportRequest request,
  }) async {
    final res = await _client.post(
      _uri('/v1/episodes/$episodeId/symptoms'),
      headers: _headers(session: session, idempotencyKey: idempotencyKey),
      body: jsonEncode(request.toJson()),
    );
    return SymptomReportResponse.fromJson(_decodeJson(res));
  }

  @override
  Future<CaregiverGrantListResponse> listPatientCaregivers(AuthSessionContext session) async {
    final res = await _client.get(
      _uri('/v1/patients/${session.patientId}/caregivers'),
      headers: _headers(session: session),
    );
    return CaregiverGrantListResponse.fromJson(_decodeJson(res));
  }

  @override
  Future<CaregiverPatientListResponse> listCaregiverPatients(AuthSessionContext session) async {
    final res = await _client.get(
      _uri('/v1/caregiver/patients'),
      headers: _headers(session: session),
    );
    return CaregiverPatientListResponse.fromJson(_decodeJson(res));
  }

  @override
  Future<CaregiverGrant> grantCaregiverAccess({
    required AuthSessionContext session,
    required CaregiverGrantRequest request,
  }) async {
    final res = await _client.post(
      _uri('/v1/patients/${session.patientId}/caregivers'),
      headers: _headers(session: session),
      body: jsonEncode(request.toJson()),
    );
    return CaregiverGrant.fromJson(_decodeJson(res));
  }

  @override
  Future<void> revokeCaregiverAccess({
    required AuthSessionContext session,
    required String grantId,
  }) async {
    final res = await _client.delete(
      _uri('/v1/patients/${session.patientId}/caregivers/$grantId'),
      headers: _headers(session: session),
    );
    _decodeJson(res);
  }

  @override
  Future<PatientDiagnosticSummaryList> listDiagnosticSummaries(AuthSessionContext session) async {
    final res = await _client.get(
      _uri('/v1/patient/diagnostic-summaries', _patientQueryIfCaregiver(session)),
      headers: _headers(session: session),
    );
    return PatientDiagnosticSummaryList.fromJson(_decodeJson(res));
  }

  @override
  Future<CalibrationProfileResponse> registerCalibrationProfile({
    required AuthSessionContext session,
    required CalibrationProfileRequest request,
  }) async {
    final res = await _client.post(
      _uri('/v1/r2/calibration-profiles'),
      headers: _headers(session: session),
      body: jsonEncode(request.toJson()),
    );
    return CalibrationProfileResponse.fromJson(_decodeJson(res));
  }

  @override
  Future<HomeVisionTestResponse> submitHomeVisionTest({
    required AuthSessionContext session,
    required String idempotencyKey,
    required HomeVisionTestRequest request,
  }) async {
    final res = await _client.post(
      _uri('/v1/r2/home-tests'),
      headers: _headers(session: session, idempotencyKey: idempotencyKey),
      body: jsonEncode(request.toJson()),
    );
    return HomeVisionTestResponse.fromJson(_decodeJson(res));
  }

  @override
  Future<PatientVisionTrendsResponse> getVisionTrends(AuthSessionContext session) async {
    final res = await _client.get(
      _uri('/v1/r2/patients/${session.patientId}/trends'),
      headers: _headers(session: session),
    );
    return PatientVisionTrendsResponse.fromJson(_decodeJson(res));
  }
}
