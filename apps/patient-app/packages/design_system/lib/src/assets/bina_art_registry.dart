import 'package:flutter/foundation.dart';

/// Semantic art placements derived strictly from canonical assets `A01–A04`
/// (`BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md` §4.4.1–§4.4.4).
enum BinaArtId {
  iris,
  logoFull,
  logoMark,
  waveFooter,
  waveHeader,
}

@immutable
class BinaArtDescriptor {
  const BinaArtDescriptor({
    required this.id,
    required this.brightness,
    required this.assetPath,
    required this.defaultOpacity,
  });

  final BinaArtId id;
  final Brightness brightness;
  final String assetPath;
  final double defaultOpacity;
}

/// Resolves brightness-appropriate runtime assets without exposing raw paths to
/// feature widgets. Source PNGs in `assets/design/source/` are never bundled.
abstract final class BinaArtResolver {
  static const String runtimeRoot = 'assets/design/runtime';

  static const List<String> allRuntimeAssetPaths = <String>[
    '$runtimeRoot/iris_light.webp',
    '$runtimeRoot/iris_dark.webp',
    '$runtimeRoot/logo_full_light.png',
    '$runtimeRoot/logo_full_dark.png',
    '$runtimeRoot/logo_mark_light.png',
    '$runtimeRoot/logo_mark_dark.png',
    '$runtimeRoot/wave_footer_light.webp',
    '$runtimeRoot/wave_footer_dark.webp',
    '$runtimeRoot/wave_header_light.webp',
    '$runtimeRoot/wave_header_dark.webp',
  ];

  static BinaArtDescriptor resolve(BinaArtId id, Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    return switch (id) {
      BinaArtId.iris => BinaArtDescriptor(
        id: id,
        brightness: brightness,
        assetPath: isDark ? '$runtimeRoot/iris_dark.webp' : '$runtimeRoot/iris_light.webp',
        defaultOpacity: 1.0,
      ),
      BinaArtId.logoFull => BinaArtDescriptor(
        id: id,
        brightness: brightness,
        assetPath: isDark ? '$runtimeRoot/logo_full_dark.png' : '$runtimeRoot/logo_full_light.png',
        defaultOpacity: 1.0,
      ),
      BinaArtId.logoMark => BinaArtDescriptor(
        id: id,
        brightness: brightness,
        assetPath: isDark ? '$runtimeRoot/logo_mark_dark.png' : '$runtimeRoot/logo_mark_light.png',
        defaultOpacity: 1.0,
      ),
      BinaArtId.waveFooter => BinaArtDescriptor(
        id: id,
        brightness: brightness,
        assetPath: isDark
            ? '$runtimeRoot/wave_footer_dark.webp'
            : '$runtimeRoot/wave_footer_light.webp',
        defaultOpacity: isDark ? 0.48 : 0.80,
      ),
      BinaArtId.waveHeader => BinaArtDescriptor(
        id: id,
        brightness: brightness,
        assetPath: isDark
            ? '$runtimeRoot/wave_header_dark.webp'
            : '$runtimeRoot/wave_header_light.webp',
        defaultOpacity: isDark ? 0.45 : 0.72,
      ),
    };
  }
}
