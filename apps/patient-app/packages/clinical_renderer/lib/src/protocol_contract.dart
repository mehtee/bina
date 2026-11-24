import 'package:flutter/widgets.dart';

/// Clinical test types supported by the protocol-isolated renderer.
enum ClinicalTestType {
  landoltC,
  amsler,
}

@immutable
class ClinicalStimulusSpec {
  const ClinicalStimulusSpec({
    required this.protocolVersion,
    required this.testType,
    required this.eyeLaterality,
    required this.angularMinutes,
    required this.orientationIndex,
    required this.pixelsPerMm,
    required this.viewingDistanceMm,
  });

  final String protocolVersion;
  final ClinicalTestType testType;
  final String eyeLaterality;
  final double angularMinutes;
  final int orientationIndex;
  final double pixelsPerMm;
  final double viewingDistanceMm;
}

/// OCP contract for Wave 4 Landolt C and Amsler `CustomPainter` implementations.
abstract interface class ClinicalStimulusRendererPort {
  CustomPainter buildPainter(ClinicalStimulusSpec spec);
}
