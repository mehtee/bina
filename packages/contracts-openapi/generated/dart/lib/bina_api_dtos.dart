// GENERATED FROM packages/contracts-openapi/openapi.yaml — DO NOT EDIT BY HAND
// ignore_for_file: sort_constructors_first

enum EyeLaterality {
  oD('OD'),
  oS('OS');

  const EyeLaterality(this.value);
  final String value;

  String toJson() => value;

  static EyeLaterality fromJson(String raw) {
    return EyeLaterality.values.firstWhere(
      (e) => e.value == raw,
      orElse: () => throw ArgumentError('Unknown EyeLaterality: $raw'),
    );
  }
}

enum StudyLaterality {
  oD('OD'),
  oS('OS'),
  oU('OU');

  const StudyLaterality(this.value);
  final String value;

  String toJson() => value;

  static StudyLaterality fromJson(String raw) {
    return StudyLaterality.values.firstWhere(
      (e) => e.value == raw,
      orElse: () => throw ArgumentError('Unknown StudyLaterality: $raw'),
    );
  }
}

enum AccessMode {
  app('app'),
  caregiver('caregiver'),
  printPhone('print_phone');

  const AccessMode(this.value);
  final String value;

  String toJson() => value;

  static AccessMode fromJson(String raw) {
    return AccessMode.values.firstWhere(
      (e) => e.value == raw,
      orElse: () => throw ArgumentError('Unknown AccessMode: $raw'),
    );
  }
}

enum StaffRole {
  ophthalmologist('ophthalmologist'),
  optometrist('optometrist'),
  technician('technician'),
  coordinator('coordinator'),
  admin('admin');

  const StaffRole(this.value);
  final String value;

  String toJson() => value;

  static StaffRole fromJson(String raw) {
    return StaffRole.values.firstWhere(
      (e) => e.value == raw,
      orElse: () => throw ArgumentError('Unknown StaffRole: $raw'),
    );
  }
}

enum UrgencyTier {
  routine('routine'),
  followup36m('followup_3_6m'),
  urgent('urgent');

  const UrgencyTier(this.value);
  final String value;

  String toJson() => value;

  static UrgencyTier fromJson(String raw) {
    return UrgencyTier.values.firstWhere(
      (e) => e.value == raw,
      orElse: () => throw ArgumentError('Unknown UrgencyTier: $raw'),
    );
  }
}

enum SeverityGrade {
  mild('mild'),
  moderate('moderate'),
  severe('severe'),
  urgent('urgent');

  const SeverityGrade(this.value);
  final String value;

  String toJson() => value;

  static SeverityGrade fromJson(String raw) {
    return SeverityGrade.values.firstWhere(
      (e) => e.value == raw,
      orElse: () => throw ArgumentError('Unknown SeverityGrade: $raw'),
    );
  }
}

enum DiagnosticModality {
  fundus('fundus'),
  oct('oct'),
  octa('octa'),
  slitLamp('slit_lamp'),
  topography('topography'),
  visualField('visual_field'),
  tabularLabs('tabular_labs'),
  unknown('unknown');

  const DiagnosticModality(this.value);
  final String value;

  String toJson() => value;

  static DiagnosticModality fromJson(String raw) {
    return DiagnosticModality.values.firstWhere(
      (e) => e.value == raw,
      orElse: () => throw ArgumentError('Unknown DiagnosticModality: $raw'),
    );
  }
}

enum AdherenceState {
  taken('taken'),
  missedWithReason('missed_with_reason'),
  unavailable('unavailable'),
  noResponse('no_response');

  const AdherenceState(this.value);
  final String value;

  String toJson() => value;

  static AdherenceState fromJson(String raw) {
    return AdherenceState.values.firstWhere(
      (e) => e.value == raw,
      orElse: () => throw ArgumentError('Unknown AdherenceState: $raw'),
    );
  }
}

enum StudyStatus {
  ingested('ingested'),
  qcFailed('qc_failed'),
  queued('queued'),
  analyzed('analyzed'),
  pendingHitl('pending_hitl'),
  signedOff('signed_off');

  const StudyStatus(this.value);
  final String value;

  String toJson() => value;

  static StudyStatus fromJson(String raw) {
    return StudyStatus.values.firstWhere(
      (e) => e.value == raw,
      orElse: () => throw ArgumentError('Unknown StudyStatus: $raw'),
    );
  }
}

enum SignoffAction {
  approved('approved'),
  editedApproved('edited_approved'),
  rejected('rejected');

  const SignoffAction(this.value);
  final String value;

  String toJson() => value;

  static SignoffAction fromJson(String raw) {
    return SignoffAction.values.firstWhere(
      (e) => e.value == raw,
      orElse: () => throw ArgumentError('Unknown SignoffAction: $raw'),
    );
  }
}

enum QcRejectionCode {
  blur('blur'),
  lighting('lighting'),
  wrongEye('wrong_eye'),
  modalityMismatch('modality_mismatch');

  const QcRejectionCode(this.value);
  final String value;

  String toJson() => value;

  static QcRejectionCode fromJson(String raw) {
    return QcRejectionCode.values.firstWhere(
      (e) => e.value == raw,
      orElse: () => throw ArgumentError('Unknown QcRejectionCode: $raw'),
    );
  }
}

enum AiEngineMode {
  cpuStub('cpu_stub'),
  onnxCpu('onnx_cpu'),
  gpuFull('gpu_full');

  const AiEngineMode(this.value);
  final String value;

  String toJson() => value;

  static AiEngineMode fromJson(String raw) {
    return AiEngineMode.values.firstWhere(
      (e) => e.value == raw,
      orElse: () => throw ArgumentError('Unknown AiEngineMode: $raw'),
    );
  }
}

class HealthStatus {
  final String status;
  final String service;
  final String locale;
  final String calendar;
  final String jurisdiction;
  final AiEngineMode aiEngineMode;
  final String llmProvider;
  final String llmModel;
  final bool llmConfigured;
  final String timestamp;

  const HealthStatus({
    required this.status,
    required this.service,
    required this.locale,
    required this.calendar,
    required this.jurisdiction,
    required this.aiEngineMode,
    required this.llmProvider,
    required this.llmModel,
    required this.llmConfigured,
    required this.timestamp,
  });

  factory HealthStatus.fromJson(Map<String, Object?> json) {
    return HealthStatus(
      status: json['status'] as String,
      service: json['service'] as String,
      locale: json['locale'] as String,
      calendar: json['calendar'] as String,
      jurisdiction: json['jurisdiction'] as String,
      aiEngineMode: AiEngineMode.fromJson(json['aiEngineMode'] as String),
      llmProvider: json['llmProvider'] as String,
      llmModel: json['llmModel'] as String,
      llmConfigured: json['llmConfigured'] as bool,
      timestamp: json['timestamp'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'status': status,
      'service': service,
      'locale': locale,
      'calendar': calendar,
      'jurisdiction': jurisdiction,
      'aiEngineMode': aiEngineMode.toJson(),
      'llmProvider': llmProvider,
      'llmModel': llmModel,
      'llmConfigured': llmConfigured,
      'timestamp': timestamp,
    };
  }
}

class ClinicProfile {
  final String clinicId;
  final String tenantId;
  final String nameFa;
  final String locale;
  final String calendarMode;
  final String emergencyPhone;
  final String staffedHoursFa;
  final String? todayJalali;
  final bool? currentlyStaffed;

  const ClinicProfile({
    required this.clinicId,
    required this.tenantId,
    required this.nameFa,
    required this.locale,
    required this.calendarMode,
    required this.emergencyPhone,
    required this.staffedHoursFa,
    this.todayJalali,
    this.currentlyStaffed,
  });

  factory ClinicProfile.fromJson(Map<String, Object?> json) {
    return ClinicProfile(
      clinicId: json['clinicId'] as String,
      tenantId: json['tenantId'] as String,
      nameFa: json['nameFa'] as String,
      locale: json['locale'] as String,
      calendarMode: json['calendarMode'] as String,
      emergencyPhone: json['emergencyPhone'] as String,
      staffedHoursFa: json['staffedHoursFa'] as String,
      todayJalali: json['todayJalali'] as String?,
      currentlyStaffed: json['currentlyStaffed'] as bool?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'clinicId': clinicId,
      'tenantId': tenantId,
      'nameFa': nameFa,
      'locale': locale,
      'calendarMode': calendarMode,
      'emergencyPhone': emergencyPhone,
      'staffedHoursFa': staffedHoursFa,
      'todayJalali': todayJalali,
      'currentlyStaffed': currentlyStaffed,
    };
  }
}

class StaffStepUpRequest {
  final String stepUpCode;

  const StaffStepUpRequest({
    required this.stepUpCode,
  });

  factory StaffStepUpRequest.fromJson(Map<String, Object?> json) {
    return StaffStepUpRequest(
      stepUpCode: json['stepUpCode'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'stepUpCode': stepUpCode,
    };
  }
}

class StaffStepUpResponse {
  final String accessToken;
  final bool stepUpVerified;

  const StaffStepUpResponse({
    required this.accessToken,
    required this.stepUpVerified,
  });

  factory StaffStepUpResponse.fromJson(Map<String, Object?> json) {
    return StaffStepUpResponse(
      accessToken: json['accessToken'] as String,
      stepUpVerified: json['stepUpVerified'] as bool,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'accessToken': accessToken,
      'stepUpVerified': stepUpVerified,
    };
  }
}

class StaffSessionRequest {
  final String oidcToken;
  final String clinicId;
  final String? mfaCode;

  const StaffSessionRequest({
    required this.oidcToken,
    required this.clinicId,
    this.mfaCode,
  });

  factory StaffSessionRequest.fromJson(Map<String, Object?> json) {
    return StaffSessionRequest(
      oidcToken: json['oidcToken'] as String,
      clinicId: json['clinicId'] as String,
      mfaCode: json['mfaCode'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'oidcToken': oidcToken,
      'clinicId': clinicId,
      'mfaCode': mfaCode,
    };
  }
}

class StaffSessionResponse {
  final String accessToken;
  final StaffRole role;
  final bool mfaVerified;
  final String userId;
  final String clinicId;
  final String tenantId;

  const StaffSessionResponse({
    required this.accessToken,
    required this.role,
    required this.mfaVerified,
    required this.userId,
    required this.clinicId,
    required this.tenantId,
  });

  factory StaffSessionResponse.fromJson(Map<String, Object?> json) {
    return StaffSessionResponse(
      accessToken: json['accessToken'] as String,
      role: StaffRole.fromJson(json['role'] as String),
      mfaVerified: json['mfaVerified'] as bool,
      userId: json['userId'] as String,
      clinicId: json['clinicId'] as String,
      tenantId: json['tenantId'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'accessToken': accessToken,
      'role': role.toJson(),
      'mfaVerified': mfaVerified,
      'userId': userId,
      'clinicId': clinicId,
      'tenantId': tenantId,
    };
  }
}

class PatientOtpRequest {
  final String phoneNumber;
  final String clinicId;
  final String? tenantId;

  const PatientOtpRequest({
    required this.phoneNumber,
    required this.clinicId,
    this.tenantId,
  });

  factory PatientOtpRequest.fromJson(Map<String, Object?> json) {
    return PatientOtpRequest(
      phoneNumber: json['phoneNumber'] as String,
      clinicId: json['clinicId'] as String,
      tenantId: json['tenantId'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'phoneNumber': phoneNumber,
      'clinicId': clinicId,
      'tenantId': tenantId,
    };
  }
}

class OtpDispatchResponse {
  final String challengeId;
  final int expiresInSeconds;
  final String maskedPhone;

  const OtpDispatchResponse({
    required this.challengeId,
    required this.expiresInSeconds,
    required this.maskedPhone,
  });

  factory OtpDispatchResponse.fromJson(Map<String, Object?> json) {
    return OtpDispatchResponse(
      challengeId: json['challengeId'] as String,
      expiresInSeconds: (json['expiresInSeconds'] as num).toInt(),
      maskedPhone: json['maskedPhone'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'challengeId': challengeId,
      'expiresInSeconds': expiresInSeconds,
      'maskedPhone': maskedPhone,
    };
  }
}

class PatientOtpVerifyRequest {
  final String challengeId;
  final String otpCode;
  final bool consentAccepted;
  final String consentVersion;
  final String phoneNumber;
  final String? tenantId;

  const PatientOtpVerifyRequest({
    required this.challengeId,
    required this.otpCode,
    required this.consentAccepted,
    required this.consentVersion,
    required this.phoneNumber,
    this.tenantId,
  });

  factory PatientOtpVerifyRequest.fromJson(Map<String, Object?> json) {
    return PatientOtpVerifyRequest(
      challengeId: json['challengeId'] as String,
      otpCode: json['otpCode'] as String,
      consentAccepted: json['consentAccepted'] as bool,
      consentVersion: json['consentVersion'] as String,
      phoneNumber: json['phoneNumber'] as String,
      tenantId: json['tenantId'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'challengeId': challengeId,
      'otpCode': otpCode,
      'consentAccepted': consentAccepted,
      'consentVersion': consentVersion,
      'phoneNumber': phoneNumber,
      'tenantId': tenantId,
    };
  }
}

class PatientSessionResponse {
  final String accessToken;
  final String patientId;
  final String tenantId;
  final String? clinicId;
  final String locale;
  final String calendarMode;

  const PatientSessionResponse({
    required this.accessToken,
    required this.patientId,
    required this.tenantId,
    this.clinicId,
    required this.locale,
    required this.calendarMode,
  });

  factory PatientSessionResponse.fromJson(Map<String, Object?> json) {
    return PatientSessionResponse(
      accessToken: json['accessToken'] as String,
      patientId: json['patientId'] as String,
      tenantId: json['tenantId'] as String,
      clinicId: json['clinicId'] as String?,
      locale: json['locale'] as String,
      calendarMode: json['calendarMode'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'accessToken': accessToken,
      'patientId': patientId,
      'tenantId': tenantId,
      'clinicId': clinicId,
      'locale': locale,
      'calendarMode': calendarMode,
    };
  }
}

class CaregiverOtpVerifyRequest {
  final String challengeId;
  final String otpCode;
  final String? tenantId;
  final String? patientId;

  const CaregiverOtpVerifyRequest({
    required this.challengeId,
    required this.otpCode,
    this.tenantId,
    this.patientId,
  });

  factory CaregiverOtpVerifyRequest.fromJson(Map<String, Object?> json) {
    return CaregiverOtpVerifyRequest(
      challengeId: json['challengeId'] as String,
      otpCode: json['otpCode'] as String,
      tenantId: json['tenantId'] as String?,
      patientId: json['patientId'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'challengeId': challengeId,
      'otpCode': otpCode,
      'tenantId': tenantId,
      'patientId': patientId,
    };
  }
}

class CaregiverPatientLink {
  final String grantId;
  final String patientId;
  final String patientNameFa;
  final String relationshipFa;
  final List<String> scopes;
  final String clinicId;
  final bool active;
  final String createdAt;

  const CaregiverPatientLink({
    required this.grantId,
    required this.patientId,
    required this.patientNameFa,
    required this.relationshipFa,
    required this.scopes,
    required this.clinicId,
    required this.active,
    required this.createdAt,
  });

  factory CaregiverPatientLink.fromJson(Map<String, Object?> json) {
    return CaregiverPatientLink(
      grantId: json['grantId'] as String,
      patientId: json['patientId'] as String,
      patientNameFa: json['patientNameFa'] as String,
      relationshipFa: json['relationshipFa'] as String,
      scopes: (json['scopes'] as List<Object?>).map((e) => e as String).toList(),
      clinicId: json['clinicId'] as String,
      active: json['active'] as bool,
      createdAt: json['createdAt'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'grantId': grantId,
      'patientId': patientId,
      'patientNameFa': patientNameFa,
      'relationshipFa': relationshipFa,
      'scopes': scopes,
      'clinicId': clinicId,
      'active': active,
      'createdAt': createdAt,
    };
  }
}

class CaregiverSessionResponse {
  final String accessToken;
  final String grantId;
  final String patientId;
  final String tenantId;
  final String clinicId;
  final String locale;
  final String calendarMode;
  final List<CaregiverPatientLink> patients;

  const CaregiverSessionResponse({
    required this.accessToken,
    required this.grantId,
    required this.patientId,
    required this.tenantId,
    required this.clinicId,
    required this.locale,
    required this.calendarMode,
    required this.patients,
  });

  factory CaregiverSessionResponse.fromJson(Map<String, Object?> json) {
    return CaregiverSessionResponse(
      accessToken: json['accessToken'] as String,
      grantId: json['grantId'] as String,
      patientId: json['patientId'] as String,
      tenantId: json['tenantId'] as String,
      clinicId: json['clinicId'] as String,
      locale: json['locale'] as String,
      calendarMode: json['calendarMode'] as String,
      patients: (json['patients'] as List<Object?>).map((e) => CaregiverPatientLink.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'accessToken': accessToken,
      'grantId': grantId,
      'patientId': patientId,
      'tenantId': tenantId,
      'clinicId': clinicId,
      'locale': locale,
      'calendarMode': calendarMode,
      'patients': patients.map((e) => e.toJson()).toList(),
    };
  }
}

class CaregiverPatientListResponse {
  final List<CaregiverPatientLink> items;

  const CaregiverPatientListResponse({
    required this.items,
  });

  factory CaregiverPatientListResponse.fromJson(Map<String, Object?> json) {
    return CaregiverPatientListResponse(
      items: (json['items'] as List<Object?>).map((e) => CaregiverPatientLink.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
    };
  }
}

class CaregiverGrantListResponse {
  final List<CaregiverGrant> items;

  const CaregiverGrantListResponse({
    required this.items,
  });

  factory CaregiverGrantListResponse.fromJson(Map<String, Object?> json) {
    return CaregiverGrantListResponse(
      items: (json['items'] as List<Object?>).map((e) => CaregiverGrant.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
    };
  }
}

class ConsentRecord {
  final String consentId;
  final String consentVersion;
  final String locale;
  final String acceptedAt;

  const ConsentRecord({
    required this.consentId,
    required this.consentVersion,
    required this.locale,
    required this.acceptedAt,
  });

  factory ConsentRecord.fromJson(Map<String, Object?> json) {
    return ConsentRecord(
      consentId: json['consentId'] as String,
      consentVersion: json['consentVersion'] as String,
      locale: json['locale'] as String,
      acceptedAt: json['acceptedAt'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'consentId': consentId,
      'consentVersion': consentVersion,
      'locale': locale,
      'acceptedAt': acceptedAt,
    };
  }
}

class PatientProfileResponse {
  final String patientId;
  final String tenantId;
  final String clinicId;
  final String fullNameFa;
  final String phoneMasked;
  final String preferredLocale;
  final AccessMode accessMode;
  final List<ConsentRecord> consents;

  const PatientProfileResponse({
    required this.patientId,
    required this.tenantId,
    required this.clinicId,
    required this.fullNameFa,
    required this.phoneMasked,
    required this.preferredLocale,
    required this.accessMode,
    required this.consents,
  });

  factory PatientProfileResponse.fromJson(Map<String, Object?> json) {
    return PatientProfileResponse(
      patientId: json['patientId'] as String,
      tenantId: json['tenantId'] as String,
      clinicId: json['clinicId'] as String,
      fullNameFa: json['fullNameFa'] as String,
      phoneMasked: json['phoneMasked'] as String,
      preferredLocale: json['preferredLocale'] as String,
      accessMode: AccessMode.fromJson(json['accessMode'] as String),
      consents: (json['consents'] as List<Object?>).map((e) => ConsentRecord.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'patientId': patientId,
      'tenantId': tenantId,
      'clinicId': clinicId,
      'fullNameFa': fullNameFa,
      'phoneMasked': phoneMasked,
      'preferredLocale': preferredLocale,
      'accessMode': accessMode.toJson(),
      'consents': consents.map((e) => e.toJson()).toList(),
    };
  }
}

class CaregiverGrantRequest {
  final String caregiverPhone;
  final String relationshipFa;
  final List<String> scopes;

  const CaregiverGrantRequest({
    required this.caregiverPhone,
    required this.relationshipFa,
    required this.scopes,
  });

  factory CaregiverGrantRequest.fromJson(Map<String, Object?> json) {
    return CaregiverGrantRequest(
      caregiverPhone: json['caregiverPhone'] as String,
      relationshipFa: json['relationshipFa'] as String,
      scopes: (json['scopes'] as List<Object?>).map((e) => e as String).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'caregiverPhone': caregiverPhone,
      'relationshipFa': relationshipFa,
      'scopes': scopes,
    };
  }
}

class CaregiverGrant {
  final String grantId;
  final String patientId;
  final String caregiverPhone;
  final String relationshipFa;
  final List<String> scopes;
  final bool active;
  final String createdAt;

  const CaregiverGrant({
    required this.grantId,
    required this.patientId,
    required this.caregiverPhone,
    required this.relationshipFa,
    required this.scopes,
    required this.active,
    required this.createdAt,
  });

  factory CaregiverGrant.fromJson(Map<String, Object?> json) {
    return CaregiverGrant(
      grantId: json['grantId'] as String,
      patientId: json['patientId'] as String,
      caregiverPhone: json['caregiverPhone'] as String,
      relationshipFa: json['relationshipFa'] as String,
      scopes: (json['scopes'] as List<Object?>).map((e) => e as String).toList(),
      active: json['active'] as bool,
      createdAt: json['createdAt'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'grantId': grantId,
      'patientId': patientId,
      'caregiverPhone': caregiverPhone,
      'relationshipFa': relationshipFa,
      'scopes': scopes,
      'active': active,
      'createdAt': createdAt,
    };
  }
}

class CreateEpisodeRequest {
  final String patientId;
  final String protocolType;
  final EyeLaterality eyeLaterality;
  final String surgeonId;
  final AccessMode accessMode;
  final String anchorAt;

  const CreateEpisodeRequest({
    required this.patientId,
    required this.protocolType,
    required this.eyeLaterality,
    required this.surgeonId,
    required this.accessMode,
    required this.anchorAt,
  });

  factory CreateEpisodeRequest.fromJson(Map<String, Object?> json) {
    return CreateEpisodeRequest(
      patientId: json['patientId'] as String,
      protocolType: json['protocolType'] as String,
      eyeLaterality: EyeLaterality.fromJson(json['eyeLaterality'] as String),
      surgeonId: json['surgeonId'] as String,
      accessMode: AccessMode.fromJson(json['accessMode'] as String),
      anchorAt: json['anchorAt'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'patientId': patientId,
      'protocolType': protocolType,
      'eyeLaterality': eyeLaterality.toJson(),
      'surgeonId': surgeonId,
      'accessMode': accessMode.toJson(),
      'anchorAt': anchorAt,
    };
  }
}

class CareEpisode {
  final String episodeId;
  final String tenantId;
  final String patientId;
  final String protocolType;
  final EyeLaterality eyeLaterality;
  final String eyeLabelFa;
  final AccessMode accessMode;
  final int activePrescriptionVersion;
  final String status;
  final String anchorAt;

  const CareEpisode({
    required this.episodeId,
    required this.tenantId,
    required this.patientId,
    required this.protocolType,
    required this.eyeLaterality,
    required this.eyeLabelFa,
    required this.accessMode,
    required this.activePrescriptionVersion,
    required this.status,
    required this.anchorAt,
  });

  factory CareEpisode.fromJson(Map<String, Object?> json) {
    return CareEpisode(
      episodeId: json['episodeId'] as String,
      tenantId: json['tenantId'] as String,
      patientId: json['patientId'] as String,
      protocolType: json['protocolType'] as String,
      eyeLaterality: EyeLaterality.fromJson(json['eyeLaterality'] as String),
      eyeLabelFa: json['eyeLabelFa'] as String,
      accessMode: AccessMode.fromJson(json['accessMode'] as String),
      activePrescriptionVersion: (json['activePrescriptionVersion'] as num).toInt(),
      status: json['status'] as String,
      anchorAt: json['anchorAt'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'episodeId': episodeId,
      'tenantId': tenantId,
      'patientId': patientId,
      'protocolType': protocolType,
      'eyeLaterality': eyeLaterality.toJson(),
      'eyeLabelFa': eyeLabelFa,
      'accessMode': accessMode.toJson(),
      'activePrescriptionVersion': activePrescriptionVersion,
      'status': status,
      'anchorAt': anchorAt,
    };
  }
}

class DropItemInput {
  final String drugNameFa;
  final String genericName;
  final String bottleCapColorFa;
  final int frequencyPerDay;
  final int durationDays;
  final String? instructionsFa;

  const DropItemInput({
    required this.drugNameFa,
    required this.genericName,
    required this.bottleCapColorFa,
    required this.frequencyPerDay,
    required this.durationDays,
    this.instructionsFa,
  });

  factory DropItemInput.fromJson(Map<String, Object?> json) {
    return DropItemInput(
      drugNameFa: json['drugNameFa'] as String,
      genericName: json['genericName'] as String,
      bottleCapColorFa: json['bottleCapColorFa'] as String,
      frequencyPerDay: (json['frequencyPerDay'] as num).toInt(),
      durationDays: (json['durationDays'] as num).toInt(),
      instructionsFa: json['instructionsFa'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'drugNameFa': drugNameFa,
      'genericName': genericName,
      'bottleCapColorFa': bottleCapColorFa,
      'frequencyPerDay': frequencyPerDay,
      'durationDays': durationDays,
      'instructionsFa': instructionsFa,
    };
  }
}

class PublishPrescriptionRequest {
  final EyeLaterality eyeLaterality;
  final List<DropItemInput> items;
  final String reasonFa;

  const PublishPrescriptionRequest({
    required this.eyeLaterality,
    required this.items,
    required this.reasonFa,
  });

  factory PublishPrescriptionRequest.fromJson(Map<String, Object?> json) {
    return PublishPrescriptionRequest(
      eyeLaterality: EyeLaterality.fromJson(json['eyeLaterality'] as String),
      items: (json['items'] as List<Object?>).map((e) => DropItemInput.fromJson(e as Map<String, Object?>)).toList(),
      reasonFa: json['reasonFa'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'eyeLaterality': eyeLaterality.toJson(),
      'items': items.map((e) => e.toJson()).toList(),
      'reasonFa': reasonFa,
    };
  }
}

class PrescriptionVersion {
  final String prescriptionId;
  final String episodeId;
  final int version;
  final EyeLaterality eyeLaterality;
  final String eyeLabelFa;
  final List<DropItemInput> items;
  final String publishedAt;

  const PrescriptionVersion({
    required this.prescriptionId,
    required this.episodeId,
    required this.version,
    required this.eyeLaterality,
    required this.eyeLabelFa,
    required this.items,
    required this.publishedAt,
  });

