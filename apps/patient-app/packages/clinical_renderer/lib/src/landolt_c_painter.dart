import 'dart:math' as math;

import 'package:flutter/widgets.dart';
import 'protocol_contract.dart';

/// Physical-angle ISO 8596 geometry for calibrated Landolt C optotypes (`ADR-018` & `v2.1 §10.3`).
@immutable
class LandoltCGeometry {
  const LandoltCGeometry({
    required this.gapMm,
    required this.strokeWidthMm,
    required this.outerDiameterMm,
    required this.gapLogicalPx,
    required this.strokeLogicalPx,
    required this.outerDiameterLogicalPx,
  });

  final double gapMm;
  final double strokeWidthMm;
  final double outerDiameterMm;
  final double gapLogicalPx;
  final double strokeLogicalPx;
  final double outerDiameterLogicalPx;

  /// Converts logMAR acuity to minimum angle of resolution (MAR) in arcminutes: $10^{\text{logMAR}}$.
  static double angularMinutesForLogMar(double logMar) => math.pow(10.0, logMar).toDouble();

  /// Converts MAR arcminutes back to logMAR.
  static double logMarForAngularMinutes(double angularMinutes) =>
      math.log(angularMinutes) / math.ln10;

  /// Computes exact ISO 8596 gap $g = 2 d \tan(\theta / 2)$, stroke = $g$, outer diameter = $5g$.
  factory LandoltCGeometry.fromProtocol({
    required double angularMinutes,
    required double viewingDistanceMm,
    required double pixelsPerMm,
    double devicePixelRatio = 1.0,
  }) {
    final safeAngular = angularMinutes <= 0 ? 1.0 : angularMinutes;
    final thetaRad = safeAngular * (math.pi / (180.0 * 60.0));
    final gapMm = 2.0 * viewingDistanceMm * math.tan(thetaRad / 2.0);
    final strokeMm = gapMm;
    final outerMm = 5.0 * gapMm;
    final safeDpr = devicePixelRatio <= 0 ? 1.0 : devicePixelRatio;
    final logicalPxPerMm = pixelsPerMm / safeDpr;
    return LandoltCGeometry(
      gapMm: gapMm,
      strokeWidthMm: strokeMm,
      outerDiameterMm: outerMm,
      gapLogicalPx: gapMm * logicalPxPerMm,
      strokeLogicalPx: strokeMm * logicalPxPerMm,
      outerDiameterLogicalPx: outerMm * logicalPxPerMm,
    );
  }
}

/// Fixed physical orientation identifiers (`0..7`) immune to RTL mirroring (`v2.1 §10.3`).
const List<double> landoltCOrientationAnglesRad = <double>[
  0.0, // 0: right
  -math.pi / 4.0, // 1: up-right
  -math.pi / 2.0, // 2: up
  -3.0 * math.pi / 4.0, // 3: up-left
  math.pi, // 4: left
  3.0 * math.pi / 4.0, // 5: down-left
  math.pi / 2.0, // 6: down
  math.pi / 4.0, // 7: down-right
];

/// Protocol-isolated ISO 8596 Landolt C optotype `CustomPainter`.
/// Zero dependency on `Theme.of`, `MediaQuery`, or RTL directionality.
class LandoltCPainter extends CustomPainter {
  const LandoltCPainter({
    required this.geometry,
    required this.orientationIndex,
    this.foregroundColor = const Color(0xFF000000),
  });

  final LandoltCGeometry geometry;
  final int orientationIndex;
  final Color foregroundColor;

  @override
  void paint(Canvas canvas, Size size) {
    final normalizedIndex = ((orientationIndex % 8) + 8) % 8;
    final gapAngleCenter = landoltCOrientationAnglesRad[normalizedIndex];

    final stroke = geometry.strokeLogicalPx.clamp(1.0, size.shortestSide / 5.0);
    final outerDiameter = (stroke * 5.0).clamp(5.0, size.shortestSide);
    final midDiameter = outerDiameter - stroke;
    final midRadius = midDiameter / 2.0;

    // Exact angular sweep subtracted for ISO gap width `stroke` along ring radius.
    final sinHalf = (stroke / (2.0 * midRadius)).clamp(0.0, 0.99);
    final gapSweepRad = 2.0 * math.asin(sinHalf);
    final startAngle = gapAngleCenter + gapSweepRad / 2.0;
    final arcSweep = (2.0 * math.pi) - gapSweepRad;

    final rect = Rect.fromCenter(
      center: Offset(size.width / 2.0, size.height / 2.0),
      width: midDiameter,
      height: midDiameter,
    );

    final paint = Paint()
      ..color = foregroundColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.butt
      ..isAntiAlias = true;

    canvas.drawArc(rect, startAngle, arcSweep, false, paint);
  }

  @override
  bool shouldRepaint(covariant LandoltCPainter oldDelegate) =>
      oldDelegate.geometry.outerDiameterLogicalPx != geometry.outerDiameterLogicalPx ||
      oldDelegate.geometry.strokeLogicalPx != geometry.strokeLogicalPx ||
      oldDelegate.orientationIndex != orientationIndex ||
      oldDelegate.foregroundColor != foregroundColor;
}

/// OCP implementation of [ClinicalStimulusRendererPort] for calibrated Landolt C.
final class LandoltCRenderer implements ClinicalStimulusRendererPort {
  const LandoltCRenderer({this.devicePixelRatio = 1.0});

  final double devicePixelRatio;

  @override
  CustomPainter buildPainter(ClinicalStimulusSpec spec) {
    final geometry = LandoltCGeometry.fromProtocol(
      angularMinutes: spec.angularMinutes,
      viewingDistanceMm: spec.viewingDistanceMm,
      pixelsPerMm: spec.pixelsPerMm,
      devicePixelRatio: devicePixelRatio,
    );
    return LandoltCPainter(
      geometry: geometry,
      orientationIndex: spec.orientationIndex,
    );
  }
}
