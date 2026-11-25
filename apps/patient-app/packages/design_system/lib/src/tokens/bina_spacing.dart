import 'package:flutter/material.dart';
import 'bina_palette.dart';

/// Named spacing tokens in logical dp (`v2.1 §5.2`).
abstract final class BinaSpacing {
  static const double space0 = 0;
  static const double space1 = 4;
  static const double space2 = 8;
  static const double space3 = 12;
  static const double space4 = 16;
  static const double space5 = 20;
  static const double space6 = 24;
  static const double space8 = 32;
  static const double space10 = 40;
  static const double space12 = 48;
  static const double space16 = 64;

  static const double marginCompact = 16;
  static const double marginTiny = 12;
  static const double marginMedium = 24;
  static const double marginExpanded = 32;

  static const double gapSection = 24;
  static const double gapCard = 12;
  static const double gapField = 16;
  static const double gapMetric = 12;

  static const double cardPaddingCompact = 16;
  static const double cardPaddingExpanded = 20;

  static const double touchMin = 48;
  static const double touchComfort = 56;
  static const double urgentTouchMin = 64;

  static const double rowMin = 60;
  static const double rowRich = 76;
  static const double fieldMin = 60;
  static const double buttonMin = 56;
  static const double topBarMin = 64;
  static const double navBarMin = 76;

  static const double iconWellSmall = 40;
  static const double iconWell = 48;
  static const double iconWellLarge = 56;
  static const double iconStandard = 24;

  static const double avatarHeader = 48;
  static const double avatarProfile = 76;

  static const double readingMax = 640;
  static const double workspaceMax = 1120;

  static double horizontalMarginFor(double width) {
    if (width < 340) return marginTiny;
    if (width < 600) return marginCompact;
    if (width < 840) return marginMedium;
    return marginExpanded;
  }
}

/// Named shape radius tokens (`v2.1 §5.2`).
abstract final class BinaRadii {
  static const double small = 8;
  static const double medium = 12;
  static const double large = 16;
  static const double xl = 20;
  static const double hero = 24;
  static const double dock = 24;
  static const double pill = 999;
}

/// Motion timing and curves (`v2.1 §8`), zeroed automatically when reduced motion
/// or disabled animations are active.
abstract final class BinaMotion {
  static const Duration instant = Duration.zero;
  static const Duration press = Duration(milliseconds: 100);
  static const Duration tab = Duration(milliseconds: 120);
  static const Duration select = Duration(milliseconds: 140);
  static const Duration feedback = Duration(milliseconds: 160);
  static const Duration expand = Duration(milliseconds: 180);
  static const Duration route = Duration(milliseconds: 220);
  static const Duration sheet = Duration(milliseconds: 220);

  static const Curve curveStandard = Curves.easeOutCubic;
  static const Curve curvePress = Curves.easeOut;
  static const Curve curveExpand = Curves.easeInOutCubic;

  static bool isReduced(BuildContext context) {
    final mq = MediaQuery.maybeOf(context);
    if (mq == null) return false;
    return mq.disableAnimations || mq.accessibleNavigation;
  }

  static Duration resolve(BuildContext context, Duration normal) =>
      isReduced(context) ? Duration.zero : normal;
}

/// Named ThemeExtension holding all Bina Clinical Glass semantic colors,
/// gradient recipes (`G01`–`G08`), and shadows (`v2.1 §4.3–§4.4`).
@immutable
class BinaSemanticColors extends ThemeExtension<BinaSemanticColors> {
  const BinaSemanticColors({
    required this.palette,
    this.highContrast = false,
  });

  final BinaPalette palette;
  final bool highContrast;

  bool get isDark => palette.brightness == Brightness.dark;

  // Gradient G01: Canvas
  Gradient get canvasGradient => highContrast
      ? LinearGradient(colors: <Color>[palette.canvas, palette.canvas])
      : LinearGradient(
          begin: AlignmentDirectional.topStart,
          end: AlignmentDirectional.bottomEnd,
          stops: const <double>[0.0, 0.35, 1.0],
          colors: <Color>[palette.canvasTop, palette.canvas, palette.canvasBottom],
        );