  factory PrescriptionVersion.fromJson(Map<String, Object?> json) {
    return PrescriptionVersion(
      prescriptionId: json['prescriptionId'] as String,
      episodeId: json['episodeId'] as String,
      version: (json['version'] as num).toInt(),
      eyeLaterality: EyeLaterality.fromJson(json['eyeLaterality'] as String),
      eyeLabelFa: json['eyeLabelFa'] as String,
      items: (json['items'] as List<Object?>).map((e) => DropItemInput.fromJson(e as Map<String, Object?>)).toList(),
      publishedAt: json['publishedAt'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'prescriptionId': prescriptionId,
      'episodeId': episodeId,
      'version': version,
      'eyeLaterality': eyeLaterality.toJson(),
      'eyeLabelFa': eyeLabelFa,
      'items': items.map((e) => e.toJson()).toList(),
      'publishedAt': publishedAt,
    };
  }
}

class PatientTodayDropCard {
  final String episodeId;
  final int prescriptionVersion;
  final EyeLaterality eyeLaterality;
  final String eyeLabelFa;
  final String drugNameFa;
  final String bottleCapColorFa;
  final String scheduledTimeJalali;
  final String instructionsFa;
  final bool taken;

  const PatientTodayDropCard({
    required this.episodeId,
    required this.prescriptionVersion,
    required this.eyeLaterality,
    required this.eyeLabelFa,
    required this.drugNameFa,
    required this.bottleCapColorFa,
    required this.scheduledTimeJalali,
    required this.instructionsFa,
    required this.taken,
  });

  factory PatientTodayDropCard.fromJson(Map<String, Object?> json) {
    return PatientTodayDropCard(
      episodeId: json['episodeId'] as String,
      prescriptionVersion: (json['prescriptionVersion'] as num).toInt(),
      eyeLaterality: EyeLaterality.fromJson(json['eyeLaterality'] as String),
      eyeLabelFa: json['eyeLabelFa'] as String,
      drugNameFa: json['drugNameFa'] as String,
      bottleCapColorFa: json['bottleCapColorFa'] as String,
      scheduledTimeJalali: json['scheduledTimeJalali'] as String,
      instructionsFa: json['instructionsFa'] as String,
      taken: json['taken'] as bool,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'episodeId': episodeId,
      'prescriptionVersion': prescriptionVersion,
      'eyeLaterality': eyeLaterality.toJson(),
      'eyeLabelFa': eyeLabelFa,
      'drugNameFa': drugNameFa,
      'bottleCapColorFa': bottleCapColorFa,
      'scheduledTimeJalali': scheduledTimeJalali,
      'instructionsFa': instructionsFa,
      'taken': taken,
    };
  }
}

class PatientTodayResponse {
  final String todayJalali;
  final String emergencyHotlinePhone;
  final String clinicStaffedHoursFa;
  final List<PatientTodayDropCard> scheduleItems;

  const PatientTodayResponse({
    required this.todayJalali,
    required this.emergencyHotlinePhone,
    required this.clinicStaffedHoursFa,
    required this.scheduleItems,
  });

  factory PatientTodayResponse.fromJson(Map<String, Object?> json) {
    return PatientTodayResponse(
      todayJalali: json['todayJalali'] as String,
      emergencyHotlinePhone: json['emergencyHotlinePhone'] as String,
      clinicStaffedHoursFa: json['clinicStaffedHoursFa'] as String,
      scheduleItems: (json['scheduleItems'] as List<Object?>).map((e) => PatientTodayDropCard.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'todayJalali': todayJalali,
      'emergencyHotlinePhone': emergencyHotlinePhone,
      'clinicStaffedHoursFa': clinicStaffedHoursFa,
      'scheduleItems': scheduleItems.map((e) => e.toJson()).toList(),
    };
  }
}

class AdherenceEventRequest {
  final EyeLaterality eyeLaterality;
  final int prescriptionVersion;
  final AdherenceState state;
  final String? reasonFa;
  final String occurredAt;

  const AdherenceEventRequest({
    required this.eyeLaterality,
    required this.prescriptionVersion,
    required this.state,
    this.reasonFa,
    required this.occurredAt,
  });

  factory AdherenceEventRequest.fromJson(Map<String, Object?> json) {
    return AdherenceEventRequest(
      eyeLaterality: EyeLaterality.fromJson(json['eyeLaterality'] as String),
      prescriptionVersion: (json['prescriptionVersion'] as num).toInt(),
      state: AdherenceState.fromJson(json['state'] as String),
      reasonFa: json['reasonFa'] as String?,
      occurredAt: json['occurredAt'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'eyeLaterality': eyeLaterality.toJson(),
      'prescriptionVersion': prescriptionVersion,
      'state': state.toJson(),
      'reasonFa': reasonFa,
      'occurredAt': occurredAt,
    };
  }
}

class AdherenceEventResponse {
  final String eventId;
  final String episodeId;
  final AdherenceState state;
  final bool deduplicated;
  final String recordedAt;

  const AdherenceEventResponse({
    required this.eventId,
    required this.episodeId,
    required this.state,
    required this.deduplicated,
    required this.recordedAt,
  });

  factory AdherenceEventResponse.fromJson(Map<String, Object?> json) {
    return AdherenceEventResponse(
      eventId: json['eventId'] as String,
      episodeId: json['episodeId'] as String,
      state: AdherenceState.fromJson(json['state'] as String),
      deduplicated: json['deduplicated'] as bool,
      recordedAt: json['recordedAt'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'eventId': eventId,
      'episodeId': episodeId,
      'state': state.toJson(),
      'deduplicated': deduplicated,
      'recordedAt': recordedAt,
    };
  }
}

class PatientEpisodeWithPrescription {
  final CareEpisode episode;
  final PrescriptionVersion? activePrescription;

  const PatientEpisodeWithPrescription({
    required this.episode,
    this.activePrescription,
  });

  factory PatientEpisodeWithPrescription.fromJson(Map<String, Object?> json) {
    return PatientEpisodeWithPrescription(
      episode: CareEpisode.fromJson(json['episode'] as Map<String, Object?>),
      activePrescription: json['activePrescription'] == null ? null : PrescriptionVersion.fromJson(json['activePrescription'] as Map<String, Object?>),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'episode': episode.toJson(),
      'activePrescription': activePrescription?.toJson(),
    };
  }
}

class PatientEpisodeListResponse {
  final List<PatientEpisodeWithPrescription> items;

  const PatientEpisodeListResponse({
    required this.items,
  });

  factory PatientEpisodeListResponse.fromJson(Map<String, Object?> json) {
    return PatientEpisodeListResponse(
      items: (json['items'] as List<Object?>).map((e) => PatientEpisodeWithPrescription.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
    };
  }
}

class AdherenceEventListResponse {
  final List<AdherenceEventResponse> items;

  const AdherenceEventListResponse({
    required this.items,
  });

  factory AdherenceEventListResponse.fromJson(Map<String, Object?> json) {
    return AdherenceEventListResponse(
      items: (json['items'] as List<Object?>).map((e) => AdherenceEventResponse.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
    };
  }
}

class SymptomReportRequest {
  final EyeLaterality eyeLaterality;
  final bool severePain;
  final bool suddenVisionLoss;
  final bool purulentDischarge;
  final bool? flashesOrCurtain;
  final String freeTextFa;

  const SymptomReportRequest({
    required this.eyeLaterality,
    required this.severePain,
    required this.suddenVisionLoss,
    required this.purulentDischarge,
    this.flashesOrCurtain,
    required this.freeTextFa,
  });

  factory SymptomReportRequest.fromJson(Map<String, Object?> json) {
    return SymptomReportRequest(
      eyeLaterality: EyeLaterality.fromJson(json['eyeLaterality'] as String),
      severePain: json['severePain'] as bool,
      suddenVisionLoss: json['suddenVisionLoss'] as bool,
      purulentDischarge: json['purulentDischarge'] as bool,
      flashesOrCurtain: json['flashesOrCurtain'] as bool?,
      freeTextFa: json['freeTextFa'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'eyeLaterality': eyeLaterality.toJson(),
      'severePain': severePain,
      'suddenVisionLoss': suddenVisionLoss,
      'purulentDischarge': purulentDischarge,
      'flashesOrCurtain': flashesOrCurtain,
      'freeTextFa': freeTextFa,
    };
  }
}

class SymptomReportResponse {
  final String reportId;
  final UrgencyTier urgencyTier;
  final String urgencyLabelFa;
  final String? triggeredTriageCaseId;
  final String guidanceFa;

  const SymptomReportResponse({
    required this.reportId,
    required this.urgencyTier,
    required this.urgencyLabelFa,
    this.triggeredTriageCaseId,
    required this.guidanceFa,
  });

  factory SymptomReportResponse.fromJson(Map<String, Object?> json) {
    return SymptomReportResponse(
      reportId: json['reportId'] as String,
      urgencyTier: UrgencyTier.fromJson(json['urgencyTier'] as String),
      urgencyLabelFa: json['urgencyLabelFa'] as String,
      triggeredTriageCaseId: json['triggeredTriageCaseId'] as String?,
      guidanceFa: json['guidanceFa'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'reportId': reportId,
      'urgencyTier': urgencyTier.toJson(),
      'urgencyLabelFa': urgencyLabelFa,
      'triggeredTriageCaseId': triggeredTriageCaseId,
      'guidanceFa': guidanceFa,
    };
  }
}

class TriageCase {
  final String caseId;
  final String sourcePillar;
  final String patientId;
  final StudyLaterality eyeLaterality;
  final String eyeLabelFa;
  final String status;
  final UrgencyTier urgencyTier;
  final String urgencyLabelFa;
  final String slaDueAt;
  final String? ownerId;

  const TriageCase({
    required this.caseId,
    required this.sourcePillar,
    required this.patientId,
    required this.eyeLaterality,
    required this.eyeLabelFa,
    required this.status,
    required this.urgencyTier,
    required this.urgencyLabelFa,
    required this.slaDueAt,
    this.ownerId,
  });

  factory TriageCase.fromJson(Map<String, Object?> json) {
    return TriageCase(
      caseId: json['caseId'] as String,
      sourcePillar: json['sourcePillar'] as String,
      patientId: json['patientId'] as String,
      eyeLaterality: StudyLaterality.fromJson(json['eyeLaterality'] as String),
      eyeLabelFa: json['eyeLabelFa'] as String,
      status: json['status'] as String,
      urgencyTier: UrgencyTier.fromJson(json['urgencyTier'] as String),
      urgencyLabelFa: json['urgencyLabelFa'] as String,
      slaDueAt: json['slaDueAt'] as String,
      ownerId: json['ownerId'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'caseId': caseId,
      'sourcePillar': sourcePillar,
      'patientId': patientId,
      'eyeLaterality': eyeLaterality.toJson(),
      'eyeLabelFa': eyeLabelFa,
      'status': status,
      'urgencyTier': urgencyTier.toJson(),
      'urgencyLabelFa': urgencyLabelFa,
      'slaDueAt': slaDueAt,
      'ownerId': ownerId,
    };
  }
}

class TriageCaseListResponse {
  final List<TriageCase> items;
  final int total;

  const TriageCaseListResponse({
    required this.items,
    required this.total,
  });

  factory TriageCaseListResponse.fromJson(Map<String, Object?> json) {
    return TriageCaseListResponse(
      items: (json['items'] as List<Object?>).map((e) => TriageCase.fromJson(e as Map<String, Object?>)).toList(),
      total: (json['total'] as num).toInt(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
      'total': total,
    };
  }
}

class ClaimTriageCaseRequest {
  final String? noteFa;

  const ClaimTriageCaseRequest({
    this.noteFa,
  });

  factory ClaimTriageCaseRequest.fromJson(Map<String, Object?> json) {
    return ClaimTriageCaseRequest(
      noteFa: json['noteFa'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'noteFa': noteFa,
    };
  }
}

class ShiftHandoffRequest {
  final String targetStaffUserId;
  final String handoffNoteFa;

  const ShiftHandoffRequest({
    required this.targetStaffUserId,
    required this.handoffNoteFa,
  });

  factory ShiftHandoffRequest.fromJson(Map<String, Object?> json) {
    return ShiftHandoffRequest(
      targetStaffUserId: json['targetStaffUserId'] as String,
      handoffNoteFa: json['handoffNoteFa'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'targetStaffUserId': targetStaffUserId,
      'handoffNoteFa': handoffNoteFa,
    };
  }
}

class ReferralRequest {
  final String destinationHospitalFa;
  final String reasonFa;
  final bool urgent;

  const ReferralRequest({
    required this.destinationHospitalFa,
    required this.reasonFa,
    required this.urgent,
  });

  factory ReferralRequest.fromJson(Map<String, Object?> json) {
    return ReferralRequest(
      destinationHospitalFa: json['destinationHospitalFa'] as String,
      reasonFa: json['reasonFa'] as String,
      urgent: json['urgent'] as bool,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'destinationHospitalFa': destinationHospitalFa,
      'reasonFa': reasonFa,
      'urgent': urgent,
    };
  }
}

class ReferralRecord {
  final String referralId;
  final String caseId;
  final String destinationHospitalFa;
  final String status;
  final String createdAt;

  const ReferralRecord({
    required this.referralId,
    required this.caseId,
    required this.destinationHospitalFa,
    required this.status,
    required this.createdAt,
  });

  factory ReferralRecord.fromJson(Map<String, Object?> json) {
    return ReferralRecord(
      referralId: json['referralId'] as String,
      caseId: json['caseId'] as String,
      destinationHospitalFa: json['destinationHospitalFa'] as String,
      status: json['status'] as String,
      createdAt: json['createdAt'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'referralId': referralId,
      'caseId': caseId,
      'destinationHospitalFa': destinationHospitalFa,
      'status': status,
      'createdAt': createdAt,
    };
  }
}

class StudyAssetInput {
  final String assetId;
  final String s3ObjectKey;
  final DiagnosticModality declaredModality;
  final EyeLaterality declaredEye;
  final String? dicomStudyUid;
  final double? blurScoreHint;
  final double? lightingScoreHint;
  final String? detectedEyeHint;
  final List<String>? conditionHints;

  const StudyAssetInput({
    required this.assetId,
    required this.s3ObjectKey,
    required this.declaredModality,
    required this.declaredEye,
    this.dicomStudyUid,
    this.blurScoreHint,
    this.lightingScoreHint,
    this.detectedEyeHint,
    this.conditionHints,
  });

  factory StudyAssetInput.fromJson(Map<String, Object?> json) {
    return StudyAssetInput(
      assetId: json['assetId'] as String,
      s3ObjectKey: json['s3ObjectKey'] as String,
      declaredModality: DiagnosticModality.fromJson(json['declaredModality'] as String),
      declaredEye: EyeLaterality.fromJson(json['declaredEye'] as String),
      dicomStudyUid: json['dicomStudyUid'] as String?,
      blurScoreHint: (json['blurScoreHint'] as num?)?.toDouble(),
      lightingScoreHint: (json['lightingScoreHint'] as num?)?.toDouble(),
      detectedEyeHint: json['detectedEyeHint'] as String?,
      conditionHints: json['conditionHints'] == null ? null : (json['conditionHints'] as List<Object?>).map((e) => e as String).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'assetId': assetId,
      's3ObjectKey': s3ObjectKey,
      'declaredModality': declaredModality.toJson(),
      'declaredEye': declaredEye.toJson(),
      'dicomStudyUid': dicomStudyUid,
      'blurScoreHint': blurScoreHint,
      'lightingScoreHint': lightingScoreHint,
      'detectedEyeHint': detectedEyeHint,
      'conditionHints': conditionHints,
    };
  }
}

class ClinicalLabsInput {
  final int? ageYears;
  final double? hba1cPercent;
  final double? iopMmHg;
  final double? centralCornealThicknessUm;
  final int? diabetesDurationYears;
  final int? systolicBpMmHg;
  final double? kmaxDiopters;
  final double? thinnestPachymetryUm;
  final double? vfMdDb;
  final double? vfMdSlopeDbPerYear;
  final String? clinicalNotesFa;

  const ClinicalLabsInput({
    this.ageYears,
    this.hba1cPercent,
    this.iopMmHg,
    this.centralCornealThicknessUm,
    this.diabetesDurationYears,
    this.systolicBpMmHg,
    this.kmaxDiopters,
    this.thinnestPachymetryUm,
    this.vfMdDb,
    this.vfMdSlopeDbPerYear,
    this.clinicalNotesFa,
  });

  factory ClinicalLabsInput.fromJson(Map<String, Object?> json) {
    return ClinicalLabsInput(
      ageYears: (json['ageYears'] as num?)?.toInt(),
      hba1cPercent: (json['hba1cPercent'] as num?)?.toDouble(),
      iopMmHg: (json['iopMmHg'] as num?)?.toDouble(),
      centralCornealThicknessUm: (json['centralCornealThicknessUm'] as num?)?.toDouble(),
      diabetesDurationYears: (json['diabetesDurationYears'] as num?)?.toInt(),
      systolicBpMmHg: (json['systolicBpMmHg'] as num?)?.toInt(),
      kmaxDiopters: (json['kmaxDiopters'] as num?)?.toDouble(),
      thinnestPachymetryUm: (json['thinnestPachymetryUm'] as num?)?.toDouble(),
      vfMdDb: (json['vfMdDb'] as num?)?.toDouble(),
      vfMdSlopeDbPerYear: (json['vfMdSlopeDbPerYear'] as num?)?.toDouble(),
      clinicalNotesFa: json['clinicalNotesFa'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'ageYears': ageYears,
      'hba1cPercent': hba1cPercent,
      'iopMmHg': iopMmHg,
      'centralCornealThicknessUm': centralCornealThicknessUm,
      'diabetesDurationYears': diabetesDurationYears,
      'systolicBpMmHg': systolicBpMmHg,
      'kmaxDiopters': kmaxDiopters,
      'thinnestPachymetryUm': thinnestPachymetryUm,
      'vfMdDb': vfMdDb,
      'vfMdSlopeDbPerYear': vfMdSlopeDbPerYear,
      'clinicalNotesFa': clinicalNotesFa,
    };
  }
}

class SubmitDiagnosticStudyRequest {
  final String patientId;
  final String clinicId;
  final StudyLaterality eyeLaterality;
  final List<StudyAssetInput> assets;
  final ClinicalLabsInput? labs;

  const SubmitDiagnosticStudyRequest({
    required this.patientId,
    required this.clinicId,
    required this.eyeLaterality,
    required this.assets,
    this.labs,
  });

  factory SubmitDiagnosticStudyRequest.fromJson(Map<String, Object?> json) {
    return SubmitDiagnosticStudyRequest(
      patientId: json['patientId'] as String,
      clinicId: json['clinicId'] as String,
      eyeLaterality: StudyLaterality.fromJson(json['eyeLaterality'] as String),
      assets: (json['assets'] as List<Object?>).map((e) => StudyAssetInput.fromJson(e as Map<String, Object?>)).toList(),
      labs: json['labs'] == null ? null : ClinicalLabsInput.fromJson(json['labs'] as Map<String, Object?>),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'patientId': patientId,
      'clinicId': clinicId,
      'eyeLaterality': eyeLaterality.toJson(),
      'assets': assets.map((e) => e.toJson()).toList(),
      'labs': labs?.toJson(),
    };
  }
}

class SubmitDiagnosticStudyResponse {
  final String studyId;
  final String jobId;
  final StudyStatus status;
  final String acceptedAt;

  const SubmitDiagnosticStudyResponse({
    required this.studyId,
    required this.jobId,
    required this.status,
    required this.acceptedAt,
  });

  factory SubmitDiagnosticStudyResponse.fromJson(Map<String, Object?> json) {
    return SubmitDiagnosticStudyResponse(
      studyId: json['studyId'] as String,
      jobId: json['jobId'] as String,
      status: StudyStatus.fromJson(json['status'] as String),
      acceptedAt: json['acceptedAt'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'studyId': studyId,
      'jobId': jobId,
      'status': status.toJson(),
      'acceptedAt': acceptedAt,
    };
  }
}

class ModalityPrediction {
  final String assetId;
  final DiagnosticModality declaredModality;
  final DiagnosticModality detectedModality;
  final double confidence;
  final bool matchesDeclared;

  const ModalityPrediction({
    required this.assetId,
    required this.declaredModality,
    required this.detectedModality,
    required this.confidence,
    required this.matchesDeclared,
  });

  factory ModalityPrediction.fromJson(Map<String, Object?> json) {
    return ModalityPrediction(
      assetId: json['assetId'] as String,
      declaredModality: DiagnosticModality.fromJson(json['declaredModality'] as String),
      detectedModality: DiagnosticModality.fromJson(json['detectedModality'] as String),
      confidence: (json['confidence'] as num).toDouble(),
      matchesDeclared: json['matchesDeclared'] as bool,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'assetId': assetId,
      'declaredModality': declaredModality.toJson(),
      'detectedModality': detectedModality.toJson(),
      'confidence': confidence,
      'matchesDeclared': matchesDeclared,
    };
  }
}

class QcDecision {
  final String assetId;
  final ModalityPrediction modalityPrediction;
  final bool passed;
  final List<QcRejectionCode> rejectionCodes;
  final List<String> rejectionReasonsFa;
  final String? recaptureInstructionFa;

  const QcDecision({
    required this.assetId,
    required this.modalityPrediction,
    required this.passed,
    required this.rejectionCodes,
    required this.rejectionReasonsFa,
    this.recaptureInstructionFa,
  });

  factory QcDecision.fromJson(Map<String, Object?> json) {
    return QcDecision(
      assetId: json['assetId'] as String,
      modalityPrediction: ModalityPrediction.fromJson(json['modalityPrediction'] as Map<String, Object?>),
      passed: json['passed'] as bool,
      rejectionCodes: (json['rejectionCodes'] as List<Object?>).map((e) => QcRejectionCode.fromJson(e as String)).toList(),
      rejectionReasonsFa: (json['rejectionReasonsFa'] as List<Object?>).map((e) => e as String).toList(),
      recaptureInstructionFa: json['recaptureInstructionFa'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'assetId': assetId,
      'modalityPrediction': modalityPrediction.toJson(),
      'passed': passed,
      'rejectionCodes': rejectionCodes.map((e) => e.toJson()).toList(),
      'rejectionReasonsFa': rejectionReasonsFa,
      'recaptureInstructionFa': recaptureInstructionFa,
    };
  }
}

class SpecialistOutput {
  final String specialistId;
  final String backboneId;
  final EyeLaterality eyeLaterality;
  final Map<String, double> probabilities;
  final Map<String, double> biomarkers;
  final String summaryFa;

  const SpecialistOutput({
    required this.specialistId,
    required this.backboneId,
    required this.eyeLaterality,
    required this.probabilities,
    required this.biomarkers,
    required this.summaryFa,
  });

  factory SpecialistOutput.fromJson(Map<String, Object?> json) {
    return SpecialistOutput(
      specialistId: json['specialistId'] as String,
      backboneId: json['backboneId'] as String,
      eyeLaterality: EyeLaterality.fromJson(json['eyeLaterality'] as String),
      probabilities: (json['probabilities'] as Map<String, Object?>).map((k, v) => MapEntry(k, (v as num).toDouble())),
      biomarkers: (json['biomarkers'] as Map<String, Object?>).map((k, v) => MapEntry(k, (v as num).toDouble())),
      summaryFa: json['summaryFa'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'specialistId': specialistId,
      'backboneId': backboneId,
      'eyeLaterality': eyeLaterality.toJson(),
      'probabilities': probabilities,
      'biomarkers': biomarkers,
      'summaryFa': summaryFa,
    };
  }
}

class DifferentialItem {
  final String conditionCode;
  final String conditionNameFa;
  final double confidence;
  final double confidenceIntervalLower;
  final double confidenceIntervalUpper;
  final SeverityGrade severity;
  final List<DiagnosticModality> supportingModalities;

  const DifferentialItem({
    required this.conditionCode,
    required this.conditionNameFa,
    required this.confidence,
    required this.confidenceIntervalLower,
    required this.confidenceIntervalUpper,
    required this.severity,
    required this.supportingModalities,
  });

  factory DifferentialItem.fromJson(Map<String, Object?> json) {
    return DifferentialItem(
      conditionCode: json['conditionCode'] as String,
      conditionNameFa: json['conditionNameFa'] as String,
      confidence: (json['confidence'] as num).toDouble(),
      confidenceIntervalLower: (json['confidenceIntervalLower'] as num).toDouble(),
      confidenceIntervalUpper: (json['confidenceIntervalUpper'] as num).toDouble(),
      severity: SeverityGrade.fromJson(json['severity'] as String),
      supportingModalities: (json['supportingModalities'] as List<Object?>).map((e) => DiagnosticModality.fromJson(e as String)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'conditionCode': conditionCode,
      'conditionNameFa': conditionNameFa,
      'confidence': confidence,
      'confidenceIntervalLower': confidenceIntervalLower,
      'confidenceIntervalUpper': confidenceIntervalUpper,
      'severity': severity.toJson(),
      'supportingModalities': supportingModalities.map((e) => e.toJson()).toList(),
    };
  }
}

class FusionResult {
  final EyeLaterality eyeLaterality;
  final List<DiagnosticModality> availableModalities;
  final List<DiagnosticModality> missingModalities;
  final String missingModalityNoticeFa;
  final List<DifferentialItem> differential;
  final List<String> discordanceFlagsFa;
  final UrgencyTier recommendedUrgency;
  final String recommendedUrgencyLabelFa;

  const FusionResult({
    required this.eyeLaterality,
    required this.availableModalities,
    required this.missingModalities,
    required this.missingModalityNoticeFa,
    required this.differential,
    required this.discordanceFlagsFa,
    required this.recommendedUrgency,
    required this.recommendedUrgencyLabelFa,
  });

