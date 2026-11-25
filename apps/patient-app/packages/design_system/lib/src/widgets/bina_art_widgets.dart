import 'package:flutter/material.dart';
import '../assets/bina_art_registry.dart';
import '../brand/bina_brand.dart';
import '../tokens/bina_spacing.dart';

/// Decorative artwork profile for [BinaCanvas] (`v2.1 §4.4.4`).
enum BinaCanvasArtVariant {
  none,
  headerOnly,
  headerAndFooter,
  today,
  care,
  tests,
  account,
}

/// Compact A04 upper-left wave behind page headers (`v2.1 §4.4.3`).
class BinaHeaderWave extends StatelessWidget {
  const BinaHeaderWave({super.key, this.maxHeight = 136});

  final double maxHeight;

  @override
  Widget build(BuildContext context) {
    final sem = context.bina;
    final art = BinaArtResolver.resolve(BinaArtId.waveHeader, sem.palette.brightness);
    return IgnorePointer(
      child: ExcludeSemantics(
        child: SizedBox(
          height: maxHeight,
          width: double.infinity,
          child: ShaderMask(
            blendMode: BlendMode.dstIn,
            shaderCallback: (bounds) => const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              stops: <double>[0.0, 0.58, 1.0],
              colors: <Color>[Colors.white, Color(0xCCFFFFFF), Colors.transparent],
            ).createShader(bounds),
            child: Opacity(
              opacity: art.defaultOpacity,
              child: Image.asset(
                art.assetPath,
                fit: BoxFit.fitWidth,
                alignment: Alignment.topLeft,
                excludeFromSemantics: true,
                filterQuality: FilterQuality.medium,
                errorBuilder: (_, _, _) => const SizedBox.shrink(),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Broad A03 bottom wave accent (`v2.1 §4.4.3`). Never placed behind primary CTA copy.
class BinaFooterWave extends StatelessWidget {
  const BinaFooterWave({super.key, this.maxHeight = 132});

  final double maxHeight;

  @override
  Widget build(BuildContext context) {
    final sem = context.bina;
    final art = BinaArtResolver.resolve(BinaArtId.waveFooter, sem.palette.brightness);
    return IgnorePointer(
      child: ExcludeSemantics(
        child: SizedBox(
          height: maxHeight,
          width: double.infinity,
          child: ShaderMask(
            blendMode: BlendMode.dstIn,
            shaderCallback: (bounds) => const LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              stops: <double>[0.0, 0.38, 1.0],
              colors: <Color>[Colors.transparent, Color(0xCCFFFFFF), Colors.white],
            ).createShader(bounds),
            child: Opacity(
              opacity: art.defaultOpacity,
              child: Image.asset(
                art.assetPath,
                fit: BoxFit.fitWidth,
                alignment: Alignment.bottomCenter,
                excludeFromSemantics: true,
                filterQuality: FilterQuality.medium,
                errorBuilder: (_, _, _) => const SizedBox.shrink(),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Emerald iris A01 hero illustration with directional physical alignment (`v2.1 §4.4.3`).
class BinaIrisArtwork extends StatelessWidget {
  const BinaIrisArtwork({
    super.key,
    this.width = 176,
    this.height = 170,
    this.fadeTowardPhysicalRight = true,
  });

  final double width;
  final double height;
  final bool fadeTowardPhysicalRight;

  @override
  Widget build(BuildContext context) {
    final brightness = context.binaPalette.brightness;
    final art = BinaArtResolver.resolve(BinaArtId.iris, brightness);
    return IgnorePointer(
      child: ExcludeSemantics(
        child: SizedBox(
          width: width,
          height: height,
          child: ShaderMask(
            blendMode: BlendMode.dstIn,
            shaderCallback: (bounds) => LinearGradient(
              begin: fadeTowardPhysicalRight ? Alignment.centerLeft : Alignment.centerRight,
              end: fadeTowardPhysicalRight ? Alignment.centerRight : Alignment.centerLeft,
              stops: const <double>[0.0, 0.70, 1.0],
              colors: const <Color>[Colors.white, Color(0xE6FFFFFF), Colors.transparent],
            ).createShader(bounds),
            child: Image.asset(
              art.assetPath,
              fit: BoxFit.cover,
              alignment: Alignment.center,
              excludeFromSemantics: true,
              filterQuality: FilterQuality.medium,
              errorBuilder: (_, _, _) => ColoredBox(
                color: context.binaPalette.surfaceMint,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// A02 glossy eye full logo or mark-only widget (`v2.1 §4.4.3`). Never mirrored in RTL.
class BinaBrandMark extends StatelessWidget {
  const BinaBrandMark({
    super.key,
    this.full = true,
    this.height,
    this.announceSemanticBrand = false,
  });

  final bool full;
  final double? height;
  final bool announceSemanticBrand;

  @override
  Widget build(BuildContext context) {
    final brightness = context.binaPalette.brightness;
    final art = BinaArtResolver.resolve(
      full ? BinaArtId.logoFull : BinaArtId.logoMark,
      brightness,
    );
    final effectiveHeight = height ?? (full ? 34.0 : 40.0);

    final img = Directionality(
      textDirection: TextDirection.ltr,
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: Image.asset(
          art.assetPath,
          height: effectiveHeight,
          fit: BoxFit.contain,
          excludeFromSemantics: !announceSemanticBrand,
          filterQuality: FilterQuality.medium,
          errorBuilder: (_, _, _) => Text(
            full ? BinaBrand.appNameEn : BinaBrand.appNameFa,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: context.binaPalette.primary,
                  fontWeight: FontWeight.w700,
                ),
          ),
        ),
      ),
    );

    if (!announceSemanticBrand) {
      return ExcludeSemantics(child: img);
    }
    return Semantics(label: BinaBrand.appNameFa, image: true, child: img);
  }
}

/// Primary G01 luminous canvas with clipped A04/A03 wave ribbons (`v2.1 §4.4.3`).
class BinaCanvas extends StatelessWidget {
  const BinaCanvas({
    super.key,
    required this.child,
    this.artVariant = BinaCanvasArtVariant.none,
  });

  final Widget child;
  final BinaCanvasArtVariant artVariant;

  @override
  Widget build(BuildContext context) {
    final sem = context.bina;
    final mq = MediaQuery.maybeOf(context);
    final textScale = mq?.textScaler.scale(16) ?? 16;
    final narrow = (mq?.size.width ?? 412) < 340;
    final suppressArt =
        sem.highContrast || artVariant == BinaCanvasArtVariant.none || (narrow && textScale >= 24);

    final showHeader = !suppressArt &&
        artVariant != BinaCanvasArtVariant.none;
    final showFooter = !suppressArt &&
        (artVariant == BinaCanvasArtVariant.headerAndFooter ||
            artVariant == BinaCanvasArtVariant.tests);

    return DecoratedBox(
      decoration: BoxDecoration(gradient: sem.canvasGradient),
      child: Stack(
        fit: StackFit.expand,
        children: <Widget>[
          if (showHeader)
            const Positioned(
              top: 0,
              left: 0,
              right: 0,
              child: BinaHeaderWave(),
            ),
          if (showFooter)
            const Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: BinaFooterWave(),
            ),
          child,
        ],
      ),
    );
  }
}
