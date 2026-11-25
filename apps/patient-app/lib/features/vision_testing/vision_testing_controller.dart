import 'dart:convert';

import 'package:bina_api_dtos/bina_api_dtos.dart';
import 'package:bina_device_sensors/bina_device_sensors.dart';
import 'package:bina_offline_store/bina_offline_store.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../app/providers.dart';
import '../../core/data/session_cache_repository.dart';

enum VisionTestKind {
  landoltC('landolt_c', 'آزمون حدت بینایی (لندولت C)'),
  amsler('amsler', 'آزمون شبکه آمسلر');

  const VisionTestKind(this.wireCode, this.titleFa);
  final String wireCode;
  final String titleFa;

  static VisionTestKind fromAssignmentId(String id) =>
      id == 'amsler' ? VisionTestKind.amsler : VisionTestKind.landoltC;
}

/// R2 test workflow state machine (`v2.1 §10.2`).
enum VisionTestStage {
  assigned,
  eligibility,
  eyeConfirmed,
  instructions,
  calibrated,
  practice,
  preflight,
  activeTrials,
  interrupted,
  submitted,
  receipt,
}

@immutable
class VisionTestSessionState {
  const VisionTestSessionState({
    this.stage = VisionTestStage.assigned,
    this.kind,
    this.eligibility,
    this.selectedEye,
    this.pixelsPerMm = 6.2,
    this.viewingDistanceCm = 40.0,
    this.calibrationProfileId,
    this.practiceCompleted = false,
    this.lastObservation,
    this.interruptedByLifecycle = false,
    this.interruptionReasonFa,
    this.vaLogmar,
    this.amslerDistortionScore,
    this.amslerCentralScotoma = false,
    this.qualityValid = false,
    this.outboxEntry,
  });

  final VisionTestStage stage;
  final VisionTestKind? kind;
  final DeviceEligibilityResult? eligibility;
  final EyeLaterality? selectedEye;
  final double pixelsPerMm;
  final double viewingDistanceCm;
  final String? calibrationProfileId;
  final bool practiceCompleted;
  final SensorObservation? lastObservation;
  final bool interruptedByLifecycle;
  final String? interruptionReasonFa;
  final double? vaLogmar;
  final double? amslerDistortionScore;
  final bool amslerCentralScotoma;
  final bool qualityValid;
  final OutboxEntry? outboxEntry;

  bool get canStartClinicalSession =>
      (eligibility?.eligible ?? false) &&
      selectedEye != null &&
      calibrationProfileId != null &&
      (lastObservation?.allPassed ?? false) &&
      !interruptedByLifecycle;

  VisionTestSessionState copyWith({
    VisionTestStage? stage,
    VisionTestKind? kind,
    DeviceEligibilityResult? eligibility,
    EyeLaterality? selectedEye,
    double? pixelsPerMm,
    double? viewingDistanceCm,
    String? calibrationProfileId,
    bool? practiceCompleted,
    SensorObservation? lastObservation,
    bool? interruptedByLifecycle,
    String? interruptionReasonFa,
    double? vaLogmar,
    double? amslerDistortionScore,
    bool? amslerCentralScotoma,
    bool? qualityValid,
    OutboxEntry? outboxEntry,
  }) {
    return VisionTestSessionState(
      stage: stage ?? this.stage,
      kind: kind ?? this.kind,
      eligibility: eligibility ?? this.eligibility,
      selectedEye: selectedEye ?? this.selectedEye,
      pixelsPerMm: pixelsPerMm ?? this.pixelsPerMm,
      viewingDistanceCm: viewingDistanceCm ?? this.viewingDistanceCm,
      calibrationProfileId: calibrationProfileId ?? this.calibrationProfileId,
      practiceCompleted: practiceCompleted ?? this.practiceCompleted,
      lastObservation: lastObservation ?? this.lastObservation,
      interruptedByLifecycle: interruptedByLifecycle ?? this.interruptedByLifecycle,
      interruptionReasonFa: interruptionReasonFa ?? this.interruptionReasonFa,
      vaLogmar: vaLogmar ?? this.vaLogmar,
      amslerDistortionScore: amslerDistortionScore ?? this.amslerDistortionScore,
      amslerCentralScotoma: amslerCentralScotoma ?? this.amslerCentralScotoma,
      qualityValid: qualityValid ?? this.qualityValid,
      outboxEntry: outboxEntry ?? this.outboxEntry,
    );
  }
}

class VisionTestingController extends Notifier<VisionTestSessionState> {
  static const Uuid _uuid = Uuid();

  @override
  VisionTestSessionState build() => const VisionTestSessionState();

  void startAssignment(VisionTestKind kind) {
    state = VisionTestSessionState(
      stage: VisionTestStage.eligibility,
      kind: kind,
    );
  }

  void recordEligibility(DeviceEligibilityResult result) {
    state = state.copyWith(
      stage: VisionTestStage.eligibility,
      eligibility: result,
    );
  }