  factory FusionResult.fromJson(Map<String, Object?> json) {
    return FusionResult(
      eyeLaterality: EyeLaterality.fromJson(json['eyeLaterality'] as String),
      availableModalities: (json['availableModalities'] as List<Object?>).map((e) => DiagnosticModality.fromJson(e as String)).toList(),
      missingModalities: (json['missingModalities'] as List<Object?>).map((e) => DiagnosticModality.fromJson(e as String)).toList(),
      missingModalityNoticeFa: json['missingModalityNoticeFa'] as String,
      differential: (json['differential'] as List<Object?>).map((e) => DifferentialItem.fromJson(e as Map<String, Object?>)).toList(),
      discordanceFlagsFa: (json['discordanceFlagsFa'] as List<Object?>).map((e) => e as String).toList(),
      recommendedUrgency: UrgencyTier.fromJson(json['recommendedUrgency'] as String),
      recommendedUrgencyLabelFa: json['recommendedUrgencyLabelFa'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'eyeLaterality': eyeLaterality.toJson(),
      'availableModalities': availableModalities.map((e) => e.toJson()).toList(),
      'missingModalities': missingModalities.map((e) => e.toJson()).toList(),
      'missingModalityNoticeFa': missingModalityNoticeFa,
      'differential': differential.map((e) => e.toJson()).toList(),
      'discordanceFlagsFa': discordanceFlagsFa,
      'recommendedUrgency': recommendedUrgency.toJson(),
      'recommendedUrgencyLabelFa': recommendedUrgencyLabelFa,
    };
  }
}

class SegmentationMaskOverlay {
  final String overlayId;
  final String assetId;
  final String anatomicalStructureFa;
  final String maskS3Key;
  final String quantitativeMetricName;
  final double quantitativeValue;
  final String quantitativeUnit;
  final bool isPrimaryExplainability;

  const SegmentationMaskOverlay({
    required this.overlayId,
    required this.assetId,
    required this.anatomicalStructureFa,
    required this.maskS3Key,
    required this.quantitativeMetricName,
    required this.quantitativeValue,
    required this.quantitativeUnit,
    required this.isPrimaryExplainability,
  });

  factory SegmentationMaskOverlay.fromJson(Map<String, Object?> json) {
    return SegmentationMaskOverlay(
      overlayId: json['overlayId'] as String,
      assetId: json['assetId'] as String,
      anatomicalStructureFa: json['anatomicalStructureFa'] as String,
      maskS3Key: json['maskS3Key'] as String,
      quantitativeMetricName: json['quantitativeMetricName'] as String,
      quantitativeValue: (json['quantitativeValue'] as num).toDouble(),
      quantitativeUnit: json['quantitativeUnit'] as String,
      isPrimaryExplainability: json['isPrimaryExplainability'] as bool,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'overlayId': overlayId,
      'assetId': assetId,
      'anatomicalStructureFa': anatomicalStructureFa,
      'maskS3Key': maskS3Key,
      'quantitativeMetricName': quantitativeMetricName,
      'quantitativeValue': quantitativeValue,
      'quantitativeUnit': quantitativeUnit,
      'isPrimaryExplainability': isPrimaryExplainability,
    };
  }
}

class AuxiliaryGradCamOverlay {
  final String overlayId;
  final String assetId;
  final String targetConditionCode;
  final String heatmapS3Key;
  final bool isAuxiliaryOnly;
  final String warningFa;

  const AuxiliaryGradCamOverlay({
    required this.overlayId,
    required this.assetId,
    required this.targetConditionCode,
    required this.heatmapS3Key,
    required this.isAuxiliaryOnly,
    required this.warningFa,
  });

  factory AuxiliaryGradCamOverlay.fromJson(Map<String, Object?> json) {
    return AuxiliaryGradCamOverlay(
      overlayId: json['overlayId'] as String,
      assetId: json['assetId'] as String,
      targetConditionCode: json['targetConditionCode'] as String,
      heatmapS3Key: json['heatmapS3Key'] as String,
      isAuxiliaryOnly: json['isAuxiliaryOnly'] as bool,
      warningFa: json['warningFa'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'overlayId': overlayId,
      'assetId': assetId,
      'targetConditionCode': targetConditionCode,
      'heatmapS3Key': heatmapS3Key,
      'isAuxiliaryOnly': isAuxiliaryOnly,
      'warningFa': warningFa,
    };
  }
}

class ExplainabilityOutput {
  final List<SegmentationMaskOverlay> primarySegmentationMasks;
  final List<AuxiliaryGradCamOverlay> auxiliaryGradCams;

  const ExplainabilityOutput({
    required this.primarySegmentationMasks,
    required this.auxiliaryGradCams,
  });

  factory ExplainabilityOutput.fromJson(Map<String, Object?> json) {
    return ExplainabilityOutput(
      primarySegmentationMasks: (json['primarySegmentationMasks'] as List<Object?>).map((e) => SegmentationMaskOverlay.fromJson(e as Map<String, Object?>)).toList(),
      auxiliaryGradCams: (json['auxiliaryGradCams'] as List<Object?>).map((e) => AuxiliaryGradCamOverlay.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'primarySegmentationMasks': primarySegmentationMasks.map((e) => e.toJson()).toList(),
      'auxiliaryGradCams': auxiliaryGradCams.map((e) => e.toJson()).toList(),
    };
  }
}

class PersianReportDraft {
  final String modelProvider;
  final String modelId;
  final String titleFa;
  final String modalityFindingsFa;
  final String differentialSummaryFa;
  final String crossModalCorrelationFa;
  final String followUpPlanFa;
  final UrgencyTier urgencyTier;
  final String urgencyLabelFa;
  final List<String> evidenceIds;
  final bool validationPassed;
  final int? draftVersion;
  final String? editedByUserId;
  final String? updatedAtIso;

  const PersianReportDraft({
    required this.modelProvider,
    required this.modelId,
    required this.titleFa,
    required this.modalityFindingsFa,
    required this.differentialSummaryFa,
    required this.crossModalCorrelationFa,
    required this.followUpPlanFa,
    required this.urgencyTier,
    required this.urgencyLabelFa,
    required this.evidenceIds,
    required this.validationPassed,
    this.draftVersion,
    this.editedByUserId,
    this.updatedAtIso,
  });

  factory PersianReportDraft.fromJson(Map<String, Object?> json) {
    return PersianReportDraft(
      modelProvider: json['modelProvider'] as String,
      modelId: json['modelId'] as String,
      titleFa: json['titleFa'] as String,
      modalityFindingsFa: json['modalityFindingsFa'] as String,
      differentialSummaryFa: json['differentialSummaryFa'] as String,
      crossModalCorrelationFa: json['crossModalCorrelationFa'] as String,
      followUpPlanFa: json['followUpPlanFa'] as String,
      urgencyTier: UrgencyTier.fromJson(json['urgencyTier'] as String),
      urgencyLabelFa: json['urgencyLabelFa'] as String,
      evidenceIds: (json['evidenceIds'] as List<Object?>).map((e) => e as String).toList(),
      validationPassed: json['validationPassed'] as bool,
      draftVersion: (json['draftVersion'] as num?)?.toInt(),
      editedByUserId: json['editedByUserId'] as String?,
      updatedAtIso: json['updatedAtIso'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'modelProvider': modelProvider,
      'modelId': modelId,
      'titleFa': titleFa,
      'modalityFindingsFa': modalityFindingsFa,
      'differentialSummaryFa': differentialSummaryFa,
      'crossModalCorrelationFa': crossModalCorrelationFa,
      'followUpPlanFa': followUpPlanFa,
      'urgencyTier': urgencyTier.toJson(),
      'urgencyLabelFa': urgencyLabelFa,
      'evidenceIds': evidenceIds,
      'validationPassed': validationPassed,
      'draftVersion': draftVersion,
      'editedByUserId': editedByUserId,
      'updatedAtIso': updatedAtIso,
    };
  }
}

class ClinicianSignoffRequest {
  final SignoffAction action;
  final UrgencyTier finalUrgency;
  final String finalReportTextFa;
  final String? overrideReasonFa;
  final int? expectedDraftVersion;

  const ClinicianSignoffRequest({
    required this.action,
    required this.finalUrgency,
    required this.finalReportTextFa,
    this.overrideReasonFa,
    this.expectedDraftVersion,
  });

  factory ClinicianSignoffRequest.fromJson(Map<String, Object?> json) {
    return ClinicianSignoffRequest(
      action: SignoffAction.fromJson(json['action'] as String),
      finalUrgency: UrgencyTier.fromJson(json['finalUrgency'] as String),
      finalReportTextFa: json['finalReportTextFa'] as String,
      overrideReasonFa: json['overrideReasonFa'] as String?,
      expectedDraftVersion: (json['expectedDraftVersion'] as num?)?.toInt(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'action': action.toJson(),
      'finalUrgency': finalUrgency.toJson(),
      'finalReportTextFa': finalReportTextFa,
      'overrideReasonFa': overrideReasonFa,
      'expectedDraftVersion': expectedDraftVersion,
    };
  }
}

class ClinicianSignoffResponse {
  final String signoffId;
  final String studyId;
  final String ophthalmologistId;
  final SignoffAction action;
  final UrgencyTier finalUrgency;
  final String finalUrgencyLabelFa;
  final String signedAt;

  const ClinicianSignoffResponse({
    required this.signoffId,
    required this.studyId,
    required this.ophthalmologistId,
    required this.action,
    required this.finalUrgency,
    required this.finalUrgencyLabelFa,
    required this.signedAt,
  });

  factory ClinicianSignoffResponse.fromJson(Map<String, Object?> json) {
    return ClinicianSignoffResponse(
      signoffId: json['signoffId'] as String,
      studyId: json['studyId'] as String,
      ophthalmologistId: json['ophthalmologistId'] as String,
      action: SignoffAction.fromJson(json['action'] as String),
      finalUrgency: UrgencyTier.fromJson(json['finalUrgency'] as String),
      finalUrgencyLabelFa: json['finalUrgencyLabelFa'] as String,
      signedAt: json['signedAt'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'signoffId': signoffId,
      'studyId': studyId,
      'ophthalmologistId': ophthalmologistId,
      'action': action.toJson(),
      'finalUrgency': finalUrgency.toJson(),
      'finalUrgencyLabelFa': finalUrgencyLabelFa,
      'signedAt': signedAt,
    };
  }
}

class DiagnosticStudyDetail {
  final String studyId;
  final String patientId;
  final String clinicId;
  final StudyLaterality eyeLaterality;
  final StudyStatus status;
  final bool? urgentFloorActive;
  final List<String>? urgentFloorRuleCodes;
  final String? createdAtIso;
  final String? updatedAtIso;
  final List<QcDecision> qcDecisions;
  final List<SpecialistOutput> specialistOutputs;
  final FusionResult? fusionResult;
  final ExplainabilityOutput? explainability;
  final PersianReportDraft? persianReportDraft;
  final ClinicianSignoffResponse? signoff;

  const DiagnosticStudyDetail({
    required this.studyId,
    required this.patientId,
    required this.clinicId,
    required this.eyeLaterality,
    required this.status,
    this.urgentFloorActive,
    this.urgentFloorRuleCodes,
    this.createdAtIso,
    this.updatedAtIso,
    required this.qcDecisions,
    required this.specialistOutputs,
    this.fusionResult,
    this.explainability,
    this.persianReportDraft,
    this.signoff,
  });

  factory DiagnosticStudyDetail.fromJson(Map<String, Object?> json) {
    return DiagnosticStudyDetail(
      studyId: json['studyId'] as String,
      patientId: json['patientId'] as String,
      clinicId: json['clinicId'] as String,
      eyeLaterality: StudyLaterality.fromJson(json['eyeLaterality'] as String),
      status: StudyStatus.fromJson(json['status'] as String),
      urgentFloorActive: json['urgentFloorActive'] as bool?,
      urgentFloorRuleCodes: json['urgentFloorRuleCodes'] == null ? null : (json['urgentFloorRuleCodes'] as List<Object?>).map((e) => e as String).toList(),
      createdAtIso: json['createdAtIso'] as String?,
      updatedAtIso: json['updatedAtIso'] as String?,
      qcDecisions: (json['qcDecisions'] as List<Object?>).map((e) => QcDecision.fromJson(e as Map<String, Object?>)).toList(),
      specialistOutputs: (json['specialistOutputs'] as List<Object?>).map((e) => SpecialistOutput.fromJson(e as Map<String, Object?>)).toList(),
      fusionResult: json['fusionResult'] == null ? null : FusionResult.fromJson(json['fusionResult'] as Map<String, Object?>),
      explainability: json['explainability'] == null ? null : ExplainabilityOutput.fromJson(json['explainability'] as Map<String, Object?>),
      persianReportDraft: json['persianReportDraft'] == null ? null : PersianReportDraft.fromJson(json['persianReportDraft'] as Map<String, Object?>),
      signoff: json['signoff'] == null ? null : ClinicianSignoffResponse.fromJson(json['signoff'] as Map<String, Object?>),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'studyId': studyId,
      'patientId': patientId,
      'clinicId': clinicId,
      'eyeLaterality': eyeLaterality.toJson(),
      'status': status.toJson(),
      'urgentFloorActive': urgentFloorActive,
      'urgentFloorRuleCodes': urgentFloorRuleCodes,
      'createdAtIso': createdAtIso,
      'updatedAtIso': updatedAtIso,
      'qcDecisions': qcDecisions.map((e) => e.toJson()).toList(),
      'specialistOutputs': specialistOutputs.map((e) => e.toJson()).toList(),
      'fusionResult': fusionResult?.toJson(),
      'explainability': explainability?.toJson(),
      'persianReportDraft': persianReportDraft?.toJson(),
      'signoff': signoff?.toJson(),
    };
  }
}

class PatientDiagnosticSummary {
  final String studyId;
  final String signedAtJalali;
  final String eyeLabelFa;
  final UrgencyTier urgencyTier;
  final String urgencyLabelFa;
  final String patientGuidanceFa;
  final String nextStepFa;

  const PatientDiagnosticSummary({
    required this.studyId,
    required this.signedAtJalali,
    required this.eyeLabelFa,
    required this.urgencyTier,
    required this.urgencyLabelFa,
    required this.patientGuidanceFa,
    required this.nextStepFa,
  });

  factory PatientDiagnosticSummary.fromJson(Map<String, Object?> json) {
    return PatientDiagnosticSummary(
      studyId: json['studyId'] as String,
      signedAtJalali: json['signedAtJalali'] as String,
      eyeLabelFa: json['eyeLabelFa'] as String,
      urgencyTier: UrgencyTier.fromJson(json['urgencyTier'] as String),
      urgencyLabelFa: json['urgencyLabelFa'] as String,
      patientGuidanceFa: json['patientGuidanceFa'] as String,
      nextStepFa: json['nextStepFa'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'studyId': studyId,
      'signedAtJalali': signedAtJalali,
      'eyeLabelFa': eyeLabelFa,
      'urgencyTier': urgencyTier.toJson(),
      'urgencyLabelFa': urgencyLabelFa,
      'patientGuidanceFa': patientGuidanceFa,
      'nextStepFa': nextStepFa,
    };
  }
}

class PatientDiagnosticSummaryList {
  final List<PatientDiagnosticSummary> items;

  const PatientDiagnosticSummaryList({
    required this.items,
  });

  factory PatientDiagnosticSummaryList.fromJson(Map<String, Object?> json) {
    return PatientDiagnosticSummaryList(
      items: (json['items'] as List<Object?>).map((e) => PatientDiagnosticSummary.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
    };
  }
}

class CalibrationProfileRequest {
  final String patientId;
  final String? clinicId;
  final String deviceFingerprintSha256;
  final double screenWidthMm;
  final double viewingDistanceCm;
  final String calibratedBy;
  final bool? verified;

  const CalibrationProfileRequest({
    required this.patientId,
    this.clinicId,
    required this.deviceFingerprintSha256,
    required this.screenWidthMm,
    required this.viewingDistanceCm,
    required this.calibratedBy,
    this.verified,
  });

  factory CalibrationProfileRequest.fromJson(Map<String, Object?> json) {
    return CalibrationProfileRequest(
      patientId: json['patientId'] as String,
      clinicId: json['clinicId'] as String?,
      deviceFingerprintSha256: json['deviceFingerprintSha256'] as String,
      screenWidthMm: (json['screenWidthMm'] as num).toDouble(),
      viewingDistanceCm: (json['viewingDistanceCm'] as num).toDouble(),
      calibratedBy: json['calibratedBy'] as String,
      verified: json['verified'] as bool?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'patientId': patientId,
      'clinicId': clinicId,
      'deviceFingerprintSha256': deviceFingerprintSha256,
      'screenWidthMm': screenWidthMm,
      'viewingDistanceCm': viewingDistanceCm,
      'calibratedBy': calibratedBy,
      'verified': verified,
    };
  }
}

class CalibrationProfileResponse {
  final String calibrationProfileId;
  final String patientId;
  final double screenWidthMm;
  final double viewingDistanceCm;
  final String calibratedBy;
  final bool verified;
  final String createdAt;

  const CalibrationProfileResponse({
    required this.calibrationProfileId,
    required this.patientId,
    required this.screenWidthMm,
    required this.viewingDistanceCm,
    required this.calibratedBy,
    required this.verified,
    required this.createdAt,
  });

  factory CalibrationProfileResponse.fromJson(Map<String, Object?> json) {
    return CalibrationProfileResponse(
      calibrationProfileId: json['calibrationProfileId'] as String,
      patientId: json['patientId'] as String,
      screenWidthMm: (json['screenWidthMm'] as num).toDouble(),
      viewingDistanceCm: (json['viewingDistanceCm'] as num).toDouble(),
      calibratedBy: json['calibratedBy'] as String,
      verified: json['verified'] as bool,
      createdAt: json['createdAt'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'calibrationProfileId': calibrationProfileId,
      'patientId': patientId,
      'screenWidthMm': screenWidthMm,
      'viewingDistanceCm': viewingDistanceCm,
      'calibratedBy': calibratedBy,
      'verified': verified,
      'createdAt': createdAt,
    };
  }
}

class HomeVisionTestRequest {
  final String? patientId;
  final String? calibrationProfileId;
  final EyeLaterality eyeLaterality;
  final String testType;
  final double? vaLogmar;
  final double? amslerDistortionScore;
  final bool? amslerCentralScotoma;
  final double viewingDistanceCm;
  final double ambientLux;
  final double deviceTiltDeg;
  final bool? glareDetected;
  final String? deviceModelCode;
  final List<HomeVisionTestTrialInput>? rawTrials;

  const HomeVisionTestRequest({
    this.patientId,
    this.calibrationProfileId,
    required this.eyeLaterality,
    required this.testType,
    this.vaLogmar,
    this.amslerDistortionScore,
    this.amslerCentralScotoma,
    required this.viewingDistanceCm,
    required this.ambientLux,
    required this.deviceTiltDeg,
    this.glareDetected,
    this.deviceModelCode,
    this.rawTrials,
  });

  factory HomeVisionTestRequest.fromJson(Map<String, Object?> json) {
    return HomeVisionTestRequest(
      patientId: json['patientId'] as String?,
      calibrationProfileId: json['calibrationProfileId'] as String?,
      eyeLaterality: EyeLaterality.fromJson(json['eyeLaterality'] as String),
      testType: json['testType'] as String,
      vaLogmar: (json['vaLogmar'] as num?)?.toDouble(),
      amslerDistortionScore: (json['amslerDistortionScore'] as num?)?.toDouble(),
      amslerCentralScotoma: json['amslerCentralScotoma'] as bool?,
      viewingDistanceCm: (json['viewingDistanceCm'] as num).toDouble(),
      ambientLux: (json['ambientLux'] as num).toDouble(),
      deviceTiltDeg: (json['deviceTiltDeg'] as num).toDouble(),
      glareDetected: json['glareDetected'] as bool?,
      deviceModelCode: json['deviceModelCode'] as String?,
      rawTrials: json['rawTrials'] == null ? null : (json['rawTrials'] as List<Object?>).map((e) => HomeVisionTestTrialInput.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'patientId': patientId,
      'calibrationProfileId': calibrationProfileId,
      'eyeLaterality': eyeLaterality.toJson(),
      'testType': testType,
      'vaLogmar': vaLogmar,
      'amslerDistortionScore': amslerDistortionScore,
      'amslerCentralScotoma': amslerCentralScotoma,
      'viewingDistanceCm': viewingDistanceCm,
      'ambientLux': ambientLux,
      'deviceTiltDeg': deviceTiltDeg,
      'glareDetected': glareDetected,
      'deviceModelCode': deviceModelCode,
      'rawTrials': rawTrials?.map((e) => e.toJson()).toList(),
    };
  }
}

class HomeVisionTestResponse {
  final String testId;
  final EyeLaterality eyeLaterality;
  final String eyeLabelFa;
  final String testType;
  final bool qualityPassed;
  final List<String> qualityIssuesFa;
  final String? triggeredTriageCaseId;
  final String guidanceFa;

  const HomeVisionTestResponse({
    required this.testId,
    required this.eyeLaterality,
    required this.eyeLabelFa,
    required this.testType,
    required this.qualityPassed,
    required this.qualityIssuesFa,
    this.triggeredTriageCaseId,
    required this.guidanceFa,
  });

  factory HomeVisionTestResponse.fromJson(Map<String, Object?> json) {
    return HomeVisionTestResponse(
      testId: json['testId'] as String,
      eyeLaterality: EyeLaterality.fromJson(json['eyeLaterality'] as String),
      eyeLabelFa: json['eyeLabelFa'] as String,
      testType: json['testType'] as String,
      qualityPassed: json['qualityPassed'] as bool,
      qualityIssuesFa: (json['qualityIssuesFa'] as List<Object?>).map((e) => e as String).toList(),
      triggeredTriageCaseId: json['triggeredTriageCaseId'] as String?,
      guidanceFa: json['guidanceFa'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'testId': testId,
      'eyeLaterality': eyeLaterality.toJson(),
      'eyeLabelFa': eyeLabelFa,
      'testType': testType,
      'qualityPassed': qualityPassed,
      'qualityIssuesFa': qualityIssuesFa,
      'triggeredTriageCaseId': triggeredTriageCaseId,
      'guidanceFa': guidanceFa,
    };
  }
}

class VisionTrendPoint {
  final String testId;
  final String testType;
  final EyeLaterality eyeLaterality;
  final double? vaLogmar;
  final double? amslerDistortionScore;
  final String recordedAt;

  const VisionTrendPoint({
    required this.testId,
    required this.testType,
    required this.eyeLaterality,
    this.vaLogmar,
    this.amslerDistortionScore,
    required this.recordedAt,
  });

  factory VisionTrendPoint.fromJson(Map<String, Object?> json) {
    return VisionTrendPoint(
      testId: json['testId'] as String,
      testType: json['testType'] as String,
      eyeLaterality: EyeLaterality.fromJson(json['eyeLaterality'] as String),
      vaLogmar: (json['vaLogmar'] as num?)?.toDouble(),
      amslerDistortionScore: (json['amslerDistortionScore'] as num?)?.toDouble(),
      recordedAt: json['recordedAt'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'testId': testId,
      'testType': testType,
      'eyeLaterality': eyeLaterality.toJson(),
      'vaLogmar': vaLogmar,
      'amslerDistortionScore': amslerDistortionScore,
      'recordedAt': recordedAt,
    };
  }
}

class PatientVisionTrendsResponse {
  final String patientId;
  final List<VisionTrendPoint> od;
  final List<VisionTrendPoint> os;

  const PatientVisionTrendsResponse({
    required this.patientId,
    required this.od,
    required this.os,
  });

  factory PatientVisionTrendsResponse.fromJson(Map<String, Object?> json) {
    return PatientVisionTrendsResponse(
      patientId: json['patientId'] as String,
      od: (json['od'] as List<Object?>).map((e) => VisionTrendPoint.fromJson(e as Map<String, Object?>)).toList(),
      os: (json['os'] as List<Object?>).map((e) => VisionTrendPoint.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'patientId': patientId,
      'od': od.map((e) => e.toJson()).toList(),
      'os': os.map((e) => e.toJson()).toList(),
    };
  }
}

class IcareHome2ReadingRequest {
  final String? patientId;
  final String deviceSerial;
  final EyeLaterality eyeLaterality;
  final double iopMmHg;
  final double qualityScore;
  final String measuredAtIso;

  const IcareHome2ReadingRequest({
    this.patientId,
    required this.deviceSerial,
    required this.eyeLaterality,
    required this.iopMmHg,
    required this.qualityScore,
    required this.measuredAtIso,
  });

  factory IcareHome2ReadingRequest.fromJson(Map<String, Object?> json) {
    return IcareHome2ReadingRequest(
      patientId: json['patientId'] as String?,
      deviceSerial: json['deviceSerial'] as String,
      eyeLaterality: EyeLaterality.fromJson(json['eyeLaterality'] as String),
      iopMmHg: (json['iopMmHg'] as num).toDouble(),
      qualityScore: (json['qualityScore'] as num).toDouble(),
      measuredAtIso: json['measuredAtIso'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'patientId': patientId,
      'deviceSerial': deviceSerial,
      'eyeLaterality': eyeLaterality.toJson(),
      'iopMmHg': iopMmHg,
      'qualityScore': qualityScore,
      'measuredAtIso': measuredAtIso,
    };
  }
}

class IcareHome2ReadingResponse {
  final String readingId;
  final bool accepted;
  final UrgencyTier alertTier;
  final String summaryFa;

  const IcareHome2ReadingResponse({
    required this.readingId,
    required this.accepted,
    required this.alertTier,
    required this.summaryFa,
  });

  factory IcareHome2ReadingResponse.fromJson(Map<String, Object?> json) {
    return IcareHome2ReadingResponse(
      readingId: json['readingId'] as String,
      accepted: json['accepted'] as bool,
      alertTier: UrgencyTier.fromJson(json['alertTier'] as String),
      summaryFa: json['summaryFa'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'readingId': readingId,
      'accepted': accepted,
      'alertTier': alertTier.toJson(),
      'summaryFa': summaryFa,
    };
  }
}

class ReportSectionInput {
  final String headingFa;
  final List<String> linesFa;

  const ReportSectionInput({
    required this.headingFa,
    required this.linesFa,
  });

  factory ReportSectionInput.fromJson(Map<String, Object?> json) {
    return ReportSectionInput(
      headingFa: json['headingFa'] as String,
      linesFa: (json['linesFa'] as List<Object?>).map((e) => e as String).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'headingFa': headingFa,
      'linesFa': linesFa,
    };
  }
}

class CreateReportRequest {
  final String reportType;
  final String patientId;
  final String sourceRefId;
  final String titleFa;
  final List<ReportSectionInput> sections;

  const CreateReportRequest({
    required this.reportType,
    required this.patientId,
    required this.sourceRefId,
    required this.titleFa,
    required this.sections,
  });

  factory CreateReportRequest.fromJson(Map<String, Object?> json) {
    return CreateReportRequest(
      reportType: json['reportType'] as String,
      patientId: json['patientId'] as String,
      sourceRefId: json['sourceRefId'] as String,
      titleFa: json['titleFa'] as String,
      sections: (json['sections'] as List<Object?>).map((e) => ReportSectionInput.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'reportType': reportType,
      'patientId': patientId,
      'sourceRefId': sourceRefId,
      'titleFa': titleFa,
      'sections': sections.map((e) => e.toJson()).toList(),
    };
  }
}

class CreateReportResponse {
  final String reportId;
  final String reportType;
  final String sourceSha256;
  final String pdfSha256;

