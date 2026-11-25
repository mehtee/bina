import 'package:flutter/material.dart';
import '../tokens/bina_palette.dart';
import '../tokens/bina_spacing.dart';
import '../tokens/bina_typography.dart';

/// Builds the complete Light, Dark, or High-Contrast Bina Clinical Glass
/// Material 3 [ThemeData] without generated seed color overrides (`v2.1 §12.2`).
ThemeData buildBinaTheme(
  Brightness brightness, {
  bool highContrast = false,
  bool reduceMotion = false,
}) {
  final p = BinaPalette.forBrightness(brightness);
  final scheme = p.toColorScheme();
  final textTheme = BinaTypography.buildTextTheme(p);
  final sem = BinaSemanticColors(
    palette: p,
    highContrast: highContrast,
    reduceMotion: reduceMotion,
  );
  final transitionBuilder = reduceMotion
      ? const _InstantPageTransitionsBuilder()
      : const FadeUpwardsPageTransitionsBuilder();

  return ThemeData(
    useMaterial3: true,
    brightness: brightness,
    colorScheme: scheme,
    scaffoldBackgroundColor: p.canvas,
    fontFamily: BinaTypography.fontFamily,
    visualDensity: VisualDensity.standard,
    materialTapTargetSize: MaterialTapTargetSize.padded,
    pageTransitionsTheme: PageTransitionsTheme(
      builders: <TargetPlatform, PageTransitionsBuilder>{
        TargetPlatform.android: transitionBuilder,
        TargetPlatform.iOS: transitionBuilder,
        TargetPlatform.linux: transitionBuilder,
        TargetPlatform.macOS: transitionBuilder,
        TargetPlatform.windows: transitionBuilder,
        TargetPlatform.fuchsia: transitionBuilder,
      },
    ),
    textTheme: textTheme,
    extensions: <ThemeExtension<dynamic>>[sem],
    appBarTheme: AppBarTheme(
      backgroundColor: Colors.transparent,
      foregroundColor: p.onSurface,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: textTheme.headlineMedium,
    ),
    cardTheme: CardThemeData(
      color: p.surface,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(BinaRadii.xl),
        side: BorderSide(color: sem.cardStrokeColor, width: sem.cardStrokeWidth),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(BinaSpacing.touchMin, BinaSpacing.buttonMin),
        padding: const EdgeInsetsDirectional.symmetric(horizontal: 16, vertical: 12),
        backgroundColor: p.primary,
        foregroundColor: p.onPrimary,
        disabledBackgroundColor: p.disabledBg,
        disabledForegroundColor: p.disabledFg,
        textStyle: textTheme.labelLarge,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(BinaRadii.xl),
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(BinaSpacing.touchMin, BinaSpacing.buttonMin),
        padding: const EdgeInsetsDirectional.symmetric(horizontal: 16, vertical: 12),
        foregroundColor: p.primary,
        side: BorderSide(color: p.outline, width: highContrast ? 2.0 : 1.0),
        textStyle: textTheme.labelLarge,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(BinaRadii.xl),
        ),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        minimumSize: const Size(BinaSpacing.touchMin, BinaSpacing.touchMin),
        foregroundColor: p.primary,
        textStyle: textTheme.labelLarge?.copyWith(decoration: TextDecoration.underline),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: p.surfaceRaised,
      constraints: const BoxConstraints(minHeight: BinaSpacing.fieldMin),
      contentPadding: const EdgeInsetsDirectional.symmetric(horizontal: 16, vertical: 16),
      labelStyle: textTheme.titleSmall,
      hintStyle: textTheme.bodyMedium?.copyWith(color: p.muted),
      helperStyle: textTheme.bodySmall,
      errorStyle: textTheme.bodySmall?.copyWith(color: p.error, fontWeight: FontWeight.w600),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(BinaRadii.medium),
        borderSide: BorderSide(color: p.outline, width: highContrast ? 2.0 : 1.0),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(BinaRadii.medium),
        borderSide: BorderSide(color: p.outline, width: highContrast ? 2.0 : 1.0),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(BinaRadii.medium),
        borderSide: BorderSide(color: p.focus, width: 2.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(BinaRadii.medium),
        borderSide: BorderSide(color: p.error, width: 2.0),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(BinaRadii.medium),
        borderSide: BorderSide(color: p.error, width: 2.5),
      ),
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.disabled)) return p.disabledFg;
        return brightness == Brightness.light ? p.surfaceRaised : p.onPrimary;
      }),
      trackColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) return p.primary;
        return p.surfaceSoft;
      }),
      trackOutlineColor: WidgetStateProperty.all(p.outline),
    ),
    checkboxTheme: CheckboxThemeData(
      fillColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) return p.primary;
        return Colors.transparent;
      }),
      checkColor: WidgetStateProperty.all(p.onPrimary),
      side: BorderSide(color: p.outline, width: 1.5),
    ),
    radioTheme: RadioThemeData(
      fillColor: WidgetStateProperty.resolveWith((states) {
        if (states.contains(WidgetState.selected)) return p.primary;
        return p.outline;
      }),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: p.surfaceRaised,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(BinaRadii.hero),
        side: highContrast ? BorderSide(color: p.outline, width: 2.0) : BorderSide.none,
      ),
      titleTextStyle: textTheme.titleLarge,
      contentTextStyle: textTheme.bodyMedium,
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: scheme.inverseSurface,
      contentTextStyle: textTheme.bodyMedium?.copyWith(color: scheme.onInverseSurface),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(BinaRadii.large)),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.transparent,
      indicatorColor: p.primaryContainer,
      elevation: 0,
      height: BinaSpacing.navBarMin,
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return textTheme.labelSmall?.copyWith(
          color: selected ? p.onPrimaryContainer : p.onSurfaceVariant,
          fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
        );
      }),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return IconThemeData(
          size: BinaSpacing.iconStandard,
          color: selected ? p.onPrimaryContainer : p.onSurfaceVariant,
        );
      }),
    ),
    navigationRailTheme: NavigationRailThemeData(
      backgroundColor: p.surface,
      indicatorColor: p.primaryContainer,
      selectedIconTheme: IconThemeData(color: p.onPrimaryContainer),
      unselectedIconTheme: IconThemeData(color: p.onSurfaceVariant),
      selectedLabelTextStyle: textTheme.labelSmall?.copyWith(
        color: p.onPrimaryContainer,
        fontWeight: FontWeight.w600,
      ),
      unselectedLabelTextStyle: textTheme.labelSmall?.copyWith(color: p.onSurfaceVariant),
    ),
  );
}

class _InstantPageTransitionsBuilder extends PageTransitionsBuilder {
  const _InstantPageTransitionsBuilder();

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) =>
      child;
}
