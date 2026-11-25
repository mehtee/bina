import 'package:flutter/widgets.dart';

/// Immutable distortion or scotoma mark captured in normalized `[0, 1]` grid coordinates.
@immutable
class AmslerDistortionMark {
  const AmslerDistortionMark({
    required this.xNorm,
    required this.yNorm,
    this.radiusNorm = 0.055,
    this.isScotoma = false,
  });

  final double xNorm;
  final double yNorm;
  final double radiusNorm;
  final bool isScotoma;

  Map<String, Object?> toJson() => <String, Object?>{
        'xNorm': xNorm,
        'yNorm': yNorm,
        'radiusNorm': radiusNorm,
        'isScotoma': isScotoma,
      };
}

/// Crisp unrounded 20×20 clinical Amsler grid painter (`v2.1 §10.4`).
/// Immune to Dark Mode inversion, gradients, rounded corners, and animations.
class AmslerGridPainter extends CustomPainter {
  const AmslerGridPainter({
    this.marks = const <AmslerDistortionMark>[],
    this.gridLines = 20,
    this.gridColor = const Color(0xFF1E293B),
    this.fixationColor = const Color(0xFF0F172A),
    this.distortionColor = const Color(0xFFD97706),
    this.scotomaColor = const Color(0xFFB91C1C),
  });

  final List<AmslerDistortionMark> marks;
  final int gridLines;
  final Color gridColor;
  final Color fixationColor;
  final Color distortionColor;
  final Color scotomaColor;

  @override
  void paint(Canvas canvas, Size size) {
    final side = size.shortestSide;
    final left = (size.width - side) / 2.0;
    final top = (size.height - side) / 2.0;
    final step = side / gridLines;

    final gridPaint = Paint()
      ..color = gridColor
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    for (var i = 0; i <= gridLines; i += 1) {
      final offset = i * step;
      canvas.drawLine(Offset(left + offset, top), Offset(left + offset, top + side), gridPaint);
      canvas.drawLine(Offset(left, top + offset), Offset(left + side, top + offset), gridPaint);
    }

    // Crisp outer border
    canvas.drawRect(
      Rect.fromLTWH(left, top, side, side),
      Paint()
        ..color = gridColor
        ..strokeWidth = 2.0
        ..style = PaintingStyle.stroke,
    );

    // Central fixation point
    canvas.drawCircle(
      Offset(left + side / 2.0, top + side / 2.0),
      4.5,
      Paint()..color = fixationColor,
    );

    // Protocol marks in raw normalized coordinates
    for (final m in marks) {
      final cx = left + m.xNorm.clamp(0.0, 1.0) * side;
      final cy = top + m.yNorm.clamp(0.0, 1.0) * side;
      final r = (m.radiusNorm * side).clamp(6.0, side * 0.25);
      final color = m.isScotoma ? scotomaColor : distortionColor;
      canvas.drawCircle(
        Offset(cx, cy),
        r,
        Paint()
          ..color = color.withValues(alpha: 0.35)
          ..style = PaintingStyle.fill,
      );
      canvas.drawCircle(
        Offset(cx, cy),
        r,
        Paint()
          ..color = color
          ..strokeWidth = 1.8
          ..style = PaintingStyle.stroke,
      );
    }
  }

  @override
  bool shouldRepaint(covariant AmslerGridPainter oldDelegate) =>
      oldDelegate.marks.length != marks.length ||
      oldDelegate.marks != marks ||
      oldDelegate.gridLines != gridLines;
}
