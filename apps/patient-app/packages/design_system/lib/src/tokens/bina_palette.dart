import 'package:flutter/material.dart';

/// Authoritative Bina Clinical Glass color palette (`v2.1 §4.3`).
///
/// Every UI token resolves through [BinaPalette.light] or [BinaPalette.dark]
/// — never use raw hex literals in feature modules.
@immutable
class BinaPalette {
  const BinaPalette({
    required this.brightness,
    required this.canvas,
    required this.canvasTop,
    required this.canvasBottom,
    required this.surface,
    required this.surfaceRaised,
    required this.surfaceSoft,
    required this.surfaceMint,
    required this.surfaceAqua,
    required this.surfaceCream,
    required this.onSurface,
    required this.onSurfaceVariant,
    required this.muted,
    required this.primary,
    required this.onPrimary,
    required this.primaryContainer,
    required this.onPrimaryContainer,
    required this.primaryGradStart,
    required this.primaryGradEnd,
    required this.onPrimaryGradient,
    required this.primaryShine,
    required this.secondary,
    required this.onSecondary,
    required this.tertiary,
    required this.onTertiary,
    required this.tertiaryContainer,
    required this.onTertiaryContainer,
    required this.outline,
    required this.outlineVariant,
    required this.glassEdge,
    required this.focus,
    required this.shadow,
    required this.scrim,
    required this.disabledBg,
    required this.disabledFg,
    required this.success,
    required this.successBg,
    required this.successIcon,
    required this.successVivid,
    required this.warning,
    required this.warningBg,
    required this.error,
    required this.errorBg,
    required this.urgentAction,
    required this.onUrgentAction,
    required this.info,
    required this.infoBg,
    required this.neutral,
    required this.neutralBg,
    required this.medicationWell,
    required this.medicationInk,
    required this.planWell,
    required this.planInk,
    required this.testWell,
    required this.testInk,
    required this.profileWell,
    required this.profileInk,
    required this.chart1,
    required this.chart2,
    required this.chartAxis,
    required this.chartGrid,
    required this.chartBand,
    required this.chartBandEdge,
    required this.ribbonAqua,
    required this.ribbonTeal,
    required this.ribbonMint,
    required this.ribbonLime,
    required this.ribbonHighlight,
    required this.irisTeal,
    required this.irisGreen,
    required this.vfPaper,
    required this.vfInk,
  });

  final Brightness brightness;
  final Color canvas;
  final Color canvasTop;
  final Color canvasBottom;
  final Color surface;
  final Color surfaceRaised;
  final Color surfaceSoft;
  final Color surfaceMint;
  final Color surfaceAqua;
  final Color surfaceCream;
  final Color onSurface;
  final Color onSurfaceVariant;
  final Color muted;
  final Color primary;
  final Color onPrimary;
  final Color primaryContainer;
  final Color onPrimaryContainer;
  final Color primaryGradStart;
  final Color primaryGradEnd;
  final Color onPrimaryGradient;
  final Color primaryShine;
  final Color secondary;
  final Color onSecondary;
  final Color tertiary;
  final Color onTertiary;
  final Color tertiaryContainer;
  final Color onTertiaryContainer;
  final Color outline;
  final Color outlineVariant;
  final Color glassEdge;
  final Color focus;
  final Color shadow;
  final Color scrim;
  final Color disabledBg;
  final Color disabledFg;
  final Color success;
  final Color successBg;
  final Color successIcon;
  final Color successVivid;
  final Color warning;
  final Color warningBg;
  final Color error;
  final Color errorBg;
  final Color urgentAction;
  final Color onUrgentAction;
  final Color info;
  final Color infoBg;
  final Color neutral;
  final Color neutralBg;
  final Color medicationWell;
  final Color medicationInk;
  final Color planWell;
  final Color planInk;
  final Color testWell;
  final Color testInk;
  final Color profileWell;
  final Color profileInk;
  final Color chart1;
  final Color chart2;
  final Color chartAxis;
  final Color chartGrid;
  final Color chartBand;
  final Color chartBandEdge;
  final Color ribbonAqua;
  final Color ribbonTeal;
  final Color ribbonMint;
  final Color ribbonLime;
  final Color ribbonHighlight;
  final Color irisTeal;
  final Color irisGreen;
  final Color vfPaper;
  final Color vfInk;

  static BinaPalette forBrightness(Brightness brightness) =>
      brightness == Brightness.dark ? dark : light;