  const CreateReportResponse({
    required this.reportId,
    required this.reportType,
    required this.sourceSha256,
    required this.pdfSha256,
  });

  factory CreateReportResponse.fromJson(Map<String, Object?> json) {
    return CreateReportResponse(
      reportId: json['reportId'] as String,
      reportType: json['reportType'] as String,
      sourceSha256: json['sourceSha256'] as String,
      pdfSha256: json['pdfSha256'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'reportId': reportId,
      'reportType': reportType,
      'sourceSha256': sourceSha256,
      'pdfSha256': pdfSha256,
    };
  }
}

class AiEngineQcRequest {
  final List<StudyAssetInput> assets;

  const AiEngineQcRequest({
    required this.assets,
  });

  factory AiEngineQcRequest.fromJson(Map<String, Object?> json) {
    return AiEngineQcRequest(
      assets: (json['assets'] as List<Object?>).map((e) => StudyAssetInput.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'assets': assets.map((e) => e.toJson()).toList(),
    };
  }
}

class AiEngineAnalyzeRequest {
  final String studyId;
  final String jobId;
  final StudyLaterality eyeLaterality;
  final List<StudyAssetInput> assets;
  final ClinicalLabsInput? labs;

  const AiEngineAnalyzeRequest({
    required this.studyId,
    required this.jobId,
    required this.eyeLaterality,
    required this.assets,
    this.labs,
  });

  factory AiEngineAnalyzeRequest.fromJson(Map<String, Object?> json) {
    return AiEngineAnalyzeRequest(
      studyId: json['studyId'] as String,
      jobId: json['jobId'] as String,
      eyeLaterality: StudyLaterality.fromJson(json['eyeLaterality'] as String),
      assets: (json['assets'] as List<Object?>).map((e) => StudyAssetInput.fromJson(e as Map<String, Object?>)).toList(),
      labs: json['labs'] == null ? null : ClinicalLabsInput.fromJson(json['labs'] as Map<String, Object?>),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'studyId': studyId,
      'jobId': jobId,
      'eyeLaterality': eyeLaterality.toJson(),
      'assets': assets.map((e) => e.toJson()).toList(),
      'labs': labs?.toJson(),
    };
  }
}

class AiEngineAnalyzeResponse {
  final String studyId;
  final String jobId;
  final AiEngineMode engineMode;
  final String status;
  final List<QcDecision> qcDecisions;
  final List<SpecialistOutput> specialistOutputs;
  final FusionResult? fusionResult;
  final ExplainabilityOutput? explainability;

  const AiEngineAnalyzeResponse({
    required this.studyId,
    required this.jobId,
    required this.engineMode,
    required this.status,
    required this.qcDecisions,
    required this.specialistOutputs,
    this.fusionResult,
    this.explainability,
  });

  factory AiEngineAnalyzeResponse.fromJson(Map<String, Object?> json) {
    return AiEngineAnalyzeResponse(
      studyId: json['studyId'] as String,
      jobId: json['jobId'] as String,
      engineMode: AiEngineMode.fromJson(json['engineMode'] as String),
      status: json['status'] as String,
      qcDecisions: (json['qcDecisions'] as List<Object?>).map((e) => QcDecision.fromJson(e as Map<String, Object?>)).toList(),
      specialistOutputs: (json['specialistOutputs'] as List<Object?>).map((e) => SpecialistOutput.fromJson(e as Map<String, Object?>)).toList(),
      fusionResult: json['fusionResult'] == null ? null : FusionResult.fromJson(json['fusionResult'] as Map<String, Object?>),
      explainability: json['explainability'] == null ? null : ExplainabilityOutput.fromJson(json['explainability'] as Map<String, Object?>),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'studyId': studyId,
      'jobId': jobId,
      'engineMode': engineMode.toJson(),
      'status': status,
      'qcDecisions': qcDecisions.map((e) => e.toJson()).toList(),
      'specialistOutputs': specialistOutputs.map((e) => e.toJson()).toList(),
      'fusionResult': fusionResult?.toJson(),
      'explainability': explainability?.toJson(),
    };
  }
}

class AuthorizedClinicMembership {
  final String membershipId;
  final String tenantId;
  final String clinicId;
  final String clinicNameFa;
  final StaffRole role;
  final String emergencyPhone;
  final String calendarMode;

  const AuthorizedClinicMembership({
    required this.membershipId,
    required this.tenantId,
    required this.clinicId,
    required this.clinicNameFa,
    required this.role,
    required this.emergencyPhone,
    required this.calendarMode,
  });

  factory AuthorizedClinicMembership.fromJson(Map<String, Object?> json) {
    return AuthorizedClinicMembership(
      membershipId: json['membershipId'] as String,
      tenantId: json['tenantId'] as String,
      clinicId: json['clinicId'] as String,
      clinicNameFa: json['clinicNameFa'] as String,
      role: StaffRole.fromJson(json['role'] as String),
      emergencyPhone: json['emergencyPhone'] as String,
      calendarMode: json['calendarMode'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'membershipId': membershipId,
      'tenantId': tenantId,
      'clinicId': clinicId,
      'clinicNameFa': clinicNameFa,
      'role': role.toJson(),
      'emergencyPhone': emergencyPhone,
      'calendarMode': calendarMode,
    };
  }
}

class AuthorizedClinicListResponse {
  final List<AuthorizedClinicMembership> items;

  const AuthorizedClinicListResponse({
    required this.items,
  });

  factory AuthorizedClinicListResponse.fromJson(Map<String, Object?> json) {
    return AuthorizedClinicListResponse(
      items: (json['items'] as List<Object?>).map((e) => AuthorizedClinicMembership.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
    };
  }
}

class FeatureFlagRecord {
  final String flagKey;
  final String labelFa;
  final String descriptionFa;
  final bool enabled;
  final Map<String, Object?> config;
  final String? updatedAtIso;

  const FeatureFlagRecord({
    required this.flagKey,
    required this.labelFa,
    required this.descriptionFa,
    required this.enabled,
    required this.config,
    this.updatedAtIso,
  });

  factory FeatureFlagRecord.fromJson(Map<String, Object?> json) {
    return FeatureFlagRecord(
      flagKey: json['flagKey'] as String,
      labelFa: json['labelFa'] as String,
      descriptionFa: json['descriptionFa'] as String,
      enabled: json['enabled'] as bool,
      config: json['config'] as Map<String, Object?>,
      updatedAtIso: json['updatedAtIso'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'flagKey': flagKey,
      'labelFa': labelFa,
      'descriptionFa': descriptionFa,
      'enabled': enabled,
      'config': config,
      'updatedAtIso': updatedAtIso,
    };
  }
}

class FeatureFlagListResponse {
  final List<FeatureFlagRecord> items;

  const FeatureFlagListResponse({
    required this.items,
  });

  factory FeatureFlagListResponse.fromJson(Map<String, Object?> json) {
    return FeatureFlagListResponse(
      items: (json['items'] as List<Object?>).map((e) => FeatureFlagRecord.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
    };
  }
}

class ClinicFeatureFlagRecord {
  final String id;
  final String tenantId;
  final String clinicId;
  final String flagKey;
  final bool enabled;
  final Map<String, Object?> config;
  final String updatedByUserId;
  final String updatedAtIso;

  const ClinicFeatureFlagRecord({
    required this.id,
    required this.tenantId,
    required this.clinicId,
    required this.flagKey,
    required this.enabled,
    required this.config,
    required this.updatedByUserId,
    required this.updatedAtIso,
  });

  factory ClinicFeatureFlagRecord.fromJson(Map<String, Object?> json) {
    return ClinicFeatureFlagRecord(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      clinicId: json['clinicId'] as String,
      flagKey: json['flagKey'] as String,
      enabled: json['enabled'] as bool,
      config: json['config'] as Map<String, Object?>,
      updatedByUserId: json['updatedByUserId'] as String,
      updatedAtIso: json['updatedAtIso'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'tenantId': tenantId,
      'clinicId': clinicId,
      'flagKey': flagKey,
      'enabled': enabled,
      'config': config,
      'updatedByUserId': updatedByUserId,
      'updatedAtIso': updatedAtIso,
    };
  }
}

class UpsertFeatureFlagRequest {
  final String flagKey;
  final bool enabled;
  final Map<String, Object?>? config;

  const UpsertFeatureFlagRequest({
    required this.flagKey,
    required this.enabled,
    this.config,
  });

  factory UpsertFeatureFlagRequest.fromJson(Map<String, Object?> json) {
    return UpsertFeatureFlagRequest(
      flagKey: json['flagKey'] as String,
      enabled: json['enabled'] as bool,
      config: json['config'] as Map<String, Object?>?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'flagKey': flagKey,
      'enabled': enabled,
      'config': config,
    };
  }
}

class StaffMeResponse {
  final String userId;
  final String tenantId;
  final String clinicId;
  final StaffRole role;
  final bool mfaVerified;
  final bool stepUpVerified;
  final Map<String, bool> capabilities;
  final ClinicProfile? clinic;
  final List<AuthorizedClinicMembership> authorizedClinics;
  final List<FeatureFlagRecord> featureFlags;

  const StaffMeResponse({
    required this.userId,
    required this.tenantId,
    required this.clinicId,
    required this.role,
    required this.mfaVerified,
    required this.stepUpVerified,
    required this.capabilities,
    this.clinic,
    required this.authorizedClinics,
    required this.featureFlags,
  });

  factory StaffMeResponse.fromJson(Map<String, Object?> json) {
    return StaffMeResponse(
      userId: json['userId'] as String,
      tenantId: json['tenantId'] as String,
      clinicId: json['clinicId'] as String,
      role: StaffRole.fromJson(json['role'] as String),
      mfaVerified: json['mfaVerified'] as bool,
      stepUpVerified: json['stepUpVerified'] as bool,
      capabilities: (json['capabilities'] as Map<String, Object?>).map((k, v) => MapEntry(k, v as bool)),
      clinic: json['clinic'] == null ? null : ClinicProfile.fromJson(json['clinic'] as Map<String, Object?>),
      authorizedClinics: (json['authorizedClinics'] as List<Object?>).map((e) => AuthorizedClinicMembership.fromJson(e as Map<String, Object?>)).toList(),
      featureFlags: (json['featureFlags'] as List<Object?>).map((e) => FeatureFlagRecord.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'userId': userId,
      'tenantId': tenantId,
      'clinicId': clinicId,
      'role': role.toJson(),
      'mfaVerified': mfaVerified,
      'stepUpVerified': stepUpVerified,
      'capabilities': capabilities,
      'clinic': clinic?.toJson(),
      'authorizedClinics': authorizedClinics.map((e) => e.toJson()).toList(),
      'featureFlags': featureFlags.map((e) => e.toJson()).toList(),
    };
  }
}

class OverviewDashboardResponse {
  final String todayJalali;
  final int activeEpisodesOd;
  final int activeEpisodesOs;
  final int printPhoneCohortCount;
  final int urgentTriageCount;
  final int overdueSlaCount;
  final int openTriageCount;
  final int pendingHitlStudies;
  final int qcFailedStudies;
  final int r2AlertCount;
  final int activeOutagesCount;
  final List<Map<String, Object?>> queueUrgentItems;
  final List<Map<String, Object?>> pendingHitlItems;

  const OverviewDashboardResponse({
    required this.todayJalali,
    required this.activeEpisodesOd,
    required this.activeEpisodesOs,
    required this.printPhoneCohortCount,
    required this.urgentTriageCount,
    required this.overdueSlaCount,
    required this.openTriageCount,
    required this.pendingHitlStudies,
    required this.qcFailedStudies,
    required this.r2AlertCount,
    required this.activeOutagesCount,
    required this.queueUrgentItems,
    required this.pendingHitlItems,
  });

  factory OverviewDashboardResponse.fromJson(Map<String, Object?> json) {
    return OverviewDashboardResponse(
      todayJalali: json['todayJalali'] as String,
      activeEpisodesOd: (json['activeEpisodesOd'] as num).toInt(),
      activeEpisodesOs: (json['activeEpisodesOs'] as num).toInt(),
      printPhoneCohortCount: (json['printPhoneCohortCount'] as num).toInt(),
      urgentTriageCount: (json['urgentTriageCount'] as num).toInt(),
      overdueSlaCount: (json['overdueSlaCount'] as num).toInt(),
      openTriageCount: (json['openTriageCount'] as num).toInt(),
      pendingHitlStudies: (json['pendingHitlStudies'] as num).toInt(),
      qcFailedStudies: (json['qcFailedStudies'] as num).toInt(),
      r2AlertCount: (json['r2AlertCount'] as num).toInt(),
      activeOutagesCount: (json['activeOutagesCount'] as num).toInt(),
      queueUrgentItems: (json['queueUrgentItems'] as List<Object?>).map((e) => e as Map<String, Object?>).toList(),
      pendingHitlItems: (json['pendingHitlItems'] as List<Object?>).map((e) => e as Map<String, Object?>).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'todayJalali': todayJalali,
      'activeEpisodesOd': activeEpisodesOd,
      'activeEpisodesOs': activeEpisodesOs,
      'printPhoneCohortCount': printPhoneCohortCount,
      'urgentTriageCount': urgentTriageCount,
      'overdueSlaCount': overdueSlaCount,
      'openTriageCount': openTriageCount,
      'pendingHitlStudies': pendingHitlStudies,
      'qcFailedStudies': qcFailedStudies,
      'r2AlertCount': r2AlertCount,
      'activeOutagesCount': activeOutagesCount,
      'queueUrgentItems': queueUrgentItems,
      'pendingHitlItems': pendingHitlItems,
    };
  }
}

class WorkspaceSearchResponse {
  final String query;
  final List<Map<String, Object?>> patients;
  final List<Map<String, Object?>> studies;
  final List<Map<String, Object?>> episodes;
  final List<Map<String, Object?>> reports;

  const WorkspaceSearchResponse({
    required this.query,
    required this.patients,
    required this.studies,
    required this.episodes,
    required this.reports,
  });

  factory WorkspaceSearchResponse.fromJson(Map<String, Object?> json) {
    return WorkspaceSearchResponse(
      query: json['query'] as String,
      patients: (json['patients'] as List<Object?>).map((e) => e as Map<String, Object?>).toList(),
      studies: (json['studies'] as List<Object?>).map((e) => e as Map<String, Object?>).toList(),
      episodes: (json['episodes'] as List<Object?>).map((e) => e as Map<String, Object?>).toList(),
      reports: (json['reports'] as List<Object?>).map((e) => e as Map<String, Object?>).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'query': query,
      'patients': patients,
      'studies': studies,
      'episodes': episodes,
      'reports': reports,
    };
  }
}

class RecentActivityItem {
  final String activityId;
  final String action;
  final String actorRole;
  final String resourceType;
  final String resourceId;
  final bool breakGlass;
  final String? reasonFa;
  final String occurredAtIso;
  final String occurredAtJalali;

  const RecentActivityItem({
    required this.activityId,
    required this.action,
    required this.actorRole,
    required this.resourceType,
    required this.resourceId,
    required this.breakGlass,
    this.reasonFa,
    required this.occurredAtIso,
    required this.occurredAtJalali,
  });

  factory RecentActivityItem.fromJson(Map<String, Object?> json) {
    return RecentActivityItem(
      activityId: json['activityId'] as String,
      action: json['action'] as String,
      actorRole: json['actorRole'] as String,
      resourceType: json['resourceType'] as String,
      resourceId: json['resourceId'] as String,
      breakGlass: json['breakGlass'] as bool,
      reasonFa: json['reasonFa'] as String?,
      occurredAtIso: json['occurredAtIso'] as String,
      occurredAtJalali: json['occurredAtJalali'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'activityId': activityId,
      'action': action,
      'actorRole': actorRole,
      'resourceType': resourceType,
      'resourceId': resourceId,
      'breakGlass': breakGlass,
      'reasonFa': reasonFa,
      'occurredAtIso': occurredAtIso,
      'occurredAtJalali': occurredAtJalali,
    };
  }
}

class RecentActivityListResponse {
  final List<RecentActivityItem> items;

  const RecentActivityListResponse({
    required this.items,
  });

  factory RecentActivityListResponse.fromJson(Map<String, Object?> json) {
    return RecentActivityListResponse(
      items: (json['items'] as List<Object?>).map((e) => RecentActivityItem.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
    };
  }
}

class PatientListItem {
  final String patientId;
  final String clinicId;
  final String fullNameFa;
  final String phoneMasked;
  final String? nationalIdMasked;
  final AccessMode accessMode;
  final String preferredLocale;
  final int activeEpisodeCount;
  final int openTriageCount;
  final String createdAtIso;

  const PatientListItem({
    required this.patientId,
    required this.clinicId,
    required this.fullNameFa,
    required this.phoneMasked,
    this.nationalIdMasked,
    required this.accessMode,
    required this.preferredLocale,
    required this.activeEpisodeCount,
    required this.openTriageCount,
    required this.createdAtIso,
  });

  factory PatientListItem.fromJson(Map<String, Object?> json) {
    return PatientListItem(
      patientId: json['patientId'] as String,
      clinicId: json['clinicId'] as String,
      fullNameFa: json['fullNameFa'] as String,
      phoneMasked: json['phoneMasked'] as String,
      nationalIdMasked: json['nationalIdMasked'] as String?,
      accessMode: AccessMode.fromJson(json['accessMode'] as String),
      preferredLocale: json['preferredLocale'] as String,
      activeEpisodeCount: (json['activeEpisodeCount'] as num).toInt(),
      openTriageCount: (json['openTriageCount'] as num).toInt(),
      createdAtIso: json['createdAtIso'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'patientId': patientId,
      'clinicId': clinicId,
      'fullNameFa': fullNameFa,
      'phoneMasked': phoneMasked,
      'nationalIdMasked': nationalIdMasked,
      'accessMode': accessMode.toJson(),
      'preferredLocale': preferredLocale,
      'activeEpisodeCount': activeEpisodeCount,
      'openTriageCount': openTriageCount,
      'createdAtIso': createdAtIso,
    };
  }
}

class PatientListResponse {
  final List<PatientListItem> items;
  final int total;

  const PatientListResponse({
    required this.items,
    required this.total,
  });

  factory PatientListResponse.fromJson(Map<String, Object?> json) {
    return PatientListResponse(
      items: (json['items'] as List<Object?>).map((e) => PatientListItem.fromJson(e as Map<String, Object?>)).toList(),
      total: (json['total'] as num).toInt(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
      'total': total,
    };
  }
}

class StaffEnrollPatientRequest {
  final String fullNameFa;
  final String phoneNumber;
  final AccessMode accessMode;
  final String? nationalIdMasked;
  final int? birthYearJalali;
  final String? notesFa;
  final String? consentVersion;
  final bool? mlTrainingConsentFlag;

  const StaffEnrollPatientRequest({
    required this.fullNameFa,
    required this.phoneNumber,
    required this.accessMode,
    this.nationalIdMasked,
    this.birthYearJalali,
    this.notesFa,
    this.consentVersion,
    this.mlTrainingConsentFlag,
  });

  factory StaffEnrollPatientRequest.fromJson(Map<String, Object?> json) {
    return StaffEnrollPatientRequest(
      fullNameFa: json['fullNameFa'] as String,
      phoneNumber: json['phoneNumber'] as String,
      accessMode: AccessMode.fromJson(json['accessMode'] as String),
      nationalIdMasked: json['nationalIdMasked'] as String?,
      birthYearJalali: (json['birthYearJalali'] as num?)?.toInt(),
      notesFa: json['notesFa'] as String?,
      consentVersion: json['consentVersion'] as String?,
      mlTrainingConsentFlag: json['mlTrainingConsentFlag'] as bool?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'fullNameFa': fullNameFa,
      'phoneNumber': phoneNumber,
      'accessMode': accessMode.toJson(),
      'nationalIdMasked': nationalIdMasked,
      'birthYearJalali': birthYearJalali,
      'notesFa': notesFa,
      'consentVersion': consentVersion,
      'mlTrainingConsentFlag': mlTrainingConsentFlag,
    };
  }
}

class StaffEnrolledPatientResponse {
  final String patientId;
  final String tenantId;
  final String clinicId;
  final String fullNameFa;
  final String phoneMasked;
  final String? nationalIdMasked;
  final int? birthYearJalali;
  final String? notesFa;
  final AccessMode accessMode;
  final String preferredLocale;
  final bool mlTrainingConsentFlag;
  final List<ConsentRecord> consents;

  const StaffEnrolledPatientResponse({
    required this.patientId,
    required this.tenantId,
    required this.clinicId,
    required this.fullNameFa,
    required this.phoneMasked,
    this.nationalIdMasked,
    this.birthYearJalali,
    this.notesFa,
    required this.accessMode,
    required this.preferredLocale,
    required this.mlTrainingConsentFlag,
    required this.consents,
  });

  factory StaffEnrolledPatientResponse.fromJson(Map<String, Object?> json) {
    return StaffEnrolledPatientResponse(
      patientId: json['patientId'] as String,
      tenantId: json['tenantId'] as String,
      clinicId: json['clinicId'] as String,
      fullNameFa: json['fullNameFa'] as String,
      phoneMasked: json['phoneMasked'] as String,
      nationalIdMasked: json['nationalIdMasked'] as String?,
      birthYearJalali: (json['birthYearJalali'] as num?)?.toInt(),
      notesFa: json['notesFa'] as String?,
      accessMode: AccessMode.fromJson(json['accessMode'] as String),
      preferredLocale: json['preferredLocale'] as String,
      mlTrainingConsentFlag: json['mlTrainingConsentFlag'] as bool,
      consents: (json['consents'] as List<Object?>).map((e) => ConsentRecord.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'patientId': patientId,
      'tenantId': tenantId,
      'clinicId': clinicId,
      'fullNameFa': fullNameFa,
      'phoneMasked': phoneMasked,
      'nationalIdMasked': nationalIdMasked,
      'birthYearJalali': birthYearJalali,
      'notesFa': notesFa,
      'accessMode': accessMode.toJson(),
      'preferredLocale': preferredLocale,
      'mlTrainingConsentFlag': mlTrainingConsentFlag,
      'consents': consents.map((e) => e.toJson()).toList(),
    };
  }
}

class Patient360Response {
  final Map<String, Object?> patient;
  final List<Map<String, Object?>> odEpisodes;
  final List<Map<String, Object?>> osEpisodes;
  final List<Map<String, Object?>> recentStudies;
  final Map<String, Object?> r2Summary;
  final List<Map<String, Object?>> openTriageCases;
  final List<Map<String, Object?>> pendingFollowUpTasks;
  final List<Map<String, Object?>> clinicalHistories;
  final List<Map<String, Object?>> consents;

  const Patient360Response({
    required this.patient,
    required this.odEpisodes,
    required this.osEpisodes,
    required this.recentStudies,
    required this.r2Summary,
    required this.openTriageCases,
    required this.pendingFollowUpTasks,
    required this.clinicalHistories,
    required this.consents,
  });

  factory Patient360Response.fromJson(Map<String, Object?> json) {
    return Patient360Response(
      patient: json['patient'] as Map<String, Object?>,
      odEpisodes: (json['odEpisodes'] as List<Object?>).map((e) => e as Map<String, Object?>).toList(),
      osEpisodes: (json['osEpisodes'] as List<Object?>).map((e) => e as Map<String, Object?>).toList(),
      recentStudies: (json['recentStudies'] as List<Object?>).map((e) => e as Map<String, Object?>).toList(),
      r2Summary: json['r2Summary'] as Map<String, Object?>,
      openTriageCases: (json['openTriageCases'] as List<Object?>).map((e) => e as Map<String, Object?>).toList(),
      pendingFollowUpTasks: (json['pendingFollowUpTasks'] as List<Object?>).map((e) => e as Map<String, Object?>).toList(),
      clinicalHistories: (json['clinicalHistories'] as List<Object?>).map((e) => e as Map<String, Object?>).toList(),
      consents: (json['consents'] as List<Object?>).map((e) => e as Map<String, Object?>).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'patient': patient,
      'odEpisodes': odEpisodes,
      'osEpisodes': osEpisodes,
      'recentStudies': recentStudies,
      'r2Summary': r2Summary,
      'openTriageCases': openTriageCases,
      'pendingFollowUpTasks': pendingFollowUpTasks,
      'clinicalHistories': clinicalHistories,
      'consents': consents,
    };
  }
}

class PatientClinicalHistoryItem {
  final String historyId;
  final String tenantId;
  final String clinicId;
  final String patientId;
  final String recordedByUserId;
  final String summaryFa;
  final List<String> conditions;
  final List<String> allergies;
  final List<String> medications;
  final Map<String, Object?> riskFactors;
  final Map<String, Object?> labs;
  final String createdAtIso;

  const PatientClinicalHistoryItem({
    required this.historyId,
    required this.tenantId,
    required this.clinicId,
    required this.patientId,
    required this.recordedByUserId,
    required this.summaryFa,
    required this.conditions,
    required this.allergies,
    required this.medications,
    required this.riskFactors,
    required this.labs,
    required this.createdAtIso,
  });

  factory PatientClinicalHistoryItem.fromJson(Map<String, Object?> json) {
    return PatientClinicalHistoryItem(
      historyId: json['historyId'] as String,
      tenantId: json['tenantId'] as String,
      clinicId: json['clinicId'] as String,
      patientId: json['patientId'] as String,
      recordedByUserId: json['recordedByUserId'] as String,
      summaryFa: json['summaryFa'] as String,
      conditions: (json['conditions'] as List<Object?>).map((e) => e as String).toList(),
      allergies: (json['allergies'] as List<Object?>).map((e) => e as String).toList(),
      medications: (json['medications'] as List<Object?>).map((e) => e as String).toList(),
      riskFactors: json['riskFactors'] as Map<String, Object?>,
      labs: json['labs'] as Map<String, Object?>,
      createdAtIso: json['createdAtIso'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'historyId': historyId,
      'tenantId': tenantId,
      'clinicId': clinicId,
      'patientId': patientId,
      'recordedByUserId': recordedByUserId,
      'summaryFa': summaryFa,
      'conditions': conditions,
      'allergies': allergies,
      'medications': medications,
      'riskFactors': riskFactors,
      'labs': labs,
      'createdAtIso': createdAtIso,
    };
  }
}

class PatientClinicalHistoryListResponse {
  final List<PatientClinicalHistoryItem> items;

