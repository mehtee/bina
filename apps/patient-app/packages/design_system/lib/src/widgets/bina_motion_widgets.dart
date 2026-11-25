import 'package:flutter/material.dart';
import '../tokens/bina_spacing.dart';

/// Pure Flutter RTL-aware route transition builder (`v2.1 §8`), zero `go_router` dependency.
Widget buildBinaRouteTransition(
  BuildContext context,
  Animation<double> animation,
  Widget child, {
  bool verticalModal = false,
}) {
  if (BinaMotion.isReduced(context)) return child;
  final curved = CurvedAnimation(
    parent: animation,
    curve: BinaMotion.curveStandard,
    reverseCurve: Curves.easeInCubic,
  );
  final isRtl = Directionality.of(context) == TextDirection.rtl;
  final beginOffset = verticalModal
      ? const Offset(0.0, 0.06)
      : Offset(isRtl ? -0.08 : 0.08, 0.0);
  return FadeTransition(
    opacity: curved,
    child: SlideTransition(
      position: Tween<Offset>(begin: beginOffset, end: Offset.zero).animate(curved),
      child: child,
    ),
  );
}

/// Subtle once-per-mount entrance fade + slide (`v2.1 §8`), zeroed under reduced motion.
/// Uses Flutter animation cleanly so `pumpAndSettle()` settles immediately.
class BinaFadeSlideIn extends StatefulWidget {
  const BinaFadeSlideIn({
    super.key,
    required this.child,
    this.delayMs = 0,
    this.verticalOffset = 14.0,
    this.duration = BinaMotion.entrance,
  });

  final Widget child;
  final int delayMs;
  final double verticalOffset;
  final Duration duration;

  @override
  State<BinaFadeSlideIn> createState() => _BinaFadeSlideInState();
}

class _BinaFadeSlideInState extends State<BinaFadeSlideIn> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _opacity;
  late final Animation<double> _offsetY;
  bool _started = false;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: widget.duration);
    final curved = CurvedAnimation(parent: _ctrl, curve: BinaMotion.curveStandard);
    _opacity = curved;
    _offsetY = Tween<double>(begin: widget.verticalOffset, end: 0.0).animate(curved);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    if (BinaMotion.isReduced(context)) {
      _ctrl.value = 1.0;
      return;
    }
    if (widget.delayMs > 0) {
      Future<void>.delayed(Duration(milliseconds: widget.delayMs), () {
        if (mounted) _ctrl.forward();
      });
    } else {
      _ctrl.forward();
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (BinaMotion.isReduced(context)) {
      return widget.child;
    }
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (context, child) {
        return Opacity(
          opacity: _opacity.value,
          child: Transform.translate(
            offset: Offset(0, _offsetY.value),
            child: child,
          ),
        );
      },
      child: widget.child,
    );
  }
}

/// Calm scale + fade reveal for Bootstrap and Onboarding visuals.
class BinaAnimatedScaleReveal extends StatefulWidget {
  const BinaAnimatedScaleReveal({
    super.key,
    required this.child,
    this.duration = BinaMotion.launch,
  });

  final Widget child;
  final Duration duration;

  @override
  State<BinaAnimatedScaleReveal> createState() => _BinaAnimatedScaleRevealState();
}

class _BinaAnimatedScaleRevealState extends State<BinaAnimatedScaleReveal>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  bool _started = false;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(vsync: this, duration: widget.duration);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    if (BinaMotion.isReduced(context)) {
      _ctrl.value = 1.0;
    } else {
      _ctrl.forward();
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (BinaMotion.isReduced(context)) return widget.child;
    final curved = CurvedAnimation(parent: _ctrl, curve: BinaMotion.curveStandard);
    return FadeTransition(
      opacity: curved,
      child: ScaleTransition(
        scale: Tween<double>(begin: 0.90, end: 1.0).animate(curved),
        child: widget.child,
      ),
    );
  }
}
