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

  const ClinicProfile({
    required this.clinicId,
    required this.tenantId,
    required this.nameFa,
    required this.locale,
    required this.calendarMode,
    required this.emergencyPhone,
    required this.staffedHoursFa,
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

  const PatientOtpRequest({
    required this.phoneNumber,
    required this.clinicId,
  });

  factory PatientOtpRequest.fromJson(Map<String, Object?> json) {
    return PatientOtpRequest(
      phoneNumber: json['phoneNumber'] as String,
      clinicId: json['clinicId'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'phoneNumber': phoneNumber,
      'clinicId': clinicId,
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

  const PatientOtpVerifyRequest({
    required this.challengeId,
    required this.otpCode,
    required this.consentAccepted,
    required this.consentVersion,
  });

  factory PatientOtpVerifyRequest.fromJson(Map<String, Object?> json) {
    return PatientOtpVerifyRequest(
      challengeId: json['challengeId'] as String,
      otpCode: json['otpCode'] as String,
      consentAccepted: json['consentAccepted'] as bool,
      consentVersion: json['consentVersion'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'challengeId': challengeId,
      'otpCode': otpCode,
      'consentAccepted': consentAccepted,
      'consentVersion': consentVersion,
    };
  }
}

class PatientSessionResponse {
  final String accessToken;
  final String patientId;
  final String tenantId;
  final String locale;
  final String calendarMode;

  const PatientSessionResponse({
    required this.accessToken,
    required this.patientId,
    required this.tenantId,
    required this.locale,
    required this.calendarMode,
  });

  factory PatientSessionResponse.fromJson(Map<String, Object?> json) {
    return PatientSessionResponse(
      accessToken: json['accessToken'] as String,
      patientId: json['patientId'] as String,
      tenantId: json['tenantId'] as String,
      locale: json['locale'] as String,
      calendarMode: json['calendarMode'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'accessToken': accessToken,
      'patientId': patientId,
      'tenantId': tenantId,
      'locale': locale,
      'calendarMode': calendarMode,
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

class SymptomReportRequest {
  final EyeLaterality eyeLaterality;
  final bool severePain;
  final bool suddenVisionLoss;
  final bool purulentDischarge;
  final String freeTextFa;

  const SymptomReportRequest({
    required this.eyeLaterality,
    required this.severePain,
    required this.suddenVisionLoss,
    required this.purulentDischarge,
    required this.freeTextFa,
  });

  factory SymptomReportRequest.fromJson(Map<String, Object?> json) {
    return SymptomReportRequest(
      eyeLaterality: EyeLaterality.fromJson(json['eyeLaterality'] as String),
      severePain: json['severePain'] as bool,
      suddenVisionLoss: json['suddenVisionLoss'] as bool,
      purulentDischarge: json['purulentDischarge'] as bool,
      freeTextFa: json['freeTextFa'] as String,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'eyeLaterality': eyeLaterality.toJson(),
      'severePain': severePain,
      'suddenVisionLoss': suddenVisionLoss,
      'purulentDischarge': purulentDischarge,
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
    };
  }
}

class ClinicianSignoffRequest {
  final SignoffAction action;
  final UrgencyTier finalUrgency;
  final String finalReportTextFa;
  final String? overrideReasonFa;

  const ClinicianSignoffRequest({
    required this.action,
    required this.finalUrgency,
    required this.finalReportTextFa,
    this.overrideReasonFa,
  });

  factory ClinicianSignoffRequest.fromJson(Map<String, Object?> json) {
    return ClinicianSignoffRequest(
      action: SignoffAction.fromJson(json['action'] as String),
      finalUrgency: UrgencyTier.fromJson(json['finalUrgency'] as String),
      finalReportTextFa: json['finalReportTextFa'] as String,
      overrideReasonFa: json['overrideReasonFa'] as String?,
    );
  }

  Map<String, Object?> toJson() {
    return <String, Object?>{
      'action': action.toJson(),
      'finalUrgency': finalUrgency.toJson(),
      'finalReportTextFa': finalReportTextFa,
      'overrideReasonFa': overrideReasonFa,
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