  const PatientClinicalHistoryListResponse({
    required this.items,
  });

  factory PatientClinicalHistoryListResponse.fromJson(Map<String, Object?> json) {
    return PatientClinicalHistoryListResponse(
      items: (json['items'] as List<Object?>).map((e) => PatientClinicalHistoryItem.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
    };
  }
}

class AddClinicalHistoryRequest {
  final String summaryFa;
  final List<String>? conditions;
  final List<String>? allergies;
  final List<String>? medications;
  final Map<String, Object?>? riskFactors;
  final Map<String, Object?>? labs;

  const AddClinicalHistoryRequest({
    required this.summaryFa,
    this.conditions,
    this.allergies,
    this.medications,
    this.riskFactors,
    this.labs,
  });

  factory AddClinicalHistoryRequest.fromJson(Map<String, Object?> json) {
    return AddClinicalHistoryRequest(
      summaryFa: json['summaryFa'] as String,
      conditions: json['conditions'] == null ? null : (json['conditions'] as List<Object?>).map((e) => e as String).toList(),
      allergies: json['allergies'] == null ? null : (json['allergies'] as List<Object?>).map((e) => e as String).toList(),
      medications: json['medications'] == null ? null : (json['medications'] as List<Object?>).map((e) => e as String).toList(),
      riskFactors: json['riskFactors'] as Map<String, Object?>?,
      labs: json['labs'] as Map<String, Object?>?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'summaryFa': summaryFa,
      'conditions': conditions,
      'allergies': allergies,
      'medications': medications,
      'riskFactors': riskFactors,
      'labs': labs,
    };
  }
}

class PatientTimelineEvent {
  final String category;
  final String refId;
  final StudyLaterality? eyeLaterality;
  final String? eyeLabelFa;
  final String titleFa;
  final String summaryFa;
  final String occurredAtIso;
  final String occurredAtJalali;

  const PatientTimelineEvent({
    required this.category,
    required this.refId,
    this.eyeLaterality,
    this.eyeLabelFa,
    required this.titleFa,
    required this.summaryFa,
    required this.occurredAtIso,
    required this.occurredAtJalali,
  });

  factory PatientTimelineEvent.fromJson(Map<String, Object?> json) {
    return PatientTimelineEvent(
      category: json['category'] as String,
      refId: json['refId'] as String,
      eyeLaterality: json['eyeLaterality'] == null ? null : StudyLaterality.fromJson(json['eyeLaterality'] as String),
      eyeLabelFa: json['eyeLabelFa'] as String?,
      titleFa: json['titleFa'] as String,
      summaryFa: json['summaryFa'] as String,
      occurredAtIso: json['occurredAtIso'] as String,
      occurredAtJalali: json['occurredAtJalali'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'category': category,
      'refId': refId,
      'eyeLaterality': eyeLaterality?.toJson(),
      'eyeLabelFa': eyeLabelFa,
      'titleFa': titleFa,
      'summaryFa': summaryFa,
      'occurredAtIso': occurredAtIso,
      'occurredAtJalali': occurredAtJalali,
    };
  }
}

class PatientTimelineResponse {
  final List<PatientTimelineEvent> items;

  const PatientTimelineResponse({
    required this.items,
  });

  factory PatientTimelineResponse.fromJson(Map<String, Object?> json) {
    return PatientTimelineResponse(
      items: (json['items'] as List<Object?>).map((e) => PatientTimelineEvent.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
    };
  }
}

class UpdatePatientConsentRequest {
  final String consentVersion;
  final String action;
  final bool? mlTrainingConsentFlag;
  final String? noteFa;

  const UpdatePatientConsentRequest({
    required this.consentVersion,
    required this.action,
    this.mlTrainingConsentFlag,
    this.noteFa,
  });

  factory UpdatePatientConsentRequest.fromJson(Map<String, Object?> json) {
    return UpdatePatientConsentRequest(
      consentVersion: json['consentVersion'] as String,
      action: json['action'] as String,
      mlTrainingConsentFlag: json['mlTrainingConsentFlag'] as bool?,
      noteFa: json['noteFa'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'consentVersion': consentVersion,
      'action': action,
      'mlTrainingConsentFlag': mlTrainingConsentFlag,
      'noteFa': noteFa,
    };
  }
}

class CareEpisodeWorklistItem {
  final String episodeId;
  final String clinicId;
  final String patientId;
  final String patientNameFa;
  final String phoneMasked;
  final String protocolType;
  final EyeLaterality eyeLaterality;
  final String eyeLabelFa;
  final String surgeonId;
  final AccessMode accessMode;
  final int activePrescriptionVersion;
  final String status;
  final String anchorAtIso;
  final String anchorAtJalali;

  const CareEpisodeWorklistItem({
    required this.episodeId,
    required this.clinicId,
    required this.patientId,
    required this.patientNameFa,
    required this.phoneMasked,
    required this.protocolType,
    required this.eyeLaterality,
    required this.eyeLabelFa,
    required this.surgeonId,
    required this.accessMode,
    required this.activePrescriptionVersion,
    required this.status,
    required this.anchorAtIso,
    required this.anchorAtJalali,
  });

  factory CareEpisodeWorklistItem.fromJson(Map<String, Object?> json) {
    return CareEpisodeWorklistItem(
      episodeId: json['episodeId'] as String,
      clinicId: json['clinicId'] as String,
      patientId: json['patientId'] as String,
      patientNameFa: json['patientNameFa'] as String,
      phoneMasked: json['phoneMasked'] as String,
      protocolType: json['protocolType'] as String,
      eyeLaterality: EyeLaterality.fromJson(json['eyeLaterality'] as String),
      eyeLabelFa: json['eyeLabelFa'] as String,
      surgeonId: json['surgeonId'] as String,
      accessMode: AccessMode.fromJson(json['accessMode'] as String),
      activePrescriptionVersion: (json['activePrescriptionVersion'] as num).toInt(),
      status: json['status'] as String,
      anchorAtIso: json['anchorAtIso'] as String,
      anchorAtJalali: json['anchorAtJalali'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'episodeId': episodeId,
      'clinicId': clinicId,
      'patientId': patientId,
      'patientNameFa': patientNameFa,
      'phoneMasked': phoneMasked,
      'protocolType': protocolType,
      'eyeLaterality': eyeLaterality.toJson(),
      'eyeLabelFa': eyeLabelFa,
      'surgeonId': surgeonId,
      'accessMode': accessMode.toJson(),
      'activePrescriptionVersion': activePrescriptionVersion,
      'status': status,
      'anchorAtIso': anchorAtIso,
      'anchorAtJalali': anchorAtJalali,
    };
  }
}

class CareEpisodeWorklistResponse {
  final List<CareEpisodeWorklistItem> items;
  final int total;

  const CareEpisodeWorklistResponse({
    required this.items,
    required this.total,
  });

  factory CareEpisodeWorklistResponse.fromJson(Map<String, Object?> json) {
    return CareEpisodeWorklistResponse(
      items: (json['items'] as List<Object?>).map((e) => CareEpisodeWorklistItem.fromJson(e as Map<String, Object?>)).toList(),
      total: (json['total'] as num).toInt(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
      'total': total,
    };
  }
}

class CloseEpisodeRequest {
  final String? status;
  final String reasonFa;

  const CloseEpisodeRequest({
    this.status,
    required this.reasonFa,
  });

  factory CloseEpisodeRequest.fromJson(Map<String, Object?> json) {
    return CloseEpisodeRequest(
      status: json['status'] as String?,
      reasonFa: json['reasonFa'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'status': status,
      'reasonFa': reasonFa,
    };
  }
}

class PrescriptionHistoryListResponse {
  final List<PrescriptionVersion> items;

  const PrescriptionHistoryListResponse({
    required this.items,
  });

  factory PrescriptionHistoryListResponse.fromJson(Map<String, Object?> json) {
    return PrescriptionHistoryListResponse(
      items: (json['items'] as List<Object?>).map((e) => PrescriptionVersion.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
    };
  }
}

class EpisodeSymptomHistoryItem {
  final String reportId;
  final String episodeId;
  final EyeLaterality eyeLaterality;
  final String eyeLabelFa;
  final bool severePain;
  final bool suddenVisionLoss;
  final bool purulentDischarge;
  final bool flashesOrCurtain;
  final String freeTextFa;
  final UrgencyTier urgencyTier;
  final String urgencyLabelFa;
  final List<Map<String, Object?>>? signals;
  final String createdAtIso;
  final String createdAtJalali;

  const EpisodeSymptomHistoryItem({
    required this.reportId,
    required this.episodeId,
    required this.eyeLaterality,
    required this.eyeLabelFa,
    required this.severePain,
    required this.suddenVisionLoss,
    required this.purulentDischarge,
    required this.flashesOrCurtain,
    required this.freeTextFa,
    required this.urgencyTier,
    required this.urgencyLabelFa,
    this.signals,
    required this.createdAtIso,
    required this.createdAtJalali,
  });

  factory EpisodeSymptomHistoryItem.fromJson(Map<String, Object?> json) {
    return EpisodeSymptomHistoryItem(
      reportId: json['reportId'] as String,
      episodeId: json['episodeId'] as String,
      eyeLaterality: EyeLaterality.fromJson(json['eyeLaterality'] as String),
      eyeLabelFa: json['eyeLabelFa'] as String,
      severePain: json['severePain'] as bool,
      suddenVisionLoss: json['suddenVisionLoss'] as bool,
      purulentDischarge: json['purulentDischarge'] as bool,
      flashesOrCurtain: json['flashesOrCurtain'] as bool,
      freeTextFa: json['freeTextFa'] as String,
      urgencyTier: UrgencyTier.fromJson(json['urgencyTier'] as String),
      urgencyLabelFa: json['urgencyLabelFa'] as String,
      signals: json['signals'] == null ? null : (json['signals'] as List<Object?>).map((e) => e as Map<String, Object?>).toList(),
      createdAtIso: json['createdAtIso'] as String,
      createdAtJalali: json['createdAtJalali'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'reportId': reportId,
      'episodeId': episodeId,
      'eyeLaterality': eyeLaterality.toJson(),
      'eyeLabelFa': eyeLabelFa,
      'severePain': severePain,
      'suddenVisionLoss': suddenVisionLoss,
      'purulentDischarge': purulentDischarge,
      'flashesOrCurtain': flashesOrCurtain,
      'freeTextFa': freeTextFa,
      'urgencyTier': urgencyTier.toJson(),
      'urgencyLabelFa': urgencyLabelFa,
      'signals': signals,
      'createdAtIso': createdAtIso,
      'createdAtJalali': createdAtJalali,
    };
  }
}

class EpisodeSymptomListResponse {
  final List<EpisodeSymptomHistoryItem> items;

  const EpisodeSymptomListResponse({
    required this.items,
  });

  factory EpisodeSymptomListResponse.fromJson(Map<String, Object?> json) {
    return EpisodeSymptomListResponse(
      items: (json['items'] as List<Object?>).map((e) => EpisodeSymptomHistoryItem.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
    };
  }
}

class PrintPhoneQueueItem {
  final String episodeId;
  final String patientId;
  final String patientNameFa;
  final String phoneMasked;
  final EyeLaterality eyeLaterality;
  final String eyeLabelFa;
  final int activePrescriptionVersion;
  final int pendingTaskCount;
  final String? lastOutreachAtIso;
  final String? lastOutreachOutcomeFa;

  const PrintPhoneQueueItem({
    required this.episodeId,
    required this.patientId,
    required this.patientNameFa,
    required this.phoneMasked,
    required this.eyeLaterality,
    required this.eyeLabelFa,
    required this.activePrescriptionVersion,
    required this.pendingTaskCount,
    this.lastOutreachAtIso,
    this.lastOutreachOutcomeFa,
  });

  factory PrintPhoneQueueItem.fromJson(Map<String, Object?> json) {
    return PrintPhoneQueueItem(
      episodeId: json['episodeId'] as String,
      patientId: json['patientId'] as String,
      patientNameFa: json['patientNameFa'] as String,
      phoneMasked: json['phoneMasked'] as String,
      eyeLaterality: EyeLaterality.fromJson(json['eyeLaterality'] as String),
      eyeLabelFa: json['eyeLabelFa'] as String,
      activePrescriptionVersion: (json['activePrescriptionVersion'] as num).toInt(),
      pendingTaskCount: (json['pendingTaskCount'] as num).toInt(),
      lastOutreachAtIso: json['lastOutreachAtIso'] as String?,
      lastOutreachOutcomeFa: json['lastOutreachOutcomeFa'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'episodeId': episodeId,
      'patientId': patientId,
      'patientNameFa': patientNameFa,
      'phoneMasked': phoneMasked,
      'eyeLaterality': eyeLaterality.toJson(),
      'eyeLabelFa': eyeLabelFa,
      'activePrescriptionVersion': activePrescriptionVersion,
      'pendingTaskCount': pendingTaskCount,
      'lastOutreachAtIso': lastOutreachAtIso,
      'lastOutreachOutcomeFa': lastOutreachOutcomeFa,
    };
  }
}

class PrintPhoneQueueResponse {
  final List<PrintPhoneQueueItem> items;
  final int total;

  const PrintPhoneQueueResponse({
    required this.items,
    required this.total,
  });

  factory PrintPhoneQueueResponse.fromJson(Map<String, Object?> json) {
    return PrintPhoneQueueResponse(
      items: (json['items'] as List<Object?>).map((e) => PrintPhoneQueueItem.fromJson(e as Map<String, Object?>)).toList(),
      total: (json['total'] as num).toInt(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
      'total': total,
    };
  }
}

class PrintPhoneOutreachRequest {
  final String? status;
  final String outcomeFa;

  const PrintPhoneOutreachRequest({
    this.status,
    required this.outcomeFa,
  });

  factory PrintPhoneOutreachRequest.fromJson(Map<String, Object?> json) {
    return PrintPhoneOutreachRequest(
      status: json['status'] as String?,
      outcomeFa: json['outcomeFa'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'status': status,
      'outcomeFa': outcomeFa,
    };
  }
}

class PrintPhoneOutreachRecord {
  final String taskId;
  final String episodeId;
  final String patientId;
  final String status;
  final String outcomeFa;
  final String recordedAtIso;

  const PrintPhoneOutreachRecord({
    required this.taskId,
    required this.episodeId,
    required this.patientId,
    required this.status,
    required this.outcomeFa,
    required this.recordedAtIso,
  });

  factory PrintPhoneOutreachRecord.fromJson(Map<String, Object?> json) {
    return PrintPhoneOutreachRecord(
      taskId: json['taskId'] as String,
      episodeId: json['episodeId'] as String,
      patientId: json['patientId'] as String,
      status: json['status'] as String,
      outcomeFa: json['outcomeFa'] as String,
      recordedAtIso: json['recordedAtIso'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'taskId': taskId,
      'episodeId': episodeId,
      'patientId': patientId,
      'status': status,
      'outcomeFa': outcomeFa,
      'recordedAtIso': recordedAtIso,
    };
  }
}

class TriageCaseDetailResponse {
  final TriageCase triageCase;
  final List<Map<String, Object?>> triggers;
  final List<Map<String, Object?>> contactLogs;
  final List<ReferralRecord> referrals;
  final List<FollowUpTaskRecord> followUpTasks;

  const TriageCaseDetailResponse({
    required this.triageCase,
    required this.triggers,
    required this.contactLogs,
    required this.referrals,
    required this.followUpTasks,
  });

  factory TriageCaseDetailResponse.fromJson(Map<String, Object?> json) {
    return TriageCaseDetailResponse(
      triageCase: TriageCase.fromJson(json['triageCase'] as Map<String, Object?>),
      triggers: (json['triggers'] as List<Object?>).map((e) => e as Map<String, Object?>).toList(),
      contactLogs: (json['contactLogs'] as List<Object?>).map((e) => e as Map<String, Object?>).toList(),
      referrals: (json['referrals'] as List<Object?>).map((e) => ReferralRecord.fromJson(e as Map<String, Object?>)).toList(),
      followUpTasks: (json['followUpTasks'] as List<Object?>).map((e) => FollowUpTaskRecord.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'triageCase': triageCase.toJson(),
      'triggers': triggers,
      'contactLogs': contactLogs,
      'referrals': referrals.map((e) => e.toJson()).toList(),
      'followUpTasks': followUpTasks.map((e) => e.toJson()).toList(),
    };
  }
}

class TriageContactRequest {
  final String outcome;
  final String? channel;
  final String noteFa;

  const TriageContactRequest({
    required this.outcome,
    this.channel,
    required this.noteFa,
  });

  factory TriageContactRequest.fromJson(Map<String, Object?> json) {
    return TriageContactRequest(
      outcome: json['outcome'] as String,
      channel: json['channel'] as String?,
      noteFa: json['noteFa'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'outcome': outcome,
      'channel': channel,
      'noteFa': noteFa,
    };
  }
}

class CloseTriageCaseRequest {
  final String resolutionNoteFa;
  final String? resolutionType;

  const CloseTriageCaseRequest({
    required this.resolutionNoteFa,
    this.resolutionType,
  });

  factory CloseTriageCaseRequest.fromJson(Map<String, Object?> json) {
    return CloseTriageCaseRequest(
      resolutionNoteFa: json['resolutionNoteFa'] as String,
      resolutionType: json['resolutionType'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'resolutionNoteFa': resolutionNoteFa,
      'resolutionType': resolutionType,
    };
  }
}

class ClinicOutageRecord {
  final String outageId;
  final String tenantId;
  final String clinicId;
  final String titleFa;
  final String status;
  final String severity;
  final String affectedChannel;
  final String mitigationNoteFa;
  final String startedAtIso;
  final String? resolvedAtIso;
  final String createdByUserId;
  final String createdAtIso;

  const ClinicOutageRecord({
    required this.outageId,
    required this.tenantId,
    required this.clinicId,
    required this.titleFa,
    required this.status,
    required this.severity,
    required this.affectedChannel,
    required this.mitigationNoteFa,
    required this.startedAtIso,
    this.resolvedAtIso,
    required this.createdByUserId,
    required this.createdAtIso,
  });

  factory ClinicOutageRecord.fromJson(Map<String, Object?> json) {
    return ClinicOutageRecord(
      outageId: json['outageId'] as String,
      tenantId: json['tenantId'] as String,
      clinicId: json['clinicId'] as String,
      titleFa: json['titleFa'] as String,
      status: json['status'] as String,
      severity: json['severity'] as String,
      affectedChannel: json['affectedChannel'] as String,
      mitigationNoteFa: json['mitigationNoteFa'] as String,
      startedAtIso: json['startedAtIso'] as String,
      resolvedAtIso: json['resolvedAtIso'] as String?,
      createdByUserId: json['createdByUserId'] as String,
      createdAtIso: json['createdAtIso'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'outageId': outageId,
      'tenantId': tenantId,
      'clinicId': clinicId,
      'titleFa': titleFa,
      'status': status,
      'severity': severity,
      'affectedChannel': affectedChannel,
      'mitigationNoteFa': mitigationNoteFa,
      'startedAtIso': startedAtIso,
      'resolvedAtIso': resolvedAtIso,
      'createdByUserId': createdByUserId,
      'createdAtIso': createdAtIso,
    };
  }
}

class ClinicOutageListResponse {
  final List<ClinicOutageRecord> items;

  const ClinicOutageListResponse({
    required this.items,
  });

  factory ClinicOutageListResponse.fromJson(Map<String, Object?> json) {
    return ClinicOutageListResponse(
      items: (json['items'] as List<Object?>).map((e) => ClinicOutageRecord.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
    };
  }
}

class CreateClinicOutageRequest {
  final String titleFa;
  final String? severity;
  final String affectedChannel;
  final String? mitigationNoteFa;

  const CreateClinicOutageRequest({
    required this.titleFa,
    this.severity,
    required this.affectedChannel,
    this.mitigationNoteFa,
  });

  factory CreateClinicOutageRequest.fromJson(Map<String, Object?> json) {
    return CreateClinicOutageRequest(
      titleFa: json['titleFa'] as String,
      severity: json['severity'] as String?,
      affectedChannel: json['affectedChannel'] as String,
      mitigationNoteFa: json['mitigationNoteFa'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'titleFa': titleFa,
      'severity': severity,
      'affectedChannel': affectedChannel,
      'mitigationNoteFa': mitigationNoteFa,
    };
  }
}

class UpdateClinicOutageRequest {
  final String? status;
  final String? severity;
  final String? mitigationNoteFa;

  const UpdateClinicOutageRequest({
    this.status,
    this.severity,
    this.mitigationNoteFa,
  });

  factory UpdateClinicOutageRequest.fromJson(Map<String, Object?> json) {
    return UpdateClinicOutageRequest(
      status: json['status'] as String?,
      severity: json['severity'] as String?,
      mitigationNoteFa: json['mitigationNoteFa'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'status': status,
      'severity': severity,
      'mitigationNoteFa': mitigationNoteFa,
    };
  }
}

class ReferralListResponse {
  final List<ReferralRecord> items;
  final int total;

  const ReferralListResponse({
    required this.items,
    required this.total,
  });

  factory ReferralListResponse.fromJson(Map<String, Object?> json) {
    return ReferralListResponse(
      items: (json['items'] as List<Object?>).map((e) => ReferralRecord.fromJson(e as Map<String, Object?>)).toList(),
      total: (json['total'] as num).toInt(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
      'total': total,
    };
  }
}

class UpdateReferralOutcomeRequest {
  final String status;
  final String? missReasonFa;

  const UpdateReferralOutcomeRequest({
    required this.status,
    this.missReasonFa,
  });

  factory UpdateReferralOutcomeRequest.fromJson(Map<String, Object?> json) {
    return UpdateReferralOutcomeRequest(
      status: json['status'] as String,
      missReasonFa: json['missReasonFa'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'status': status,
      'missReasonFa': missReasonFa,
    };
  }
}

class FollowUpTaskRecord {
  final String taskId;
  final String tenantId;
  final String clinicId;
  final String patientId;
  final String? patientNameFa;
  final String? episodeId;
  final String? triageCaseId;
  final StudyLaterality? eyeLaterality;
  final String? eyeLabelFa;
  final String taskType;
  final String dueAtIso;
  final String dueAtJalali;
  final String status;
  final String? assignedUserId;
  final String? outcomeFa;
  final String? completedAtIso;
  final String createdAtIso;
  final String updatedAtIso;

  const FollowUpTaskRecord({
    required this.taskId,
    required this.tenantId,
    required this.clinicId,
    required this.patientId,
    this.patientNameFa,
    this.episodeId,
    this.triageCaseId,
    this.eyeLaterality,
    this.eyeLabelFa,
    required this.taskType,
    required this.dueAtIso,
    required this.dueAtJalali,
    required this.status,
    this.assignedUserId,
    this.outcomeFa,
    this.completedAtIso,
    required this.createdAtIso,
    required this.updatedAtIso,
  });

  factory FollowUpTaskRecord.fromJson(Map<String, Object?> json) {
    return FollowUpTaskRecord(
      taskId: json['taskId'] as String,
      tenantId: json['tenantId'] as String,
      clinicId: json['clinicId'] as String,
      patientId: json['patientId'] as String,
      patientNameFa: json['patientNameFa'] as String?,
      episodeId: json['episodeId'] as String?,
      triageCaseId: json['triageCaseId'] as String?,
      eyeLaterality: json['eyeLaterality'] == null ? null : StudyLaterality.fromJson(json['eyeLaterality'] as String),
      eyeLabelFa: json['eyeLabelFa'] as String?,
      taskType: json['taskType'] as String,
      dueAtIso: json['dueAtIso'] as String,
      dueAtJalali: json['dueAtJalali'] as String,
      status: json['status'] as String,
      assignedUserId: json['assignedUserId'] as String?,
      outcomeFa: json['outcomeFa'] as String?,
      completedAtIso: json['completedAtIso'] as String?,
      createdAtIso: json['createdAtIso'] as String,
      updatedAtIso: json['updatedAtIso'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'taskId': taskId,
      'tenantId': tenantId,
      'clinicId': clinicId,
      'patientId': patientId,
      'patientNameFa': patientNameFa,
      'episodeId': episodeId,
      'triageCaseId': triageCaseId,
      'eyeLaterality': eyeLaterality?.toJson(),
      'eyeLabelFa': eyeLabelFa,
      'taskType': taskType,
      'dueAtIso': dueAtIso,
      'dueAtJalali': dueAtJalali,
      'status': status,
      'assignedUserId': assignedUserId,
      'outcomeFa': outcomeFa,
      'completedAtIso': completedAtIso,
      'createdAtIso': createdAtIso,
      'updatedAtIso': updatedAtIso,
    };
  }
}

class FollowUpTaskListResponse {
  final List<FollowUpTaskRecord> items;
  final int total;

  const FollowUpTaskListResponse({
    required this.items,
    required this.total,
  });

  factory FollowUpTaskListResponse.fromJson(Map<String, Object?> json) {
    return FollowUpTaskListResponse(
      items: (json['items'] as List<Object?>).map((e) => FollowUpTaskRecord.fromJson(e as Map<String, Object?>)).toList(),
      total: (json['total'] as num).toInt(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
      'total': total,
    };
  }
}

class CreateFollowUpTaskRequest {
  final String patientId;
  final String? episodeId;
  final String? triageCaseId;
  final StudyLaterality? eyeLaterality;
  final String taskType;
  final String dueAt;
  final String? assignedUserId;
  final String? outcomeFa;

  const CreateFollowUpTaskRequest({
    required this.patientId,
    this.episodeId,
    this.triageCaseId,
    this.eyeLaterality,
    required this.taskType,
    required this.dueAt,
    this.assignedUserId,
    this.outcomeFa,
  });

  factory CreateFollowUpTaskRequest.fromJson(Map<String, Object?> json) {
    return CreateFollowUpTaskRequest(
      patientId: json['patientId'] as String,
      episodeId: json['episodeId'] as String?,
      triageCaseId: json['triageCaseId'] as String?,
      eyeLaterality: json['eyeLaterality'] == null ? null : StudyLaterality.fromJson(json['eyeLaterality'] as String),
      taskType: json['taskType'] as String,
      dueAt: json['dueAt'] as String,
      assignedUserId: json['assignedUserId'] as String?,
      outcomeFa: json['outcomeFa'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'patientId': patientId,
      'episodeId': episodeId,
      'triageCaseId': triageCaseId,
      'eyeLaterality': eyeLaterality?.toJson(),
      'taskType': taskType,
      'dueAt': dueAt,
      'assignedUserId': assignedUserId,
      'outcomeFa': outcomeFa,
    };
  }
}

class UpdateFollowUpTaskRequest {
  final String? status;
  final String? assignedUserId;
  final String? outcomeFa;