  static const BinaPalette light = BinaPalette(
    brightness: Brightness.light,
    canvas: Color(0xFFECF8F9),
    canvasTop: Color(0xFFF7FBFC),
    canvasBottom: Color(0xFFE4F4F7),
    surface: Color(0xFFF8FBFC),
    surfaceRaised: Color(0xFFFFFFFF),
    surfaceSoft: Color(0xFFEAF6F7),
    surfaceMint: Color(0xFFE5F8F2),
    surfaceAqua: Color(0xFFE5F5F8),
    surfaceCream: Color(0xFFF5F9E8),
    onSurface: Color(0xFF102126),
    onSurfaceVariant: Color(0xFF40565D),
    muted: Color(0xFF50676D),
    primary: Color(0xFF006C66),
    onPrimary: Color(0xFFFFFFFF),
    primaryContainer: Color(0xFFD2F3E3),
    onPrimaryContainer: Color(0xFF005D48),
    primaryGradStart: Color(0xFF007D77),
    primaryGradEnd: Color(0xFF005C57),
    onPrimaryGradient: Color(0xFFFFFFFF),
    primaryShine: Color(0xFF06A99E),
    secondary: Color(0xFF007F78),
    onSecondary: Color(0xFFFFFFFF),
    tertiary: Color(0xFF5654A6),
    onTertiary: Color(0xFFFFFFFF),
    tertiaryContainer: Color(0xFFE7E8FC),
    onTertiaryContainer: Color(0xFF41418E),
    outline: Color(0xFF55747A),
    outlineVariant: Color(0xFFD4E7E9),
    glassEdge: Color(0xFFFFFFFF),
    focus: Color(0xFF006C66),
    shadow: Color(0xFF2D777C),
    scrim: Color(0xFF10292D),
    disabledBg: Color(0xFFE1EBED),
    disabledFg: Color(0xFF52686D),
    success: Color(0xFF216F1C),
    successBg: Color(0xFFDDF6D5),
    successIcon: Color(0xFF237A19),
    successVivid: Color(0xFF20B600),
    warning: Color(0xFF805200),
    warningBg: Color(0xFFFFF2D3),
    error: Color(0xFFA72D35),
    errorBg: Color(0xFFFDE8E8),
    urgentAction: Color(0xFFA72D35),
    onUrgentAction: Color(0xFFFFFFFF),
    info: Color(0xFF195B89),
    infoBg: Color(0xFFE1F0FA),
    neutral: Color(0xFF40565D),
    neutralBg: Color(0xFFEAF2F3),
    medicationWell: Color(0xFFFFF3D8),
    medicationInk: Color(0xFF8A5800),
    planWell: Color(0xFFE3EEFF),
    planInk: Color(0xFF2255A4),
    testWell: Color(0xFFDCF5EF),
    testInk: Color(0xFF006C66),
    profileWell: Color(0xFFE0F4D9),
    profileInk: Color(0xFF296B2B),
    chart1: Color(0xFF287A19),
    chart2: Color(0xFF006E7A),
    chartAxis: Color(0xFF40565D),
    chartGrid: Color(0xFFD2E3E6),
    chartBand: Color(0xFFDDF6D5),
    chartBandEdge: Color(0xFF447B37),
    ribbonAqua: Color(0xFFA6EAE9),
    ribbonTeal: Color(0xFF7BDCCB),
    ribbonMint: Color(0xFFBDEED8),
    ribbonLime: Color(0xFFD9F3AE),
    ribbonHighlight: Color(0xFFFFFFFF),
    irisTeal: Color(0xFF008B88),
    irisGreen: Color(0xFF83CF58),
    vfPaper: Color(0xFFFFFFFF),
    vfInk: Color(0xFF171717),
  );

