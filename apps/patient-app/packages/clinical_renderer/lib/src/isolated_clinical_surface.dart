import 'package:flutter/widgets.dart';

/// Hard boundary isolating clinical test stimuli from OS TextScaler, RTL
/// mirroring, app gradients, and Light/Dark themes (`ADR-018` & `v2.1 §10.1`).
class IsolatedClinicalSurface extends StatelessWidget {
  const IsolatedClinicalSurface({
    super.key,
    required this.backgroundColor,
    required this.child,
  });

  final Color backgroundColor;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return MediaQuery.withClampedTextScaling(
      minScaleFactor: 1.0,
      maxScaleFactor: 1.0,
      child: Directionality(
        textDirection: TextDirection.ltr,
        child: ColoredBox(
          color: backgroundColor,
          child: child,
        ),
      ),
    );
  }
}