  const UpdateFollowUpTaskRequest({
    this.status,
    this.assignedUserId,
    this.outcomeFa,
  });

  factory UpdateFollowUpTaskRequest.fromJson(Map<String, Object?> json) {
    return UpdateFollowUpTaskRequest(
      status: json['status'] as String?,
      assignedUserId: json['assignedUserId'] as String?,
      outcomeFa: json['outcomeFa'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'status': status,
      'assignedUserId': assignedUserId,
      'outcomeFa': outcomeFa,
    };
  }
}

class DiagnosticStudyWorklistItem {
  final String studyId;
  final String patientId;
  final String patientNameFa;
  final String clinicId;
  final StudyLaterality eyeLaterality;
  final String eyeLabelFa;
  final StudyStatus status;
  final UrgencyTier? urgencyTier;
  final String? urgencyLabelFa;
  final bool urgentFloorActive;
  final List<String> modalities;
  final String? topConditionNameFa;
  final String createdAtIso;
  final String createdAtJalali;
  final String? signedAtIso;

  const DiagnosticStudyWorklistItem({
    required this.studyId,
    required this.patientId,
    required this.patientNameFa,
    required this.clinicId,
    required this.eyeLaterality,
    required this.eyeLabelFa,
    required this.status,
    this.urgencyTier,
    this.urgencyLabelFa,
    required this.urgentFloorActive,
    required this.modalities,
    this.topConditionNameFa,
    required this.createdAtIso,
    required this.createdAtJalali,
    this.signedAtIso,
  });

  factory DiagnosticStudyWorklistItem.fromJson(Map<String, Object?> json) {
    return DiagnosticStudyWorklistItem(
      studyId: json['studyId'] as String,
      patientId: json['patientId'] as String,
      patientNameFa: json['patientNameFa'] as String,
      clinicId: json['clinicId'] as String,
      eyeLaterality: StudyLaterality.fromJson(json['eyeLaterality'] as String),
      eyeLabelFa: json['eyeLabelFa'] as String,
      status: StudyStatus.fromJson(json['status'] as String),
      urgencyTier: json['urgencyTier'] == null ? null : UrgencyTier.fromJson(json['urgencyTier'] as String),
      urgencyLabelFa: json['urgencyLabelFa'] as String?,
      urgentFloorActive: json['urgentFloorActive'] as bool,
      modalities: (json['modalities'] as List<Object?>).map((e) => e as String).toList(),
      topConditionNameFa: json['topConditionNameFa'] as String?,
      createdAtIso: json['createdAtIso'] as String,
      createdAtJalali: json['createdAtJalali'] as String,
      signedAtIso: json['signedAtIso'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'studyId': studyId,
      'patientId': patientId,
      'patientNameFa': patientNameFa,
      'clinicId': clinicId,
      'eyeLaterality': eyeLaterality.toJson(),
      'eyeLabelFa': eyeLabelFa,
      'status': status.toJson(),
      'urgencyTier': urgencyTier?.toJson(),
      'urgencyLabelFa': urgencyLabelFa,
      'urgentFloorActive': urgentFloorActive,
      'modalities': modalities,
      'topConditionNameFa': topConditionNameFa,
      'createdAtIso': createdAtIso,
      'createdAtJalali': createdAtJalali,
      'signedAtIso': signedAtIso,
    };
  }
}

class DiagnosticStudyWorklistResponse {
  final List<DiagnosticStudyWorklistItem> items;
  final int total;

  const DiagnosticStudyWorklistResponse({
    required this.items,
    required this.total,
  });

  factory DiagnosticStudyWorklistResponse.fromJson(Map<String, Object?> json) {
    return DiagnosticStudyWorklistResponse(
      items: (json['items'] as List<Object?>).map((e) => DiagnosticStudyWorklistItem.fromJson(e as Map<String, Object?>)).toList(),
      total: (json['total'] as num).toInt(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
      'total': total,
    };
  }
}

class AddRecaptureAssetsRequest {
  final List<StudyAssetInput> assets;

  const AddRecaptureAssetsRequest({
    required this.assets,
  });

  factory AddRecaptureAssetsRequest.fromJson(Map<String, Object?> json) {
    return AddRecaptureAssetsRequest(
      assets: (json['assets'] as List<Object?>).map((e) => StudyAssetInput.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'assets': assets.map((e) => e.toJson()).toList(),
    };
  }
}

class StudyInferenceJobRecord {
  final String jobId;
  final String studyId;
  final String engineMode;
  final Map<String, Object?> modelVersions;
  final String status;
  final String? startedAtIso;
  final String? completedAtIso;
  final String? errorCode;
  final String createdAtIso;

  const StudyInferenceJobRecord({
    required this.jobId,
    required this.studyId,
    required this.engineMode,
    required this.modelVersions,
    required this.status,
    this.startedAtIso,
    this.completedAtIso,
    this.errorCode,
    required this.createdAtIso,
  });

  factory StudyInferenceJobRecord.fromJson(Map<String, Object?> json) {
    return StudyInferenceJobRecord(
      jobId: json['jobId'] as String,
      studyId: json['studyId'] as String,
      engineMode: json['engineMode'] as String,
      modelVersions: json['modelVersions'] as Map<String, Object?>,
      status: json['status'] as String,
      startedAtIso: json['startedAtIso'] as String?,
      completedAtIso: json['completedAtIso'] as String?,
      errorCode: json['errorCode'] as String?,
      createdAtIso: json['createdAtIso'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'jobId': jobId,
      'studyId': studyId,
      'engineMode': engineMode,
      'modelVersions': modelVersions,
      'status': status,
      'startedAtIso': startedAtIso,
      'completedAtIso': completedAtIso,
      'errorCode': errorCode,
      'createdAtIso': createdAtIso,
    };
  }
}

class StudyInferenceJobListResponse {
  final List<StudyInferenceJobRecord> items;

  const StudyInferenceJobListResponse({
    required this.items,
  });

  factory StudyInferenceJobListResponse.fromJson(Map<String, Object?> json) {
    return StudyInferenceJobListResponse(
      items: (json['items'] as List<Object?>).map((e) => StudyInferenceJobRecord.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
    };
  }
}

class SaveReportDraftRequest {
  final int expectedDraftVersion;
  final String titleFa;
  final String modalityFindingsFa;
  final String differentialSummaryFa;
  final String crossModalCorrelationFa;
  final String followUpPlanFa;
  final UrgencyTier urgencyTier;
  final List<String>? evidenceIds;

  const SaveReportDraftRequest({
    required this.expectedDraftVersion,
    required this.titleFa,
    required this.modalityFindingsFa,
    required this.differentialSummaryFa,
    required this.crossModalCorrelationFa,
    required this.followUpPlanFa,
    required this.urgencyTier,
    this.evidenceIds,
  });

  factory SaveReportDraftRequest.fromJson(Map<String, Object?> json) {
    return SaveReportDraftRequest(
      expectedDraftVersion: (json['expectedDraftVersion'] as num).toInt(),
      titleFa: json['titleFa'] as String,
      modalityFindingsFa: json['modalityFindingsFa'] as String,
      differentialSummaryFa: json['differentialSummaryFa'] as String,
      crossModalCorrelationFa: json['crossModalCorrelationFa'] as String,
      followUpPlanFa: json['followUpPlanFa'] as String,
      urgencyTier: UrgencyTier.fromJson(json['urgencyTier'] as String),
      evidenceIds: json['evidenceIds'] == null ? null : (json['evidenceIds'] as List<Object?>).map((e) => e as String).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'expectedDraftVersion': expectedDraftVersion,
      'titleFa': titleFa,
      'modalityFindingsFa': modalityFindingsFa,
      'differentialSummaryFa': differentialSummaryFa,
      'crossModalCorrelationFa': crossModalCorrelationFa,
      'followUpPlanFa': followUpPlanFa,
      'urgencyTier': urgencyTier.toJson(),
      'evidenceIds': evidenceIds,
    };
  }
}

class ClinicianFeedbackRecord {
  final String feedbackId;
  final String studyId;
  final String clinicianUserId;
  final String targetLayer;
  final String agreementState;
  final String? correctedLabelCode;
  final String noteFa;
  final String createdAtIso;

  const ClinicianFeedbackRecord({
    required this.feedbackId,
    required this.studyId,
    required this.clinicianUserId,
    required this.targetLayer,
    required this.agreementState,
    this.correctedLabelCode,
    required this.noteFa,
    required this.createdAtIso,
  });

  factory ClinicianFeedbackRecord.fromJson(Map<String, Object?> json) {
    return ClinicianFeedbackRecord(
      feedbackId: json['feedbackId'] as String,
      studyId: json['studyId'] as String,
      clinicianUserId: json['clinicianUserId'] as String,
      targetLayer: json['targetLayer'] as String,
      agreementState: json['agreementState'] as String,
      correctedLabelCode: json['correctedLabelCode'] as String?,
      noteFa: json['noteFa'] as String,
      createdAtIso: json['createdAtIso'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'feedbackId': feedbackId,
      'studyId': studyId,
      'clinicianUserId': clinicianUserId,
      'targetLayer': targetLayer,
      'agreementState': agreementState,
      'correctedLabelCode': correctedLabelCode,
      'noteFa': noteFa,
      'createdAtIso': createdAtIso,
    };
  }
}

class ClinicianFeedbackListResponse {
  final List<ClinicianFeedbackRecord> items;

  const ClinicianFeedbackListResponse({
    required this.items,
  });

  factory ClinicianFeedbackListResponse.fromJson(Map<String, Object?> json) {
    return ClinicianFeedbackListResponse(
      items: (json['items'] as List<Object?>).map((e) => ClinicianFeedbackRecord.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
    };
  }
}

class CreateClinicianFeedbackRequest {
  final String targetLayer;
  final String agreementState;
  final String? correctedLabelCode;
  final String? noteFa;

  const CreateClinicianFeedbackRequest({
    required this.targetLayer,
    required this.agreementState,
    this.correctedLabelCode,
    this.noteFa,
  });

  factory CreateClinicianFeedbackRequest.fromJson(Map<String, Object?> json) {
    return CreateClinicianFeedbackRequest(
      targetLayer: json['targetLayer'] as String,
      agreementState: json['agreementState'] as String,
      correctedLabelCode: json['correctedLabelCode'] as String?,
      noteFa: json['noteFa'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'targetLayer': targetLayer,
      'agreementState': agreementState,
      'correctedLabelCode': correctedLabelCode,
      'noteFa': noteFa,
    };
  }
}

class BiomarkerDelta {
  final String metricKey;
  final double currentValue;
  final double priorValue;
  final double delta;

  const BiomarkerDelta({
    required this.metricKey,
    required this.currentValue,
    required this.priorValue,
    required this.delta,
  });

  factory BiomarkerDelta.fromJson(Map<String, Object?> json) {
    return BiomarkerDelta(
      metricKey: json['metricKey'] as String,
      currentValue: (json['currentValue'] as num).toDouble(),
      priorValue: (json['priorValue'] as num).toDouble(),
      delta: (json['delta'] as num).toDouble(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'metricKey': metricKey,
      'currentValue': currentValue,
      'priorValue': priorValue,
      'delta': delta,
    };
  }
}

class StudyComparisonResponse {
  final DiagnosticStudyDetail currentStudy;
  final List<DiagnosticStudyDetail> priorStudies;
  final List<BiomarkerDelta> biomarkerDeltas;

  const StudyComparisonResponse({
    required this.currentStudy,
    required this.priorStudies,
    required this.biomarkerDeltas,
  });

  factory StudyComparisonResponse.fromJson(Map<String, Object?> json) {
    return StudyComparisonResponse(
      currentStudy: DiagnosticStudyDetail.fromJson(json['currentStudy'] as Map<String, Object?>),
      priorStudies: (json['priorStudies'] as List<Object?>).map((e) => DiagnosticStudyDetail.fromJson(e as Map<String, Object?>)).toList(),
      biomarkerDeltas: (json['biomarkerDeltas'] as List<Object?>).map((e) => BiomarkerDelta.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'currentStudy': currentStudy.toJson(),
      'priorStudies': priorStudies.map((e) => e.toJson()).toList(),
      'biomarkerDeltas': biomarkerDeltas.map((e) => e.toJson()).toList(),
    };
  }
}

class FhirBundleResponse {
  final String resourceType;
  final String id;
  final String type;
  final String timestamp;
  final List<Map<String, Object?>> entry;

  const FhirBundleResponse({
    required this.resourceType,
    required this.id,
    required this.type,
    required this.timestamp,
    required this.entry,
  });

  factory FhirBundleResponse.fromJson(Map<String, Object?> json) {
    return FhirBundleResponse(
      resourceType: json['resourceType'] as String,
      id: json['id'] as String,
      type: json['type'] as String,
      timestamp: json['timestamp'] as String,
      entry: (json['entry'] as List<Object?>).map((e) => e as Map<String, Object?>).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'resourceType': resourceType,
      'id': id,
      'type': type,
      'timestamp': timestamp,
      'entry': entry,
    };
  }
}

class DicomRawTags {
  final String? patientName;
  final String? patientId;
  final String? patientBirthDate;
  final String? patientTelephone;
  final String? institutionName;
  final String? performingPhysicianName;
  final String? referringPhysicianName;
  final String? studyInstanceUid;
  final String? seriesInstanceUid;
  final String? sopInstanceUid;
  final String? modality;
  final String? imageLaterality;
  final String? studyDate;

  const DicomRawTags({
    this.patientName,
    this.patientId,
    this.patientBirthDate,
    this.patientTelephone,
    this.institutionName,
    this.performingPhysicianName,
    this.referringPhysicianName,
    this.studyInstanceUid,
    this.seriesInstanceUid,
    this.sopInstanceUid,
    this.modality,
    this.imageLaterality,
    this.studyDate,
  });

  factory DicomRawTags.fromJson(Map<String, Object?> json) {
    return DicomRawTags(
      patientName: json['patientName'] as String?,
      patientId: json['patientId'] as String?,
      patientBirthDate: json['patientBirthDate'] as String?,
      patientTelephone: json['patientTelephone'] as String?,
      institutionName: json['institutionName'] as String?,
      performingPhysicianName: json['performingPhysicianName'] as String?,
      referringPhysicianName: json['referringPhysicianName'] as String?,
      studyInstanceUid: json['studyInstanceUid'] as String?,
      seriesInstanceUid: json['seriesInstanceUid'] as String?,
      sopInstanceUid: json['sopInstanceUid'] as String?,
      modality: json['modality'] as String?,
      imageLaterality: json['imageLaterality'] as String?,
      studyDate: json['studyDate'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'patientName': patientName,
      'patientId': patientId,
      'patientBirthDate': patientBirthDate,
      'patientTelephone': patientTelephone,
      'institutionName': institutionName,
      'performingPhysicianName': performingPhysicianName,
      'referringPhysicianName': referringPhysicianName,
      'studyInstanceUid': studyInstanceUid,
      'seriesInstanceUid': seriesInstanceUid,
      'sopInstanceUid': sopInstanceUid,
      'modality': modality,
      'imageLaterality': imageLaterality,
      'studyDate': studyDate,
    };
  }
}

class DicomIngestItem {
  final String assetId;
  final String s3ObjectKey;
  final DiagnosticModality? declaredModalityHint;
  final DicomRawTags rawTags;

  const DicomIngestItem({
    required this.assetId,
    required this.s3ObjectKey,
    this.declaredModalityHint,
    required this.rawTags,
  });

  factory DicomIngestItem.fromJson(Map<String, Object?> json) {
    return DicomIngestItem(
      assetId: json['assetId'] as String,
      s3ObjectKey: json['s3ObjectKey'] as String,
      declaredModalityHint: json['declaredModalityHint'] == null ? null : DiagnosticModality.fromJson(json['declaredModalityHint'] as String),
      rawTags: DicomRawTags.fromJson(json['rawTags'] as Map<String, Object?>),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'assetId': assetId,
      's3ObjectKey': s3ObjectKey,
      'declaredModalityHint': declaredModalityHint?.toJson(),
      'rawTags': rawTags.toJson(),
    };
  }
}

class DicomIngestRequest {
  final String patientId;
  final StudyLaterality eyeLaterality;
  final List<DicomIngestItem> dicomItems;
  final ClinicalLabsInput? labs;

  const DicomIngestRequest({
    required this.patientId,
    required this.eyeLaterality,
    required this.dicomItems,
    this.labs,
  });

  factory DicomIngestRequest.fromJson(Map<String, Object?> json) {
    return DicomIngestRequest(
      patientId: json['patientId'] as String,
      eyeLaterality: StudyLaterality.fromJson(json['eyeLaterality'] as String),
      dicomItems: (json['dicomItems'] as List<Object?>).map((e) => DicomIngestItem.fromJson(e as Map<String, Object?>)).toList(),
      labs: json['labs'] == null ? null : ClinicalLabsInput.fromJson(json['labs'] as Map<String, Object?>),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'patientId': patientId,
      'eyeLaterality': eyeLaterality.toJson(),
      'dicomItems': dicomItems.map((e) => e.toJson()).toList(),
      'labs': labs?.toJson(),
    };
  }
}

class AnonymizedDicomSnapshot {
  final String pseudonymId;
  final String sha256;
  final Map<String, Object?> scrubbedTags;

  const AnonymizedDicomSnapshot({
    required this.pseudonymId,
    required this.sha256,
    required this.scrubbedTags,
  });

  factory AnonymizedDicomSnapshot.fromJson(Map<String, Object?> json) {
    return AnonymizedDicomSnapshot(
      pseudonymId: json['pseudonymId'] as String,
      sha256: json['sha256'] as String,
      scrubbedTags: json['scrubbedTags'] as Map<String, Object?>,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'pseudonymId': pseudonymId,
      'sha256': sha256,
      'scrubbedTags': scrubbedTags,
    };
  }
}

class DicomIngestResponse {
  final DiagnosticStudyDetail study;
  final List<AnonymizedDicomSnapshot> anonymizedSnapshots;

  const DicomIngestResponse({
    required this.study,
    required this.anonymizedSnapshots,
  });

  factory DicomIngestResponse.fromJson(Map<String, Object?> json) {
    return DicomIngestResponse(
      study: DiagnosticStudyDetail.fromJson(json['study'] as Map<String, Object?>),
      anonymizedSnapshots: (json['anonymizedSnapshots'] as List<Object?>).map((e) => AnonymizedDicomSnapshot.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'study': study.toJson(),
      'anonymizedSnapshots': anonymizedSnapshots.map((e) => e.toJson()).toList(),
    };
  }
}

class HomeVisionTestTrialInput {
  final int trialIndex;
  final Map<String, Object?> stimulus;
  final Map<String, Object?> response;
  final int? reactionMs;
  final bool? correct;

  const HomeVisionTestTrialInput({
    required this.trialIndex,
    required this.stimulus,
    required this.response,
    this.reactionMs,
    this.correct,
  });

  factory HomeVisionTestTrialInput.fromJson(Map<String, Object?> json) {
    return HomeVisionTestTrialInput(
      trialIndex: (json['trialIndex'] as num).toInt(),
      stimulus: json['stimulus'] as Map<String, Object?>,
      response: json['response'] as Map<String, Object?>,
      reactionMs: (json['reactionMs'] as num?)?.toInt(),
      correct: json['correct'] as bool?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'trialIndex': trialIndex,
      'stimulus': stimulus,
      'response': response,
      'reactionMs': reactionMs,
      'correct': correct,
    };
  }
}

class HomeVisionTestTrialRecord {
  final String trialId;
  final String testId;
  final int trialIndex;
  final Map<String, Object?> stimulus;
  final Map<String, Object?> response;
  final int? reactionMs;
  final bool? correct;
  final String createdAtIso;

  const HomeVisionTestTrialRecord({
    required this.trialId,
    required this.testId,
    required this.trialIndex,
    required this.stimulus,
    required this.response,
    this.reactionMs,
    this.correct,
    required this.createdAtIso,
  });

  factory HomeVisionTestTrialRecord.fromJson(Map<String, Object?> json) {
    return HomeVisionTestTrialRecord(
      trialId: json['trialId'] as String,
      testId: json['testId'] as String,
      trialIndex: (json['trialIndex'] as num).toInt(),
      stimulus: json['stimulus'] as Map<String, Object?>,
      response: json['response'] as Map<String, Object?>,
      reactionMs: (json['reactionMs'] as num?)?.toInt(),
      correct: json['correct'] as bool?,
      createdAtIso: json['createdAtIso'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'trialId': trialId,
      'testId': testId,
      'trialIndex': trialIndex,
      'stimulus': stimulus,
      'response': response,
      'reactionMs': reactionMs,
      'correct': correct,
      'createdAtIso': createdAtIso,
    };
  }
}

class VisionTrendAlert {
  final String id;
  final String patientId;
  final EyeLaterality eyeLaterality;
  final String ruleCode;
  final UrgencyTier severity;
  final String summaryFa;
  final double ewmaValue;
  final double cusumValue;
  final String? triageCaseId;
  final String createdAtIso;

  const VisionTrendAlert({
    required this.id,
    required this.patientId,
    required this.eyeLaterality,
    required this.ruleCode,
    required this.severity,
    required this.summaryFa,
    required this.ewmaValue,
    required this.cusumValue,
    this.triageCaseId,
    required this.createdAtIso,
  });

  factory VisionTrendAlert.fromJson(Map<String, Object?> json) {
    return VisionTrendAlert(
      id: json['id'] as String,
      patientId: json['patientId'] as String,
      eyeLaterality: EyeLaterality.fromJson(json['eyeLaterality'] as String),
      ruleCode: json['ruleCode'] as String,
      severity: UrgencyTier.fromJson(json['severity'] as String),
      summaryFa: json['summaryFa'] as String,
      ewmaValue: (json['ewmaValue'] as num).toDouble(),
      cusumValue: (json['cusumValue'] as num).toDouble(),
      triageCaseId: json['triageCaseId'] as String?,
      createdAtIso: json['createdAtIso'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'patientId': patientId,
      'eyeLaterality': eyeLaterality.toJson(),
      'ruleCode': ruleCode,
      'severity': severity.toJson(),
      'summaryFa': summaryFa,
      'ewmaValue': ewmaValue,
      'cusumValue': cusumValue,
      'triageCaseId': triageCaseId,
      'createdAtIso': createdAtIso,
    };
  }
}

class R2MonitoringOverviewResponse {
  final int activePlanCount;
  final int enrolledPatientCount;
  final int acceptedTestCount;
  final int rejectedTestCount;
  final int activeAlertCount;
  final int killedDeviceCount;
  final List<VisionTrendAlert> latestAlerts;

  const R2MonitoringOverviewResponse({
    required this.activePlanCount,
    required this.enrolledPatientCount,
    required this.acceptedTestCount,
    required this.rejectedTestCount,
    required this.activeAlertCount,
    required this.killedDeviceCount,
    required this.latestAlerts,
  });

  factory R2MonitoringOverviewResponse.fromJson(Map<String, Object?> json) {
    return R2MonitoringOverviewResponse(
      activePlanCount: (json['activePlanCount'] as num).toInt(),
      enrolledPatientCount: (json['enrolledPatientCount'] as num).toInt(),
      acceptedTestCount: (json['acceptedTestCount'] as num).toInt(),
      rejectedTestCount: (json['rejectedTestCount'] as num).toInt(),
      activeAlertCount: (json['activeAlertCount'] as num).toInt(),
      killedDeviceCount: (json['killedDeviceCount'] as num).toInt(),
      latestAlerts: (json['latestAlerts'] as List<Object?>).map((e) => VisionTrendAlert.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'activePlanCount': activePlanCount,
      'enrolledPatientCount': enrolledPatientCount,
      'acceptedTestCount': acceptedTestCount,
      'rejectedTestCount': rejectedTestCount,
      'activeAlertCount': activeAlertCount,
      'killedDeviceCount': killedDeviceCount,
      'latestAlerts': latestAlerts.map((e) => e.toJson()).toList(),
    };
  }
}

class HomeVisionTestRecord {
  final String id;
  final String tenantId;
  final String clinicId;
  final String patientId;
  final String? calibrationProfileId;
  final EyeLaterality eyeLaterality;
  final String testType;
  final double? vaLogmar;
  final double amslerDistortionScore;
  final bool amslerCentralScotoma;
  final String qualityStatus;
  final List<String> rejectionCodes;
  final String measuredAtIso;

  const HomeVisionTestRecord({
    required this.id,
    required this.tenantId,
    required this.clinicId,
    required this.patientId,
    this.calibrationProfileId,
    required this.eyeLaterality,
    required this.testType,
    this.vaLogmar,
    required this.amslerDistortionScore,
    required this.amslerCentralScotoma,
    required this.qualityStatus,
    required this.rejectionCodes,
    required this.measuredAtIso,
  });

  factory HomeVisionTestRecord.fromJson(Map<String, Object?> json) {
    return HomeVisionTestRecord(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      clinicId: json['clinicId'] as String,
      patientId: json['patientId'] as String,
      calibrationProfileId: json['calibrationProfileId'] as String?,
      eyeLaterality: EyeLaterality.fromJson(json['eyeLaterality'] as String),
      testType: json['testType'] as String,
      vaLogmar: (json['vaLogmar'] as num?)?.toDouble(),
      amslerDistortionScore: (json['amslerDistortionScore'] as num).toDouble(),
      amslerCentralScotoma: json['amslerCentralScotoma'] as bool,
      qualityStatus: json['qualityStatus'] as String,
      rejectionCodes: (json['rejectionCodes'] as List<Object?>).map((e) => e as String).toList(),
      measuredAtIso: json['measuredAtIso'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'tenantId': tenantId,
      'clinicId': clinicId,
      'patientId': patientId,
      'calibrationProfileId': calibrationProfileId,
      'eyeLaterality': eyeLaterality.toJson(),
      'testType': testType,
      'vaLogmar': vaLogmar,
      'amslerDistortionScore': amslerDistortionScore,
      'amslerCentralScotoma': amslerCentralScotoma,
      'qualityStatus': qualityStatus,
      'rejectionCodes': rejectionCodes,
      'measuredAtIso': measuredAtIso,
    };
  }
}

class R2SessionListResponse {
  final List<HomeVisionTestRecord> items;
  final int total;

  const R2SessionListResponse({
    required this.items,
    required this.total,
  });