  static const BinaPalette dark = BinaPalette(
    brightness: Brightness.dark,
    canvas: Color(0xFF091B20),
    canvasTop: Color(0xFF10272D),
    canvasBottom: Color(0xFF0C2228),
    surface: Color(0xFF142C32),
    surfaceRaised: Color(0xFF1B373D),
    surfaceSoft: Color(0xFF18343A),
    surfaceMint: Color(0xFF173F3A),
    surfaceAqua: Color(0xFF17343D),
    surfaceCream: Color(0xFF293C30),
    onSurface: Color(0xFFF1F8F7),
    onSurfaceVariant: Color(0xFFB8D0D1),
    muted: Color(0xFFA7C2C4),
    primary: Color(0xFF77E0CE),
    onPrimary: Color(0xFF062823),
    primaryContainer: Color(0xFF194B42),
    onPrimaryContainer: Color(0xFF9BF1D2),
    primaryGradStart: Color(0xFF097D74),
    primaryGradEnd: Color(0xFF07554F),
    onPrimaryGradient: Color(0xFFFFFFFF),
    primaryShine: Color(0xFF29B7A6),
    secondary: Color(0xFF68D9D1),
    onSecondary: Color(0xFF082E2B),
    tertiary: Color(0xFFBEBBFF),
    onTertiary: Color(0xFF222052),
    tertiaryContainer: Color(0xFF302D58),
    onTertiaryContainer: Color(0xFFD4D1FF),
    outline: Color(0xFF7FA1A6),
    outlineVariant: Color(0xFF35535A),
    glassEdge: Color(0xFF3D6267),
    focus: Color(0xFF80E7D5),
    shadow: Color(0xFF00090C),
    scrim: Color(0xFF000000),
    disabledBg: Color(0xFF243B40),
    disabledFg: Color(0xFFA1B8BB),
    success: Color(0xFF9AE78F),
    successBg: Color(0xFF203E29),
    successIcon: Color(0xFF287A3A),
    successVivid: Color(0xFF6AD950),
    warning: Color(0xFFFFD387),
    warningBg: Color(0xFF44351D),
    error: Color(0xFFFFB3B5),
    errorBg: Color(0xFF49262D),
    urgentAction: Color(0xFFAA303A),
    onUrgentAction: Color(0xFFFFFFFF),
    info: Color(0xFFA8D6FF),
    infoBg: Color(0xFF1C364B),
    neutral: Color(0xFFC3D4D5),
    neutralBg: Color(0xFF263D42),
    medicationWell: Color(0xFF44351D),
    medicationInk: Color(0xFFFFD387),
    planWell: Color(0xFF203A55),
    planInk: Color(0xFFA8CAFF),
    testWell: Color(0xFF1D463F),
    testInk: Color(0xFF8FE3D6),
    profileWell: Color(0xFF273E30),
    profileInk: Color(0xFFB1E8A6),
    chart1: Color(0xFF9AE78F),
    chart2: Color(0xFF72DBEE),
    chartAxis: Color(0xFFB8D0D1),
    chartGrid: Color(0xFF36545A),
    chartBand: Color(0xFF28482D),
    chartBandEdge: Color(0xFF9AD58E),
    ribbonAqua: Color(0xFF16484E),
    ribbonTeal: Color(0xFF176052),
    ribbonMint: Color(0xFF1D513F),
    ribbonLime: Color(0xFF40572E),
    ribbonHighlight: Color(0xFF659E93),
    irisTeal: Color(0xFF169E96),
    irisGreen: Color(0xFF77BC63),
    vfPaper: Color(0xFFFFFFFF),
    vfInk: Color(0xFF171717),
  );

  ColorScheme toColorScheme() {
    final opp = brightness == Brightness.light ? dark : light;
    return ColorScheme(
      brightness: brightness,
      primary: primary,
      onPrimary: onPrimary,
      primaryContainer: primaryContainer,
      onPrimaryContainer: onPrimaryContainer,
      secondary: secondary,
      onSecondary: onSecondary,
      secondaryContainer: testWell,
      onSecondaryContainer: testInk,
      tertiary: tertiary,
      onTertiary: onTertiary,
      tertiaryContainer: tertiaryContainer,
      onTertiaryContainer: onTertiaryContainer,
      error: urgentAction,
      onError: onUrgentAction,
      errorContainer: errorBg,
      onErrorContainer: error,
      surface: surface,
      onSurface: onSurface,
      surfaceContainerLowest: canvasTop,
      surfaceContainerLow: surface,
      surfaceContainer: surfaceSoft,
      surfaceContainerHigh: surfaceRaised,
      surfaceContainerHighest: surfaceAqua,
      onSurfaceVariant: onSurfaceVariant,
      outline: outline,
      outlineVariant: outlineVariant,
      shadow: shadow,
      scrim: scrim,
      inverseSurface: opp.surface,
      onInverseSurface: opp.onSurface,
      inversePrimary: opp.primary,
      surfaceTint: Colors.transparent,
    );
  }
}