  void confirmEye(EyeLaterality eye) {
    state = state.copyWith(
      stage: VisionTestStage.eyeConfirmed,
      selectedEye: eye,
    );
  }

  void markInstructionsRead() {
    state = state.copyWith(stage: VisionTestStage.instructions);
  }

  Future<CalibrationProfileResponse> registerCalibration({
    required double cardWidthLogicalPx,
    double devicePixelRatio = 1.0,
    double viewingDistanceCm = 40.0,
  }) async {
    final session = ref.read(sessionProvider)!;
    final gw = ref.read(patientGatewayProvider);
    final screenWidthMm = 85.6 * (400.0 / cardWidthLogicalPx).clamp(0.5, 2.5);
    final pixelsPerMm = (cardWidthLogicalPx * devicePixelRatio) / 85.6;

    final resp = await gw.registerCalibrationProfile(
      session: session,
      request: CalibrationProfileRequest(
        patientId: session.patientId,
        clinicId: session.clinicId,
        deviceFingerprintSha256: 'web_client_cal_v1',
        screenWidthMm: double.parse(screenWidthMm.toStringAsFixed(2)),
        viewingDistanceCm: viewingDistanceCm,
        calibratedBy: session.actorType,
        verified: state.eligibility?.eligible ?? false,
      ),
    );

    state = state.copyWith(
      stage: VisionTestStage.calibrated,
      pixelsPerMm: pixelsPerMm,
      viewingDistanceCm: viewingDistanceCm,
      calibrationProfileId: resp.calibrationProfileId,
    );
    return resp;
  }

  void completePractice() {
    state = state.copyWith(
      stage: VisionTestStage.practice,
      practiceCompleted: true,
    );
  }

  void recordPreflightObservation(SensorObservation obs) {
    state = state.copyWith(
      stage: VisionTestStage.preflight,
      lastObservation: obs,
      interruptedByLifecycle: false,
    );
  }

  bool startActiveTrials() {
    if (!state.canStartClinicalSession) return false;
    state = state.copyWith(stage: VisionTestStage.activeTrials);
    return true;
  }

  void markInterrupted(String reasonFa) {
    state = state.copyWith(
      stage: VisionTestStage.interrupted,
      interruptedByLifecycle: true,
      interruptionReasonFa: reasonFa,
      qualityValid: false,
    );
  }

  Future<OutboxEntry> submitCompletedTest({
    double? vaLogmar,
    double? amslerDistortionScore,
    bool amslerCentralScotoma = false,
  }) async {
    final session = ref.read(sessionProvider)!;
    final eye = state.selectedEye!;
    final kind = state.kind!;
    final obs = state.lastObservation;
    final partition = SessionCacheRepository.partitionFor(session);
    final outbox = ref.read(outboxQueueProvider);
    final key = _uuid.v4();
    final nowUtc = DateTime.now().toUtc();

    final req = HomeVisionTestRequest(
      patientId: session.patientId,
      calibrationProfileId: state.calibrationProfileId,
      eyeLaterality: eye,
      testType: kind.wireCode,
      vaLogmar: vaLogmar,
      amslerDistortionScore: amslerDistortionScore,
      amslerCentralScotoma: kind == VisionTestKind.amsler ? amslerCentralScotoma : null,
      viewingDistanceCm: obs?.viewingDistanceCm ?? state.viewingDistanceCm,
      ambientLux: obs?.ambientLux ?? 0.0,
      deviceTiltDeg: obs?.deviceTiltDeg ?? 90.0,
      glareDetected: obs?.glareDetected ?? true,
    );

    final entry = OutboxEntry(
      idempotencyKey: key,
      partition: partition,
      operationType: 'home_vision_test',
      endpointPath: '/v1/r2/home-tests',
      payloadJson: jsonEncode(<String, Object?>{'request': req.toJson()}),
      createdAtUtc: nowUtc,
      status: OutboxSyncStatus.pendingUpload,
      eyeLaterality: eye.value,
    );

    await outbox.enqueue(entry);
    await outbox.flushPartition(partition);
    final list = await outbox.listForPartition(partition);
    final committed = list.firstWhere((e) => e.idempotencyKey == key, orElse: () => entry);
    final validQuality = !state.interruptedByLifecycle && (obs?.allPassed ?? false);

    state = state.copyWith(
      stage: VisionTestStage.receipt,
      vaLogmar: vaLogmar,
      amslerDistortionScore: amslerDistortionScore,
      amslerCentralScotoma: amslerCentralScotoma,
      qualityValid: validQuality,
      outboxEntry: committed,
    );
    return committed;
  }
}

final visionTestingControllerProvider =
    NotifierProvider<VisionTestingController, VisionTestSessionState>(
  VisionTestingController.new,
);

final visionTrendsProvider = FutureProvider<PatientVisionTrendsResponse>((ref) async {
  final session = ref.watch(sessionProvider);
  if (session == null) {
    throw StateError('Unauthenticated');
  }
  return ref.read(patientGatewayProvider).getVisionTrends(session);
});