  factory R2SessionListResponse.fromJson(Map<String, Object?> json) {
    return R2SessionListResponse(
      items: (json['items'] as List<Object?>).map((e) => HomeVisionTestRecord.fromJson(e as Map<String, Object?>)).toList(),
      total: (json['total'] as num).toInt(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
      'total': total,
    };
  }
}

class R2SessionDetailResponse {
  final HomeVisionTestRecord session;
  final List<HomeVisionTestTrialRecord> trials;
  final CalibrationProfileResponse? calibrationProfile;
  final List<VisionTrendAlert> alerts;

  const R2SessionDetailResponse({
    required this.session,
    required this.trials,
    this.calibrationProfile,
    required this.alerts,
  });

  factory R2SessionDetailResponse.fromJson(Map<String, Object?> json) {
    return R2SessionDetailResponse(
      session: HomeVisionTestRecord.fromJson(json['session'] as Map<String, Object?>),
      trials: (json['trials'] as List<Object?>).map((e) => HomeVisionTestTrialRecord.fromJson(e as Map<String, Object?>)).toList(),
      calibrationProfile: json['calibrationProfile'] == null ? null : CalibrationProfileResponse.fromJson(json['calibrationProfile'] as Map<String, Object?>),
      alerts: (json['alerts'] as List<Object?>).map((e) => VisionTrendAlert.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'session': session.toJson(),
      'trials': trials.map((e) => e.toJson()).toList(),
      'calibrationProfile': calibrationProfile?.toJson(),
      'alerts': alerts.map((e) => e.toJson()).toList(),
    };
  }
}

class IopReadingRecord {
  final String readingId;
  final String patientId;
  final String deviceVendor;
  final String deviceSerialHash;
  final EyeLaterality eyeLaterality;
  final String eyeLabelFa;
  final double iopMmHg;
  final double qualityScore;
  final bool accepted;
  final String measuredAtIso;

  const IopReadingRecord({
    required this.readingId,
    required this.patientId,
    required this.deviceVendor,
    required this.deviceSerialHash,
    required this.eyeLaterality,
    required this.eyeLabelFa,
    required this.iopMmHg,
    required this.qualityScore,
    required this.accepted,
    required this.measuredAtIso,
  });

  factory IopReadingRecord.fromJson(Map<String, Object?> json) {
    return IopReadingRecord(
      readingId: json['readingId'] as String,
      patientId: json['patientId'] as String,
      deviceVendor: json['deviceVendor'] as String,
      deviceSerialHash: json['deviceSerialHash'] as String,
      eyeLaterality: EyeLaterality.fromJson(json['eyeLaterality'] as String),
      eyeLabelFa: json['eyeLabelFa'] as String,
      iopMmHg: (json['iopMmHg'] as num).toDouble(),
      qualityScore: (json['qualityScore'] as num).toDouble(),
      accepted: json['accepted'] as bool,
      measuredAtIso: json['measuredAtIso'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'readingId': readingId,
      'patientId': patientId,
      'deviceVendor': deviceVendor,
      'deviceSerialHash': deviceSerialHash,
      'eyeLaterality': eyeLaterality.toJson(),
      'eyeLabelFa': eyeLabelFa,
      'iopMmHg': iopMmHg,
      'qualityScore': qualityScore,
      'accepted': accepted,
      'measuredAtIso': measuredAtIso,
    };
  }
}

class PatientIopListResponse {
  final List<IopReadingRecord> items;
  final List<IopReadingRecord> od;
  final List<IopReadingRecord> os;

  const PatientIopListResponse({
    required this.items,
    required this.od,
    required this.os,
  });

  factory PatientIopListResponse.fromJson(Map<String, Object?> json) {
    return PatientIopListResponse(
      items: (json['items'] as List<Object?>).map((e) => IopReadingRecord.fromJson(e as Map<String, Object?>)).toList(),
      od: (json['od'] as List<Object?>).map((e) => IopReadingRecord.fromJson(e as Map<String, Object?>)).toList(),
      os: (json['os'] as List<Object?>).map((e) => IopReadingRecord.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
      'od': od.map((e) => e.toJson()).toList(),
      'os': os.map((e) => e.toJson()).toList(),
    };
  }
}

class MonitoringPlanRecord {
  final String planId;
  final String tenantId;
  final String clinicId;
  final String patientId;
  final EyeLaterality eyeLaterality;
  final String eyeLabelFa;
  final List<String> testTypes;
  final int cadenceDays;
  final double alertThresholdLogmar;
  final bool active;
  final String createdByUserId;
  final String createdAtIso;
  final String updatedAtIso;

  const MonitoringPlanRecord({
    required this.planId,
    required this.tenantId,
    required this.clinicId,
    required this.patientId,
    required this.eyeLaterality,
    required this.eyeLabelFa,
    required this.testTypes,
    required this.cadenceDays,
    required this.alertThresholdLogmar,
    required this.active,
    required this.createdByUserId,
    required this.createdAtIso,
    required this.updatedAtIso,
  });

  factory MonitoringPlanRecord.fromJson(Map<String, Object?> json) {
    return MonitoringPlanRecord(
      planId: json['planId'] as String,
      tenantId: json['tenantId'] as String,
      clinicId: json['clinicId'] as String,
      patientId: json['patientId'] as String,
      eyeLaterality: EyeLaterality.fromJson(json['eyeLaterality'] as String),
      eyeLabelFa: json['eyeLabelFa'] as String,
      testTypes: (json['testTypes'] as List<Object?>).map((e) => e as String).toList(),
      cadenceDays: (json['cadenceDays'] as num).toInt(),
      alertThresholdLogmar: (json['alertThresholdLogmar'] as num).toDouble(),
      active: json['active'] as bool,
      createdByUserId: json['createdByUserId'] as String,
      createdAtIso: json['createdAtIso'] as String,
      updatedAtIso: json['updatedAtIso'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'planId': planId,
      'tenantId': tenantId,
      'clinicId': clinicId,
      'patientId': patientId,
      'eyeLaterality': eyeLaterality.toJson(),
      'eyeLabelFa': eyeLabelFa,
      'testTypes': testTypes,
      'cadenceDays': cadenceDays,
      'alertThresholdLogmar': alertThresholdLogmar,
      'active': active,
      'createdByUserId': createdByUserId,
      'createdAtIso': createdAtIso,
      'updatedAtIso': updatedAtIso,
    };
  }
}

class MonitoringPlanListResponse {
  final List<MonitoringPlanRecord> items;

  const MonitoringPlanListResponse({
    required this.items,
  });

  factory MonitoringPlanListResponse.fromJson(Map<String, Object?> json) {
    return MonitoringPlanListResponse(
      items: (json['items'] as List<Object?>).map((e) => MonitoringPlanRecord.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
    };
  }
}

class CreateMonitoringPlanRequest {
  final EyeLaterality eyeLaterality;
  final List<String> testTypes;
  final int? cadenceDays;
  final double? alertThresholdLogmar;
  final bool? active;

  const CreateMonitoringPlanRequest({
    required this.eyeLaterality,
    required this.testTypes,
    this.cadenceDays,
    this.alertThresholdLogmar,
    this.active,
  });

  factory CreateMonitoringPlanRequest.fromJson(Map<String, Object?> json) {
    return CreateMonitoringPlanRequest(
      eyeLaterality: EyeLaterality.fromJson(json['eyeLaterality'] as String),
      testTypes: (json['testTypes'] as List<Object?>).map((e) => e as String).toList(),
      cadenceDays: (json['cadenceDays'] as num?)?.toInt(),
      alertThresholdLogmar: (json['alertThresholdLogmar'] as num?)?.toDouble(),
      active: json['active'] as bool?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'eyeLaterality': eyeLaterality.toJson(),
      'testTypes': testTypes,
      'cadenceDays': cadenceDays,
      'alertThresholdLogmar': alertThresholdLogmar,
      'active': active,
    };
  }
}

class DeviceQualificationRecord {
  final String deviceId;
  final String tenantId;
  final String clinicId;
  final String modelCode;
  final String manufacturer;
  final double? displayPpi;
  final String verifiedStatus;
  final String? killSwitchReasonFa;
  final String updatedByUserId;
  final String createdAtIso;
  final String updatedAtIso;

  const DeviceQualificationRecord({
    required this.deviceId,
    required this.tenantId,
    required this.clinicId,
    required this.modelCode,
    required this.manufacturer,
    this.displayPpi,
    required this.verifiedStatus,
    this.killSwitchReasonFa,
    required this.updatedByUserId,
    required this.createdAtIso,
    required this.updatedAtIso,
  });

  factory DeviceQualificationRecord.fromJson(Map<String, Object?> json) {
    return DeviceQualificationRecord(
      deviceId: json['deviceId'] as String,
      tenantId: json['tenantId'] as String,
      clinicId: json['clinicId'] as String,
      modelCode: json['modelCode'] as String,
      manufacturer: json['manufacturer'] as String,
      displayPpi: (json['displayPpi'] as num?)?.toDouble(),
      verifiedStatus: json['verifiedStatus'] as String,
      killSwitchReasonFa: json['killSwitchReasonFa'] as String?,
      updatedByUserId: json['updatedByUserId'] as String,
      createdAtIso: json['createdAtIso'] as String,
      updatedAtIso: json['updatedAtIso'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'deviceId': deviceId,
      'tenantId': tenantId,
      'clinicId': clinicId,
      'modelCode': modelCode,
      'manufacturer': manufacturer,
      'displayPpi': displayPpi,
      'verifiedStatus': verifiedStatus,
      'killSwitchReasonFa': killSwitchReasonFa,
      'updatedByUserId': updatedByUserId,
      'createdAtIso': createdAtIso,
      'updatedAtIso': updatedAtIso,
    };
  }
}

class DeviceQualificationListResponse {
  final List<DeviceQualificationRecord> items;

  const DeviceQualificationListResponse({
    required this.items,
  });

  factory DeviceQualificationListResponse.fromJson(Map<String, Object?> json) {
    return DeviceQualificationListResponse(
      items: (json['items'] as List<Object?>).map((e) => DeviceQualificationRecord.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
    };
  }
}

class UpsertDeviceQualificationRequest {
  final String modelCode;
  final String manufacturer;
  final double? displayPpi;
  final String? verifiedStatus;
  final String? killSwitchReasonFa;

  const UpsertDeviceQualificationRequest({
    required this.modelCode,
    required this.manufacturer,
    this.displayPpi,
    this.verifiedStatus,
    this.killSwitchReasonFa,
  });

  factory UpsertDeviceQualificationRequest.fromJson(Map<String, Object?> json) {
    return UpsertDeviceQualificationRequest(
      modelCode: json['modelCode'] as String,
      manufacturer: json['manufacturer'] as String,
      displayPpi: (json['displayPpi'] as num?)?.toDouble(),
      verifiedStatus: json['verifiedStatus'] as String?,
      killSwitchReasonFa: json['killSwitchReasonFa'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'modelCode': modelCode,
      'manufacturer': manufacturer,
      'displayPpi': displayPpi,
      'verifiedStatus': verifiedStatus,
      'killSwitchReasonFa': killSwitchReasonFa,
    };
  }
}

class UpdateDeviceStatusRequest {
  final String verifiedStatus;
  final String? killSwitchReasonFa;

  const UpdateDeviceStatusRequest({
    required this.verifiedStatus,
    this.killSwitchReasonFa,
  });

  factory UpdateDeviceStatusRequest.fromJson(Map<String, Object?> json) {
    return UpdateDeviceStatusRequest(
      verifiedStatus: json['verifiedStatus'] as String,
      killSwitchReasonFa: json['killSwitchReasonFa'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'verifiedStatus': verifiedStatus,
      'killSwitchReasonFa': killSwitchReasonFa,
    };
  }
}

class ReportListItem {
  final String reportId;
  final String reportType;
  final String patientId;
  final String patientNameFa;
  final String sourceRefId;
  final String titleFa;
  final String issuedAtJalali;
  final String sourceSha256;
  final String pdfSha256;
  final String createdAtIso;

  const ReportListItem({
    required this.reportId,
    required this.reportType,
    required this.patientId,
    required this.patientNameFa,
    required this.sourceRefId,
    required this.titleFa,
    required this.issuedAtJalali,
    required this.sourceSha256,
    required this.pdfSha256,
    required this.createdAtIso,
  });

  factory ReportListItem.fromJson(Map<String, Object?> json) {
    return ReportListItem(
      reportId: json['reportId'] as String,
      reportType: json['reportType'] as String,
      patientId: json['patientId'] as String,
      patientNameFa: json['patientNameFa'] as String,
      sourceRefId: json['sourceRefId'] as String,
      titleFa: json['titleFa'] as String,
      issuedAtJalali: json['issuedAtJalali'] as String,
      sourceSha256: json['sourceSha256'] as String,
      pdfSha256: json['pdfSha256'] as String,
      createdAtIso: json['createdAtIso'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'reportId': reportId,
      'reportType': reportType,
      'patientId': patientId,
      'patientNameFa': patientNameFa,
      'sourceRefId': sourceRefId,
      'titleFa': titleFa,
      'issuedAtJalali': issuedAtJalali,
      'sourceSha256': sourceSha256,
      'pdfSha256': pdfSha256,
      'createdAtIso': createdAtIso,
    };
  }
}

class ReportListResponse {
  final List<ReportListItem> items;
  final int total;

  const ReportListResponse({
    required this.items,
    required this.total,
  });

  factory ReportListResponse.fromJson(Map<String, Object?> json) {
    return ReportListResponse(
      items: (json['items'] as List<Object?>).map((e) => ReportListItem.fromJson(e as Map<String, Object?>)).toList(),
      total: (json['total'] as num).toInt(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
      'total': total,
    };
  }
}

class ReportDetailResponse {
  final String reportId;
  final String clinicId;
  final String reportType;
  final String patientId;
  final String patientNameFa;
  final String sourceRefId;
  final String titleFa;
  final String issuedAtJalali;
  final String sourceSha256;
  final String pdfSha256;
  final Map<String, Object?> payload;
  final String createdAtIso;

  const ReportDetailResponse({
    required this.reportId,
    required this.clinicId,
    required this.reportType,
    required this.patientId,
    required this.patientNameFa,
    required this.sourceRefId,
    required this.titleFa,
    required this.issuedAtJalali,
    required this.sourceSha256,
    required this.pdfSha256,
    required this.payload,
    required this.createdAtIso,
  });

  factory ReportDetailResponse.fromJson(Map<String, Object?> json) {
    return ReportDetailResponse(
      reportId: json['reportId'] as String,
      clinicId: json['clinicId'] as String,
      reportType: json['reportType'] as String,
      patientId: json['patientId'] as String,
      patientNameFa: json['patientNameFa'] as String,
      sourceRefId: json['sourceRefId'] as String,
      titleFa: json['titleFa'] as String,
      issuedAtJalali: json['issuedAtJalali'] as String,
      sourceSha256: json['sourceSha256'] as String,
      pdfSha256: json['pdfSha256'] as String,
      payload: json['payload'] as Map<String, Object?>,
      createdAtIso: json['createdAtIso'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'reportId': reportId,
      'clinicId': clinicId,
      'reportType': reportType,
      'patientId': patientId,
      'patientNameFa': patientNameFa,
      'sourceRefId': sourceRefId,
      'titleFa': titleFa,
      'issuedAtJalali': issuedAtJalali,
      'sourceSha256': sourceSha256,
      'pdfSha256': pdfSha256,
      'payload': payload,
      'createdAtIso': createdAtIso,
    };
  }
}

class KpiRatio {
  final int numerator;
  final int denominator;
  final double? rate;

  const KpiRatio({
    required this.numerator,
    required this.denominator,
    this.rate,
  });

  factory KpiRatio.fromJson(Map<String, Object?> json) {
    return KpiRatio(
      numerator: (json['numerator'] as num).toInt(),
      denominator: (json['denominator'] as num).toInt(),
      rate: (json['rate'] as num?)?.toDouble(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'numerator': numerator,
      'denominator': denominator,
      'rate': rate,
    };
  }
}

class ClinicAnalyticsResponse {
  final Map<String, int> episodeCountsByStatus;
  final Map<String, int> episodeCountsByEye;
  final Map<String, int> cohortCountsByAccessMode;
  final Map<String, int> adherenceDistribution;
  final KpiRatio triageSlaCompliance;
  final KpiRatio referralAttendance;

  const ClinicAnalyticsResponse({
    required this.episodeCountsByStatus,
    required this.episodeCountsByEye,
    required this.cohortCountsByAccessMode,
    required this.adherenceDistribution,
    required this.triageSlaCompliance,
    required this.referralAttendance,
  });

  factory ClinicAnalyticsResponse.fromJson(Map<String, Object?> json) {
    return ClinicAnalyticsResponse(
      episodeCountsByStatus: (json['episodeCountsByStatus'] as Map<String, Object?>).map((k, v) => MapEntry(k, (v as num).toInt())),
      episodeCountsByEye: (json['episodeCountsByEye'] as Map<String, Object?>).map((k, v) => MapEntry(k, (v as num).toInt())),
      cohortCountsByAccessMode: (json['cohortCountsByAccessMode'] as Map<String, Object?>).map((k, v) => MapEntry(k, (v as num).toInt())),
      adherenceDistribution: (json['adherenceDistribution'] as Map<String, Object?>).map((k, v) => MapEntry(k, (v as num).toInt())),
      triageSlaCompliance: KpiRatio.fromJson(json['triageSlaCompliance'] as Map<String, Object?>),
      referralAttendance: KpiRatio.fromJson(json['referralAttendance'] as Map<String, Object?>),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'episodeCountsByStatus': episodeCountsByStatus,
      'episodeCountsByEye': episodeCountsByEye,
      'cohortCountsByAccessMode': cohortCountsByAccessMode,
      'adherenceDistribution': adherenceDistribution,
      'triageSlaCompliance': triageSlaCompliance.toJson(),
      'referralAttendance': referralAttendance.toJson(),
    };
  }
}

class PilotScorecardResponse {
  final String generatedAtIso;
  final String generatedAtJalali;
  final Map<String, Object?> kpis;
  final String noticeFa;

  const PilotScorecardResponse({
    required this.generatedAtIso,
    required this.generatedAtJalali,
    required this.kpis,
    required this.noticeFa,
  });

  factory PilotScorecardResponse.fromJson(Map<String, Object?> json) {
    return PilotScorecardResponse(
      generatedAtIso: json['generatedAtIso'] as String,
      generatedAtJalali: json['generatedAtJalali'] as String,
      kpis: json['kpis'] as Map<String, Object?>,
      noticeFa: json['noticeFa'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'generatedAtIso': generatedAtIso,
      'generatedAtJalali': generatedAtJalali,
      'kpis': kpis,
      'noticeFa': noticeFa,
    };
  }
}

class AiQualityAnalyticsResponse {
  final Map<String, Object?> onlineOperationalMetrics;
  final String offlineBenchmarkNoticeFa;

  const AiQualityAnalyticsResponse({
    required this.onlineOperationalMetrics,
    required this.offlineBenchmarkNoticeFa,
  });

  factory AiQualityAnalyticsResponse.fromJson(Map<String, Object?> json) {
    return AiQualityAnalyticsResponse(
      onlineOperationalMetrics: json['onlineOperationalMetrics'] as Map<String, Object?>,
      offlineBenchmarkNoticeFa: json['offlineBenchmarkNoticeFa'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'onlineOperationalMetrics': onlineOperationalMetrics,
      'offlineBenchmarkNoticeFa': offlineBenchmarkNoticeFa,
    };
  }
}

class ResearchExportRequest {
  final String irbProtocolCode;
  final String reasonFa;
  final int? limit;

  const ResearchExportRequest({
    required this.irbProtocolCode,
    required this.reasonFa,
    this.limit,
  });

  factory ResearchExportRequest.fromJson(Map<String, Object?> json) {
    return ResearchExportRequest(
      irbProtocolCode: json['irbProtocolCode'] as String,
      reasonFa: json['reasonFa'] as String,
      limit: (json['limit'] as num?)?.toInt(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'irbProtocolCode': irbProtocolCode,
      'reasonFa': reasonFa,
      'limit': limit,
    };
  }
}

class ResearchExportResponse {
  final String irbProtocolCode;
  final String exportedAtIso;
  final int recordCount;
  final List<Map<String, Object?>> records;
  final String manifestSha256;

  const ResearchExportResponse({
    required this.irbProtocolCode,
    required this.exportedAtIso,
    required this.recordCount,
    required this.records,
    required this.manifestSha256,
  });

  factory ResearchExportResponse.fromJson(Map<String, Object?> json) {
    return ResearchExportResponse(
      irbProtocolCode: json['irbProtocolCode'] as String,
      exportedAtIso: json['exportedAtIso'] as String,
      recordCount: (json['recordCount'] as num).toInt(),
      records: (json['records'] as List<Object?>).map((e) => e as Map<String, Object?>).toList(),
      manifestSha256: json['manifestSha256'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'irbProtocolCode': irbProtocolCode,
      'exportedAtIso': exportedAtIso,
      'recordCount': recordCount,
      'records': records,
      'manifestSha256': manifestSha256,
    };
  }
}

class BillingEvidenceRequest {
  final String patientId;
  final String periodStartJalali;
  final String periodEndJalali;

  const BillingEvidenceRequest({
    required this.patientId,
    required this.periodStartJalali,
    required this.periodEndJalali,
  });

  factory BillingEvidenceRequest.fromJson(Map<String, Object?> json) {
    return BillingEvidenceRequest(
      patientId: json['patientId'] as String,
      periodStartJalali: json['periodStartJalali'] as String,
      periodEndJalali: json['periodEndJalali'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'patientId': patientId,
      'periodStartJalali': periodStartJalali,
      'periodEndJalali': periodEndJalali,
    };
  }
}

class BillingEvidenceResponse {
  final String patientId;
  final String periodStartJalali;
  final String periodEndJalali;
  final int acceptedHomeVisionTestCount;
  final int confirmedAdherenceEventCount;
  final String disclaimerFa;

  const BillingEvidenceResponse({
    required this.patientId,
    required this.periodStartJalali,
    required this.periodEndJalali,
    required this.acceptedHomeVisionTestCount,
    required this.confirmedAdherenceEventCount,
    required this.disclaimerFa,
  });

  factory BillingEvidenceResponse.fromJson(Map<String, Object?> json) {
    return BillingEvidenceResponse(
      patientId: json['patientId'] as String,
      periodStartJalali: json['periodStartJalali'] as String,
      periodEndJalali: json['periodEndJalali'] as String,
      acceptedHomeVisionTestCount: (json['acceptedHomeVisionTestCount'] as num).toInt(),
      confirmedAdherenceEventCount: (json['confirmedAdherenceEventCount'] as num).toInt(),
      disclaimerFa: json['disclaimerFa'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'patientId': patientId,
      'periodStartJalali': periodStartJalali,
      'periodEndJalali': periodEndJalali,
      'acceptedHomeVisionTestCount': acceptedHomeVisionTestCount,
      'confirmedAdherenceEventCount': confirmedAdherenceEventCount,
      'disclaimerFa': disclaimerFa,
    };
  }
}

class StaffedHoursWindow {
  final String open;
  final String close;

  const StaffedHoursWindow({
    required this.open,
    required this.close,
  });

  factory StaffedHoursWindow.fromJson(Map<String, Object?> json) {
    return StaffedHoursWindow(
      open: json['open'] as String,
      close: json['close'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'open': open,
      'close': close,
    };
  }
}

class StaffedHoursInput {
  final StaffedHoursWindow? satToWed;
  final StaffedHoursWindow? thursday;
  final bool? fridayClosed;

  const StaffedHoursInput({
    this.satToWed,
    this.thursday,
    this.fridayClosed,
  });

  factory StaffedHoursInput.fromJson(Map<String, Object?> json) {
    return StaffedHoursInput(
      satToWed: json['satToWed'] == null ? null : StaffedHoursWindow.fromJson(json['satToWed'] as Map<String, Object?>),
      thursday: json['thursday'] == null ? null : StaffedHoursWindow.fromJson(json['thursday'] as Map<String, Object?>),
      fridayClosed: json['fridayClosed'] as bool?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'satToWed': satToWed?.toJson(),
      'thursday': thursday?.toJson(),
      'fridayClosed': fridayClosed,
    };
  }
}

class UpdateClinicProfileRequest {
  final String? nameFa;
  final String? emergencyPhone;
  final String? calendarMode;
  final String? dicomAeTitle;
  final StaffedHoursInput? staffedHours;

  const UpdateClinicProfileRequest({
    this.nameFa,
    this.emergencyPhone,
    this.calendarMode,
    this.dicomAeTitle,
    this.staffedHours,
  });

  factory UpdateClinicProfileRequest.fromJson(Map<String, Object?> json) {
    return UpdateClinicProfileRequest(
      nameFa: json['nameFa'] as String?,
      emergencyPhone: json['emergencyPhone'] as String?,
      calendarMode: json['calendarMode'] as String?,
      dicomAeTitle: json['dicomAeTitle'] as String?,
      staffedHours: json['staffedHours'] == null ? null : StaffedHoursInput.fromJson(json['staffedHours'] as Map<String, Object?>),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'nameFa': nameFa,
      'emergencyPhone': emergencyPhone,
      'calendarMode': calendarMode,
      'dicomAeTitle': dicomAeTitle,
      'staffedHours': staffedHours?.toJson(),
    };
  }
}

class StaffMembershipRecord {
  final String id;
  final String tenantId;
  final String clinicId;
  final String userId;
  final StaffRole role;
  final bool active;
  final String? fullNameFa;
  final String? email;
  final String? mfaVerifiedAtIso;
  final String? createdAtIso;

  const StaffMembershipRecord({
    required this.id,
    required this.tenantId,
    required this.clinicId,
    required this.userId,
    required this.role,
    required this.active,
    this.fullNameFa,
    this.email,
    this.mfaVerifiedAtIso,
    this.createdAtIso,
  });

  factory StaffMembershipRecord.fromJson(Map<String, Object?> json) {
    return StaffMembershipRecord(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      clinicId: json['clinicId'] as String,
      userId: json['userId'] as String,
      role: StaffRole.fromJson(json['role'] as String),
      active: json['active'] as bool,
      fullNameFa: json['fullNameFa'] as String?,
      email: json['email'] as String?,
      mfaVerifiedAtIso: json['mfaVerifiedAtIso'] as String?,
      createdAtIso: json['createdAtIso'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'tenantId': tenantId,
      'clinicId': clinicId,
      'userId': userId,
      'role': role.toJson(),
      'active': active,
      'fullNameFa': fullNameFa,
      'email': email,
      'mfaVerifiedAtIso': mfaVerifiedAtIso,
      'createdAtIso': createdAtIso,
    };
  }
}

class StaffMembershipListResponse {
  final List<StaffMembershipRecord> items;

