import 'package:meta/meta.dart';

/// Exhaustive sensor quality states (`BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md` §10.5).
enum SensorQualityStatus {
  checking,
  passed,
  needsCorrection,
  unavailable,
  notEligible,
}

@immutable
class SensorObservation {
  const SensorObservation({
    required this.viewingDistanceStatus,
    required this.ambientLightStatus,
    required this.stabilityStatus,
    required this.isVerificationAdapter,
    this.viewingDistanceCm,
    this.ambientLux,
    this.deviceTiltDeg,
    this.glareDetected = false,
  });

  final SensorQualityStatus viewingDistanceStatus;
  final SensorQualityStatus ambientLightStatus;
  final SensorQualityStatus stabilityStatus;
  final bool isVerificationAdapter;
  final double? viewingDistanceCm;
  final double? ambientLux;
  final double? deviceTiltDeg;
  final bool glareDetected;

  bool get allPassed =>
      viewingDistanceStatus == SensorQualityStatus.passed &&
      ambientLightStatus == SensorQualityStatus.passed &&
      stabilityStatus == SensorQualityStatus.passed &&
      !glareDetected;
}

@immutable
class DeviceEligibilityResult {
  const DeviceEligibilityResult({
    required this.eligible,
    required this.isVerificationOnly,
    required this.reasonCode,
  });

  final bool eligible;
  final bool isVerificationOnly;
  final String reasonCode;
}

/// OCP ports allowing native ARKit/MediaPipe/IMU/Lux adapters to plug in on
/// mobile while keeping deterministic Web verification adapters separate.
abstract interface class DeviceQualificationPort {
  Future<DeviceEligibilityResult> checkEligibility();
}

abstract interface class SensorPreflightPort {
  Future<SensorObservation> sampleOnce();
  Future<void> stopAndDispose();
}

/// Deterministic Web verification adapter (`AGENTS.md` §3 & `v2.1 §9.6 TEST-02`).
/// Reports [SensorQualityStatus.unavailable] honestly — never spoofs hardware passes.
final class WebVerificationSensorAdapter
    implements DeviceQualificationPort, SensorPreflightPort {
  const WebVerificationSensorAdapter({this.allowLabVerification = false});

  final bool allowLabVerification;

  @override
  Future<DeviceEligibilityResult> checkEligibility() async {
    return DeviceEligibilityResult(
      eligible: allowLabVerification,
      isVerificationOnly: true,
      reasonCode: allowLabVerification ? 'WEB_VERIFICATION_ONLY' : 'WEB_DEVICE_UNQUALIFIED',
    );
  }

  @override
  Future<SensorObservation> sampleOnce() async {
    if (allowLabVerification) {
      return const SensorObservation(
        viewingDistanceStatus: SensorQualityStatus.passed,
        ambientLightStatus: SensorQualityStatus.passed,
        stabilityStatus: SensorQualityStatus.passed,
        isVerificationAdapter: true,
        viewingDistanceCm: 40.0,
        ambientLux: 350.0,
        deviceTiltDeg: 2.0,
        glareDetected: false,
      );
    }
    return const SensorObservation(
      viewingDistanceStatus: SensorQualityStatus.unavailable,
      ambientLightStatus: SensorQualityStatus.unavailable,
      stabilityStatus: SensorQualityStatus.unavailable,
      isVerificationAdapter: true,
    );
  }

  @override
  Future<void> stopAndDispose() async {}
}
