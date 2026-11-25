import 'package:flutter/material.dart';
import 'bina_palette.dart';

/// Authoritative Vazirmatn Persian typographic scale (`v2.1 §5.1`).
/// Zero tracking on connected Persian script; multiplier heights only.
abstract final class BinaTypography {
  static const String fontFamily = 'Vazirmatn';

  static TextTheme buildTextTheme(BinaPalette p) {
    TextStyle base(double size, FontWeight weight, double height, {Color? color}) {
      return TextStyle(
        fontFamily: fontFamily,
        fontSize: size,
        fontWeight: weight,
        height: height,
        letterSpacing: 0,
        color: color ?? p.onSurface,
      );
    }

    return TextTheme(
      displayLarge: base(40, FontWeight.w700, 1.30),
      displayMedium: base(34, FontWeight.w700, 1.30),
      displaySmall: base(28, FontWeight.w700, 1.35),
      headlineLarge: base(28, FontWeight.w700, 1.40),
      headlineMedium: base(24, FontWeight.w700, 1.45),
      headlineSmall: base(22, FontWeight.w700, 1.45),
      titleLarge: base(20, FontWeight.w700, 1.45),
      titleMedium: base(18, FontWeight.w600, 1.50),
      titleSmall: base(16, FontWeight.w600, 1.55),
      bodyLarge: base(18, FontWeight.w400, 1.60),
      bodyMedium: base(16, FontWeight.w400, 1.60),
      bodySmall: base(14, FontWeight.w400, 1.55, color: p.onSurfaceVariant),
      labelLarge: base(18, FontWeight.w600, 1.45),
      labelMedium: base(15, FontWeight.w600, 1.45),
      labelSmall: base(13, FontWeight.w500, 1.50, color: p.onSurfaceVariant),
    );
  }

  static TextStyle metricCompact(BinaPalette p) => TextStyle(
        fontFamily: fontFamily,
        fontSize: 22,
        fontWeight: FontWeight.w700,
        height: 1.35,
        letterSpacing: 0,
        color: p.onSurface,
      );

  static TextStyle timeLabel(BinaPalette p, {bool critical = false}) => TextStyle(
        fontFamily: fontFamily,
        fontSize: critical ? 18 : 16,
        fontWeight: FontWeight.w600,
        height: 1.40,
        letterSpacing: 0,
        color: p.onSurface,
        fontFeatures: const <FontFeature>[FontFeature.tabularFigures()],
      );

  static TextStyle chartTick(BinaPalette p) => TextStyle(
        fontFamily: fontFamily,
        fontSize: 13,
        fontWeight: FontWeight.w500,
        height: 1.40,
        letterSpacing: 0,
        color: p.chartAxis,
      );
}