  const StaffMembershipListResponse({
    required this.items,
  });

  factory StaffMembershipListResponse.fromJson(Map<String, Object?> json) {
    return StaffMembershipListResponse(
      items: (json['items'] as List<Object?>).map((e) => StaffMembershipRecord.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
    };
  }
}

class UpsertStaffMemberRequest {
  final String userId;
  final StaffRole role;
  final String? fullNameFa;
  final String? email;
  final bool? active;
  final bool? mfaVerified;

  const UpsertStaffMemberRequest({
    required this.userId,
    required this.role,
    this.fullNameFa,
    this.email,
    this.active,
    this.mfaVerified,
  });

  factory UpsertStaffMemberRequest.fromJson(Map<String, Object?> json) {
    return UpsertStaffMemberRequest(
      userId: json['userId'] as String,
      role: StaffRole.fromJson(json['role'] as String),
      fullNameFa: json['fullNameFa'] as String?,
      email: json['email'] as String?,
      active: json['active'] as bool?,
      mfaVerified: json['mfaVerified'] as bool?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'userId': userId,
      'role': role.toJson(),
      'fullNameFa': fullNameFa,
      'email': email,
      'active': active,
      'mfaVerified': mfaVerified,
    };
  }
}

class UpdateStaffMemberRequest {
  final StaffRole? role;
  final bool? active;
  final String? fullNameFa;
  final String? email;

  const UpdateStaffMemberRequest({
    this.role,
    this.active,
    this.fullNameFa,
    this.email,
  });

  factory UpdateStaffMemberRequest.fromJson(Map<String, Object?> json) {
    return UpdateStaffMemberRequest(
      role: json['role'] == null ? null : StaffRole.fromJson(json['role'] as String),
      active: json['active'] as bool?,
      fullNameFa: json['fullNameFa'] as String?,
      email: json['email'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'role': role?.toJson(),
      'active': active,
      'fullNameFa': fullNameFa,
      'email': email,
    };
  }
}

class ProtocolTemplateRecord {
  final String id;
  final String tenantId;
  final String clinicId;
  final String protocolType;
  final int version;
  final Map<String, Object?> schema;
  final String? approvedBy;
  final String createdAtIso;

  const ProtocolTemplateRecord({
    required this.id,
    required this.tenantId,
    required this.clinicId,
    required this.protocolType,
    required this.version,
    required this.schema,
    this.approvedBy,
    required this.createdAtIso,
  });

  factory ProtocolTemplateRecord.fromJson(Map<String, Object?> json) {
    return ProtocolTemplateRecord(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      clinicId: json['clinicId'] as String,
      protocolType: json['protocolType'] as String,
      version: (json['version'] as num).toInt(),
      schema: json['schema'] as Map<String, Object?>,
      approvedBy: json['approvedBy'] as String?,
      createdAtIso: json['createdAtIso'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'tenantId': tenantId,
      'clinicId': clinicId,
      'protocolType': protocolType,
      'version': version,
      'schema': schema,
      'approvedBy': approvedBy,
      'createdAtIso': createdAtIso,
    };
  }
}

class AdminProtocolListResponse {
  final List<String> builtInTypes;
  final List<ProtocolTemplateRecord> versions;

  const AdminProtocolListResponse({
    required this.builtInTypes,
    required this.versions,
  });

  factory AdminProtocolListResponse.fromJson(Map<String, Object?> json) {
    return AdminProtocolListResponse(
      builtInTypes: (json['builtInTypes'] as List<Object?>).map((e) => e as String).toList(),
      versions: (json['versions'] as List<Object?>).map((e) => ProtocolTemplateRecord.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'builtInTypes': builtInTypes,
      'versions': versions.map((e) => e.toJson()).toList(),
    };
  }
}

class CreateProtocolVersionRequest {
  final String protocolType;
  final Map<String, Object?> schema;

  const CreateProtocolVersionRequest({
    required this.protocolType,
    required this.schema,
  });

  factory CreateProtocolVersionRequest.fromJson(Map<String, Object?> json) {
    return CreateProtocolVersionRequest(
      protocolType: json['protocolType'] as String,
      schema: json['schema'] as Map<String, Object?>,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'protocolType': protocolType,
      'schema': schema,
    };
  }
}

class MessageTemplateRecord {
  final String templateId;
  final String tenantId;
  final String clinicId;
  final String templateKey;
  final int version;
  final String bodyTemplateFa;
  final String channel;
  final bool active;
  final String updatedByUserId;
  final String createdAtIso;

  const MessageTemplateRecord({
    required this.templateId,
    required this.tenantId,
    required this.clinicId,
    required this.templateKey,
    required this.version,
    required this.bodyTemplateFa,
    required this.channel,
    required this.active,
    required this.updatedByUserId,
    required this.createdAtIso,
  });

  factory MessageTemplateRecord.fromJson(Map<String, Object?> json) {
    return MessageTemplateRecord(
      templateId: json['templateId'] as String,
      tenantId: json['tenantId'] as String,
      clinicId: json['clinicId'] as String,
      templateKey: json['templateKey'] as String,
      version: (json['version'] as num).toInt(),
      bodyTemplateFa: json['bodyTemplateFa'] as String,
      channel: json['channel'] as String,
      active: json['active'] as bool,
      updatedByUserId: json['updatedByUserId'] as String,
      createdAtIso: json['createdAtIso'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'templateId': templateId,
      'tenantId': tenantId,
      'clinicId': clinicId,
      'templateKey': templateKey,
      'version': version,
      'bodyTemplateFa': bodyTemplateFa,
      'channel': channel,
      'active': active,
      'updatedByUserId': updatedByUserId,
      'createdAtIso': createdAtIso,
    };
  }
}

class MessageTemplateListResponse {
  final List<MessageTemplateRecord> items;

  const MessageTemplateListResponse({
    required this.items,
  });

  factory MessageTemplateListResponse.fromJson(Map<String, Object?> json) {
    return MessageTemplateListResponse(
      items: (json['items'] as List<Object?>).map((e) => MessageTemplateRecord.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
    };
  }
}

class CreateMessageTemplateRequest {
  final String templateKey;
  final String bodyTemplateFa;
  final String? channel;
  final bool? active;

  const CreateMessageTemplateRequest({
    required this.templateKey,
    required this.bodyTemplateFa,
    this.channel,
    this.active,
  });

  factory CreateMessageTemplateRequest.fromJson(Map<String, Object?> json) {
    return CreateMessageTemplateRequest(
      templateKey: json['templateKey'] as String,
      bodyTemplateFa: json['bodyTemplateFa'] as String,
      channel: json['channel'] as String?,
      active: json['active'] as bool?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'templateKey': templateKey,
      'bodyTemplateFa': bodyTemplateFa,
      'channel': channel,
      'active': active,
    };
  }
}

class ConsentTemplateRecord {
  final String consentTemplateId;
  final String tenantId;
  final String clinicId;
  final String consentType;
  final String version;
  final String titleFa;
  final String bodyFa;
  final bool active;
  final String updatedByUserId;
  final String createdAtIso;

  const ConsentTemplateRecord({
    required this.consentTemplateId,
    required this.tenantId,
    required this.clinicId,
    required this.consentType,
    required this.version,
    required this.titleFa,
    required this.bodyFa,
    required this.active,
    required this.updatedByUserId,
    required this.createdAtIso,
  });

  factory ConsentTemplateRecord.fromJson(Map<String, Object?> json) {
    return ConsentTemplateRecord(
      consentTemplateId: json['consentTemplateId'] as String,
      tenantId: json['tenantId'] as String,
      clinicId: json['clinicId'] as String,
      consentType: json['consentType'] as String,
      version: json['version'] as String,
      titleFa: json['titleFa'] as String,
      bodyFa: json['bodyFa'] as String,
      active: json['active'] as bool,
      updatedByUserId: json['updatedByUserId'] as String,
      createdAtIso: json['createdAtIso'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'consentTemplateId': consentTemplateId,
      'tenantId': tenantId,
      'clinicId': clinicId,
      'consentType': consentType,
      'version': version,
      'titleFa': titleFa,
      'bodyFa': bodyFa,
      'active': active,
      'updatedByUserId': updatedByUserId,
      'createdAtIso': createdAtIso,
    };
  }
}

class ConsentTemplateListResponse {
  final List<ConsentTemplateRecord> items;

  const ConsentTemplateListResponse({
    required this.items,
  });

  factory ConsentTemplateListResponse.fromJson(Map<String, Object?> json) {
    return ConsentTemplateListResponse(
      items: (json['items'] as List<Object?>).map((e) => ConsentTemplateRecord.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
    };
  }
}

class CreateConsentTemplateRequest {
  final String consentType;
  final String version;
  final String titleFa;
  final String bodyFa;
  final bool? active;

  const CreateConsentTemplateRequest({
    required this.consentType,
    required this.version,
    required this.titleFa,
    required this.bodyFa,
    this.active,
  });

  factory CreateConsentTemplateRequest.fromJson(Map<String, Object?> json) {
    return CreateConsentTemplateRequest(
      consentType: json['consentType'] as String,
      version: json['version'] as String,
      titleFa: json['titleFa'] as String,
      bodyFa: json['bodyFa'] as String,
      active: json['active'] as bool?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'consentType': consentType,
      'version': version,
      'titleFa': titleFa,
      'bodyFa': bodyFa,
      'active': active,
    };
  }
}

class IntegrationEndpointRecord {
  final String endpointId;
  final String tenantId;
  final String clinicId;
  final String integrationType;
  final String nameFa;
  final String endpointUrl;
  final String? aeTitle;
  final String authMode;
  final String? secretMasked;
  final bool enabled;
  final String? lastTestedAtIso;
  final String? lastTestStatus;
  final String createdAtIso;
  final String updatedAtIso;

  const IntegrationEndpointRecord({
    required this.endpointId,
    required this.tenantId,
    required this.clinicId,
    required this.integrationType,
    required this.nameFa,
    required this.endpointUrl,
    this.aeTitle,
    required this.authMode,
    this.secretMasked,
    required this.enabled,
    this.lastTestedAtIso,
    this.lastTestStatus,
    required this.createdAtIso,
    required this.updatedAtIso,
  });

  factory IntegrationEndpointRecord.fromJson(Map<String, Object?> json) {
    return IntegrationEndpointRecord(
      endpointId: json['endpointId'] as String,
      tenantId: json['tenantId'] as String,
      clinicId: json['clinicId'] as String,
      integrationType: json['integrationType'] as String,
      nameFa: json['nameFa'] as String,
      endpointUrl: json['endpointUrl'] as String,
      aeTitle: json['aeTitle'] as String?,
      authMode: json['authMode'] as String,
      secretMasked: json['secretMasked'] as String?,
      enabled: json['enabled'] as bool,
      lastTestedAtIso: json['lastTestedAtIso'] as String?,
      lastTestStatus: json['lastTestStatus'] as String?,
      createdAtIso: json['createdAtIso'] as String,
      updatedAtIso: json['updatedAtIso'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'endpointId': endpointId,
      'tenantId': tenantId,
      'clinicId': clinicId,
      'integrationType': integrationType,
      'nameFa': nameFa,
      'endpointUrl': endpointUrl,
      'aeTitle': aeTitle,
      'authMode': authMode,
      'secretMasked': secretMasked,
      'enabled': enabled,
      'lastTestedAtIso': lastTestedAtIso,
      'lastTestStatus': lastTestStatus,
      'createdAtIso': createdAtIso,
      'updatedAtIso': updatedAtIso,
    };
  }
}

class IntegrationEndpointListResponse {
  final List<IntegrationEndpointRecord> items;

  const IntegrationEndpointListResponse({
    required this.items,
  });

  factory IntegrationEndpointListResponse.fromJson(Map<String, Object?> json) {
    return IntegrationEndpointListResponse(
      items: (json['items'] as List<Object?>).map((e) => IntegrationEndpointRecord.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
    };
  }
}

class CreateIntegrationEndpointRequest {
  final String integrationType;
  final String nameFa;
  final String endpointUrl;
  final String? aeTitle;
  final String? authMode;
  final String? secret;
  final bool? enabled;

  const CreateIntegrationEndpointRequest({
    required this.integrationType,
    required this.nameFa,
    required this.endpointUrl,
    this.aeTitle,
    this.authMode,
    this.secret,
    this.enabled,
  });

  factory CreateIntegrationEndpointRequest.fromJson(Map<String, Object?> json) {
    return CreateIntegrationEndpointRequest(
      integrationType: json['integrationType'] as String,
      nameFa: json['nameFa'] as String,
      endpointUrl: json['endpointUrl'] as String,
      aeTitle: json['aeTitle'] as String?,
      authMode: json['authMode'] as String?,
      secret: json['secret'] as String?,
      enabled: json['enabled'] as bool?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'integrationType': integrationType,
      'nameFa': nameFa,
      'endpointUrl': endpointUrl,
      'aeTitle': aeTitle,
      'authMode': authMode,
      'secret': secret,
      'enabled': enabled,
    };
  }
}

class UpdateIntegrationEndpointRequest {
  final String? nameFa;
  final String? endpointUrl;
  final String? aeTitle;
  final String? authMode;
  final String? secret;
  final bool? enabled;

  const UpdateIntegrationEndpointRequest({
    this.nameFa,
    this.endpointUrl,
    this.aeTitle,
    this.authMode,
    this.secret,
    this.enabled,
  });

  factory UpdateIntegrationEndpointRequest.fromJson(Map<String, Object?> json) {
    return UpdateIntegrationEndpointRequest(
      nameFa: json['nameFa'] as String?,
      endpointUrl: json['endpointUrl'] as String?,
      aeTitle: json['aeTitle'] as String?,
      authMode: json['authMode'] as String?,
      secret: json['secret'] as String?,
      enabled: json['enabled'] as bool?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'nameFa': nameFa,
      'endpointUrl': endpointUrl,
      'aeTitle': aeTitle,
      'authMode': authMode,
      'secret': secret,
      'enabled': enabled,
    };
  }
}

class IntegrationDeliveryRecord {
  final String deliveryId;
  final String clinicId;
  final String? endpointId;
  final String? endpointNameFa;
  final String direction;
  final String payloadType;
  final String? referenceId;
  final String status;
  final int? httpStatus;
  final String? errorCode;
  final String? errorMessageFa;
  final int attemptCount;
  final String createdAtIso;
  final String updatedAtIso;

  const IntegrationDeliveryRecord({
    required this.deliveryId,
    required this.clinicId,
    this.endpointId,
    this.endpointNameFa,
    required this.direction,
    required this.payloadType,
    this.referenceId,
    required this.status,
    this.httpStatus,
    this.errorCode,
    this.errorMessageFa,
    required this.attemptCount,
    required this.createdAtIso,
    required this.updatedAtIso,
  });

  factory IntegrationDeliveryRecord.fromJson(Map<String, Object?> json) {
    return IntegrationDeliveryRecord(
      deliveryId: json['deliveryId'] as String,
      clinicId: json['clinicId'] as String,
      endpointId: json['endpointId'] as String?,
      endpointNameFa: json['endpointNameFa'] as String?,
      direction: json['direction'] as String,
      payloadType: json['payloadType'] as String,
      referenceId: json['referenceId'] as String?,
      status: json['status'] as String,
      httpStatus: (json['httpStatus'] as num?)?.toInt(),
      errorCode: json['errorCode'] as String?,
      errorMessageFa: json['errorMessageFa'] as String?,
      attemptCount: (json['attemptCount'] as num).toInt(),
      createdAtIso: json['createdAtIso'] as String,
      updatedAtIso: json['updatedAtIso'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'deliveryId': deliveryId,
      'clinicId': clinicId,
      'endpointId': endpointId,
      'endpointNameFa': endpointNameFa,
      'direction': direction,
      'payloadType': payloadType,
      'referenceId': referenceId,
      'status': status,
      'httpStatus': httpStatus,
      'errorCode': errorCode,
      'errorMessageFa': errorMessageFa,
      'attemptCount': attemptCount,
      'createdAtIso': createdAtIso,
      'updatedAtIso': updatedAtIso,
    };
  }
}

class TestIntegrationEndpointResponse {
  final IntegrationEndpointRecord endpoint;
  final IntegrationDeliveryRecord delivery;

  const TestIntegrationEndpointResponse({
    required this.endpoint,
    required this.delivery,
  });

  factory TestIntegrationEndpointResponse.fromJson(Map<String, Object?> json) {
    return TestIntegrationEndpointResponse(
      endpoint: IntegrationEndpointRecord.fromJson(json['endpoint'] as Map<String, Object?>),
      delivery: IntegrationDeliveryRecord.fromJson(json['delivery'] as Map<String, Object?>),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'endpoint': endpoint.toJson(),
      'delivery': delivery.toJson(),
    };
  }
}

class IntegrationDeliveryListResponse {
  final List<IntegrationDeliveryRecord> items;
  final int total;

  const IntegrationDeliveryListResponse({
    required this.items,
    required this.total,
  });

  factory IntegrationDeliveryListResponse.fromJson(Map<String, Object?> json) {
    return IntegrationDeliveryListResponse(
      items: (json['items'] as List<Object?>).map((e) => IntegrationDeliveryRecord.fromJson(e as Map<String, Object?>)).toList(),
      total: (json['total'] as num).toInt(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
      'total': total,
    };
  }
}

class OpsHealthResponse {
  final String status;
  final String service;
  final AiEngineMode? aiEngineMode;
  final Map<String, Object?> database;
  final Map<String, Object?> queues;

  const OpsHealthResponse({
    required this.status,
    required this.service,
    this.aiEngineMode,
    required this.database,
    required this.queues,
  });

  factory OpsHealthResponse.fromJson(Map<String, Object?> json) {
    return OpsHealthResponse(
      status: json['status'] as String,
      service: json['service'] as String,
      aiEngineMode: json['aiEngineMode'] == null ? null : AiEngineMode.fromJson(json['aiEngineMode'] as String),
      database: json['database'] as Map<String, Object?>,
      queues: json['queues'] as Map<String, Object?>,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'status': status,
      'service': service,
      'aiEngineMode': aiEngineMode?.toJson(),
      'database': database,
      'queues': queues,
    };
  }
}

class OpsJobsResponse {
  final List<Map<String, Object?>> aiInferenceJobs;
  final List<Map<String, Object?>> outboxEvents;
  final List<Map<String, Object?>> workflowRuns;

  const OpsJobsResponse({
    required this.aiInferenceJobs,
    required this.outboxEvents,
    required this.workflowRuns,
  });

  factory OpsJobsResponse.fromJson(Map<String, Object?> json) {
    return OpsJobsResponse(
      aiInferenceJobs: (json['aiInferenceJobs'] as List<Object?>).map((e) => e as Map<String, Object?>).toList(),
      outboxEvents: (json['outboxEvents'] as List<Object?>).map((e) => e as Map<String, Object?>).toList(),
      workflowRuns: (json['workflowRuns'] as List<Object?>).map((e) => e as Map<String, Object?>).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'aiInferenceJobs': aiInferenceJobs,
      'outboxEvents': outboxEvents,
      'workflowRuns': workflowRuns,
    };
  }
}

class AuditLogEntry {
  final String id;
  final String tenantId;
  final String actorUserId;
  final String actorRole;
  final String action;
  final String resourceType;
  final String resourceId;
  final String? reasonFa;
  final bool? breakGlass;
  final Map<String, Object?>? metadata;
  final String occurredAtIso;

  const AuditLogEntry({
    required this.id,
    required this.tenantId,
    required this.actorUserId,
    required this.actorRole,
    required this.action,
    required this.resourceType,
    required this.resourceId,
    this.reasonFa,
    this.breakGlass,
    this.metadata,
    required this.occurredAtIso,
  });

  factory AuditLogEntry.fromJson(Map<String, Object?> json) {
    return AuditLogEntry(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      actorUserId: json['actorUserId'] as String,
      actorRole: json['actorRole'] as String,
      action: json['action'] as String,
      resourceType: json['resourceType'] as String,
      resourceId: json['resourceId'] as String,
      reasonFa: json['reasonFa'] as String?,
      breakGlass: json['breakGlass'] as bool?,
      metadata: json['metadata'] as Map<String, Object?>?,
      occurredAtIso: json['occurredAtIso'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'id': id,
      'tenantId': tenantId,
      'actorUserId': actorUserId,
      'actorRole': actorRole,
      'action': action,
      'resourceType': resourceType,
      'resourceId': resourceId,
      'reasonFa': reasonFa,
      'breakGlass': breakGlass,
      'metadata': metadata,
      'occurredAtIso': occurredAtIso,
    };
  }
}

class AuditLogListResponse {
  final List<AuditLogEntry> items;
  final int total;

  const AuditLogListResponse({
    required this.items,
    required this.total,
  });

  factory AuditLogListResponse.fromJson(Map<String, Object?> json) {
    return AuditLogListResponse(
      items: (json['items'] as List<Object?>).map((e) => AuditLogEntry.fromJson(e as Map<String, Object?>)).toList(),
      total: (json['total'] as num).toInt(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
      'total': total,
    };
  }
}

class BreakGlassSessionRecord {
  final String sessionId;
  final String tenantId;
  final String clinicId;
  final String actorUserId;
  final String actorRole;
  final String patientId;
  final String reasonFa;
  final String expiresAtIso;
  final String? revokedAtIso;
  final String? revokedByUserId;
  final bool active;
  final String createdAtIso;

  const BreakGlassSessionRecord({
    required this.sessionId,
    required this.tenantId,
    required this.clinicId,
    required this.actorUserId,
    required this.actorRole,
    required this.patientId,
    required this.reasonFa,
    required this.expiresAtIso,
    this.revokedAtIso,
    this.revokedByUserId,
    required this.active,
    required this.createdAtIso,
  });

  factory BreakGlassSessionRecord.fromJson(Map<String, Object?> json) {
    return BreakGlassSessionRecord(
      sessionId: json['sessionId'] as String,
      tenantId: json['tenantId'] as String,
      clinicId: json['clinicId'] as String,
      actorUserId: json['actorUserId'] as String,
      actorRole: json['actorRole'] as String,
      patientId: json['patientId'] as String,
      reasonFa: json['reasonFa'] as String,
      expiresAtIso: json['expiresAtIso'] as String,
      revokedAtIso: json['revokedAtIso'] as String?,
      revokedByUserId: json['revokedByUserId'] as String?,
      active: json['active'] as bool,
      createdAtIso: json['createdAtIso'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'sessionId': sessionId,
      'tenantId': tenantId,
      'clinicId': clinicId,
      'actorUserId': actorUserId,
      'actorRole': actorRole,
      'patientId': patientId,
      'reasonFa': reasonFa,
      'expiresAtIso': expiresAtIso,
      'revokedAtIso': revokedAtIso,
      'revokedByUserId': revokedByUserId,
      'active': active,
      'createdAtIso': createdAtIso,
    };
  }
}

class BreakGlassSessionListResponse {
  final List<BreakGlassSessionRecord> items;
  final int total;

  const BreakGlassSessionListResponse({
    required this.items,
    required this.total,
  });

  factory BreakGlassSessionListResponse.fromJson(Map<String, Object?> json) {
    return BreakGlassSessionListResponse(
      items: (json['items'] as List<Object?>).map((e) => BreakGlassSessionRecord.fromJson(e as Map<String, Object?>)).toList(),
      total: (json['total'] as num).toInt(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'items': items.map((e) => e.toJson()).toList(),
      'total': total,
    };
  }
}

class OpenBreakGlassRequest {
  final String patientId;
  final String reasonFa;
  final int? durationMinutes;

  const OpenBreakGlassRequest({
    required this.patientId,
    required this.reasonFa,
    this.durationMinutes,
  });

  factory OpenBreakGlassRequest.fromJson(Map<String, Object?> json) {
    return OpenBreakGlassRequest(
      patientId: json['patientId'] as String,
      reasonFa: json['reasonFa'] as String,
      durationMinutes: (json['durationMinutes'] as num?)?.toInt(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'patientId': patientId,
      'reasonFa': reasonFa,
      'durationMinutes': durationMinutes,
    };
  }
}

class RevokeBreakGlassRequest {
  final String? reasonFa;

  const RevokeBreakGlassRequest({
    this.reasonFa,
  });

  factory RevokeBreakGlassRequest.fromJson(Map<String, Object?> json) {
    return RevokeBreakGlassRequest(
      reasonFa: json['reasonFa'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'reasonFa': reasonFa,
    };
  }
}

class ModelArtifactSummary {
  final String modelName;
  final bool hasMetricsJson;
  final bool hasModelCard;
  final Map<String, Object?>? metrics;

  const ModelArtifactSummary({
    required this.modelName,
    required this.hasMetricsJson,
    required this.hasModelCard,
    this.metrics,
  });

  factory ModelArtifactSummary.fromJson(Map<String, Object?> json) {
    return ModelArtifactSummary(
      modelName: json['modelName'] as String,
      hasMetricsJson: json['hasMetricsJson'] as bool,
      hasModelCard: json['hasModelCard'] as bool,
      metrics: json['metrics'] as Map<String, Object?>?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'modelName': modelName,
      'hasMetricsJson': hasMetricsJson,
      'hasModelCard': hasModelCard,
      'metrics': metrics,
    };
  }
}

class OpsModelsResponse {
  final String aiEngineMode;
  final String foundationBackbone;
  final String commercialLicensePolicyFa;
  final String llmProvider;
  final String llmModel;
  final List<ModelArtifactSummary> artifacts;

  const OpsModelsResponse({
    required this.aiEngineMode,
    required this.foundationBackbone,
    required this.commercialLicensePolicyFa,
    required this.llmProvider,
    required this.llmModel,
    required this.artifacts,
  });

  factory OpsModelsResponse.fromJson(Map<String, Object?> json) {
    return OpsModelsResponse(
      aiEngineMode: json['aiEngineMode'] as String,
      foundationBackbone: json['foundationBackbone'] as String,
      commercialLicensePolicyFa: json['commercialLicensePolicyFa'] as String,
      llmProvider: json['llmProvider'] as String,
      llmModel: json['llmModel'] as String,
      artifacts: (json['artifacts'] as List<Object?>).map((e) => ModelArtifactSummary.fromJson(e as Map<String, Object?>)).toList(),
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'aiEngineMode': aiEngineMode,
      'foundationBackbone': foundationBackbone,
      'commercialLicensePolicyFa': commercialLicensePolicyFa,
      'llmProvider': llmProvider,
      'llmModel': llmModel,
      'artifacts': artifacts.map((e) => e.toJson()).toList(),
    };
  }
}
