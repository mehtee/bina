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
  });

  final String accessToken;
  final String tenantId;
  final String clinicId;
  final String patientId;
  final String actorType; // 'patient' | 'caregiver'
  final String? grantId;

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

  Future<PatientVisionTrendsResponse> getVisionTrends(AuthSessionContext session);
}

/// Deterministic contract mock adapter reading `assets/contracts/v01-v09-preview.json`.
final class MockPatientGateway implements PatientGatewayPort {
  MockPatientGateway({AssetBundle? bundle, String fixturePath = 'assets/contracts/v01-v09-preview.json'})
      : _bundle = bundle,
        _fixturePath = fixturePath;

  final AssetBundle? _bundle;
  final String _fixturePath;
  Map<String, Object?>? _cachedJson;

  Future<Map<String, Object?>> _loadFixture() async {
    if (_cachedJson != null) return _cachedJson!;
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
  Future<PatientVisionTrendsResponse> getVisionTrends(AuthSessionContext session) async {
    final res = await _client.get(
      _uri('/v1/r2/patients/${session.patientId}/trends'),
      headers: _headers(session: session),
    );
    return PatientVisionTrendsResponse.fromJson(_decodeJson(res));
  }
}