  // Gradient G02: Frosted Surface
  Gradient get frostedGradient {
    if (highContrast) {
      return LinearGradient(colors: <Color>[palette.surface, palette.surface]);
    }
    return isDark
        ? LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: <Color>[
              palette.surfaceRaised.withValues(alpha: 0.98),
              palette.surface.withValues(alpha: 0.96),
              palette.surfaceAqua.withValues(alpha: 0.94),
            ],
          )
        : LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: <Color>[
              palette.surfaceRaised.withValues(alpha: 0.95),
              palette.surface.withValues(alpha: 0.94),
              palette.surfaceAqua.withValues(alpha: 0.88),
            ],
          );
  }

  // Gradient G03: Mint Hero
  Gradient get mintHeroGradient => highContrast
      ? LinearGradient(colors: <Color>[palette.surfaceMint, palette.surfaceMint])
      : LinearGradient(
          begin: AlignmentDirectional.topStart,
          end: AlignmentDirectional.bottomEnd,
          colors: <Color>[palette.surfaceCream, palette.surfaceMint, palette.surfaceAqua],
        );

  // Gradient G04 / G05: Primary Button & Active Segment
  Gradient get primaryButtonGradient => LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: <Color>[palette.primaryGradStart, palette.primaryGradEnd],
      );

  // Gradient G06: Metric Tint
  Gradient metricGradient({bool mintAccent = false}) => LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: <Color>[
          palette.surfaceRaised,
          mintAccent ? palette.surfaceMint : palette.surfaceCream,
        ],
      );

  // Gradient G07: Floating Dock
  Gradient get dockGradient => highContrast
      ? LinearGradient(colors: <Color>[palette.surfaceRaised, palette.surface])
      : LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: <Color>[
            palette.surfaceRaised.withValues(alpha: 0.97),
            palette.surface.withValues(alpha: 0.94),
          ],
        );

  // Gradient G08: Chart Callout
  Gradient chartCalloutGradient({required bool approved}) => LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: approved
            ? <Color>[palette.successBg, palette.surfaceMint]
            : <Color>[palette.surfaceSoft, palette.surfaceSoft],
      );

  Color get cardStrokeColor => highContrast
      ? palette.outline
      : palette.glassEdge.withValues(alpha: isDark ? 0.65 : 0.90);

  double get cardStrokeWidth => highContrast ? 2.0 : 1.0;

  List<BoxShadow> get shadowNone => const <BoxShadow>[];

  List<BoxShadow> get shadowCard {
    if (highContrast) return const <BoxShadow>[];
    return isDark
        ? <BoxShadow>[
            BoxShadow(color: palette.shadow.withValues(alpha: 0.35), offset: const Offset(0, 6), blurRadius: 16),
            BoxShadow(color: palette.shadow.withValues(alpha: 0.16), offset: const Offset(0, 1), blurRadius: 3),
          ]
        : <BoxShadow>[
            BoxShadow(color: palette.shadow.withValues(alpha: 0.12), offset: const Offset(0, 6), blurRadius: 16),
            BoxShadow(color: palette.shadow.withValues(alpha: 0.05), offset: const Offset(0, 1), blurRadius: 3),
          ];
  }

  List<BoxShadow> get shadowHero {
    if (highContrast) return const <BoxShadow>[];
    return <BoxShadow>[
      BoxShadow(
        color: palette.shadow.withValues(alpha: isDark ? 0.38 : 0.13),
        offset: const Offset(0, 8),
        blurRadius: 22,
      ),
    ];
  }

  List<BoxShadow> get shadowDock {
    if (highContrast) return const <BoxShadow>[];
    return <BoxShadow>[
      BoxShadow(
        color: palette.shadow.withValues(alpha: isDark ? 0.42 : 0.14),
        offset: const Offset(0, 8),
        blurRadius: 22,
      ),
    ];
  }

  List<BoxShadow> get shadowAction {
    if (highContrast) return const <BoxShadow>[];
    return <BoxShadow>[
      BoxShadow(
        color: palette.shadow.withValues(alpha: isDark ? 0.28 : 0.18),
        offset: const Offset(0, 5),
        blurRadius: 12,
      ),
    ];
  }

  List<BoxShadow> get shadowOverlay {
    if (highContrast) return const <BoxShadow>[];
    return <BoxShadow>[
      BoxShadow(
        color: palette.shadow.withValues(alpha: isDark ? 0.50 : 0.24),
        offset: const Offset(0, 12),
        blurRadius: 32,
      ),
    ];
  }

  @override
  BinaSemanticColors copyWith({
    BinaPalette? palette,
    bool? highContrast,
  }) {
    return BinaSemanticColors(
      palette: palette ?? this.palette,
      highContrast: highContrast ?? this.highContrast,
    );
  }

  @override
  BinaSemanticColors lerp(ThemeExtension<BinaSemanticColors>? other, double t) {
    if (other is! BinaSemanticColors) return this;
    return BinaSemanticColors(
      palette: t < 0.5 ? palette : other.palette,
      highContrast: t < 0.5 ? highContrast : other.highContrast,
    );
  }
}

extension BinaBuildContextTheme on BuildContext {
  BinaSemanticColors get bina =>
      Theme.of(this).extension<BinaSemanticColors>() ??
      BinaSemanticColors(palette: BinaPalette.forBrightness(Theme.of(this).brightness));

  BinaPalette get binaPalette => bina.palette;
}
