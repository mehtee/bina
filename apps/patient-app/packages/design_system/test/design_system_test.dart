import 'dart:math' as math;

import 'package:bina_design_system/bina_design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

double _channelLuminance(double c) {
  return c <= 0.03928 ? c / 12.92 : math.pow((c + 0.055) / 1.055, 2.4).toDouble();
}

double _relativeLuminance(Color c) {
  final r = _channelLuminance(c.r);
  final g = _channelLuminance(c.g);
  final b = _channelLuminance(c.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

double _contrastRatio(Color fg, Color bg) {
  final l1 = _relativeLuminance(fg);
  final l2 = _relativeLuminance(bg);
  final lighter = math.max(l1, l2);
  final darker = math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

void main() {
  test('Appendix A: All 43 token pairs pass WCAG contrast minimums in BOTH Light and Dark', () {
    for (final p in <BinaPalette>[BinaPalette.light, BinaPalette.dark]) {
      final modeName = p.brightness.name;
      void checkPair(String label, Color fg, Color bg, double minimum) {
        final ratio = _contrastRatio(fg, bg);
        expect(
          ratio,
          greaterThanOrEqualTo(minimum),
          reason: '$modeName pair $label had contrast ${ratio.toStringAsFixed(2)}:1 (< $minimum:1)',
        );
      }

      checkPair('onSurface / canvas', p.onSurface, p.canvas, 4.5);
      checkPair('onSurface / canvasTop', p.onSurface, p.canvasTop, 4.5);
      checkPair('onSurface / canvasBottom', p.onSurface, p.canvasBottom, 4.5);
      checkPair('onSurface / surface', p.onSurface, p.surface, 4.5);
      checkPair('onSurface / surfaceRaised', p.onSurface, p.surfaceRaised, 4.5);
      checkPair('onSurface / surfaceSoft', p.onSurface, p.surfaceSoft, 4.5);
      checkPair('onSurface / surfaceMint', p.onSurface, p.surfaceMint, 4.5);
      checkPair('onSurface / surfaceAqua', p.onSurface, p.surfaceAqua, 4.5);
      checkPair('onSurface / surfaceCream', p.onSurface, p.surfaceCream, 4.5);
      checkPair('onSurfaceVariant / canvas', p.onSurfaceVariant, p.canvas, 4.5);
      checkPair('onSurfaceVariant / surface', p.onSurfaceVariant, p.surface, 4.5);
      checkPair('onSurfaceVariant / surfaceSoft', p.onSurfaceVariant, p.surfaceSoft, 4.5);
      checkPair('onSurfaceVariant / surfaceMint', p.onSurfaceVariant, p.surfaceMint, 4.5);
      checkPair('onSurfaceVariant / surfaceAqua', p.onSurfaceVariant, p.surfaceAqua, 4.5);
      checkPair('onSurfaceVariant / surfaceCream', p.onSurfaceVariant, p.surfaceCream, 4.5);
      checkPair('muted / surface', p.muted, p.surface, 4.5);
      checkPair('primary / surface', p.primary, p.surface, 4.5);
      checkPair('onPrimary / primary', p.onPrimary, p.primary, 4.5);
      checkPair('onPrimaryContainer / primaryContainer', p.onPrimaryContainer, p.primaryContainer, 4.5);
      checkPair('onPrimaryGradient / primaryGradStart', p.onPrimaryGradient, p.primaryGradStart, 4.5);
      checkPair('onPrimaryGradient / primaryGradEnd', p.onPrimaryGradient, p.primaryGradEnd, 4.5);
      checkPair('onSecondary / secondary', p.onSecondary, p.secondary, 4.5);
      checkPair('onTertiary / tertiary', p.onTertiary, p.tertiary, 4.5);
      checkPair('onTertiaryContainer / tertiaryContainer', p.onTertiaryContainer, p.tertiaryContainer, 4.5);
      checkPair('success / successBg', p.success, p.successBg, 4.5);
      checkPair('success / surface', p.success, p.surface, 4.5);
      checkPair('warning / warningBg', p.warning, p.warningBg, 4.5);
      checkPair('error / errorBg', p.error, p.errorBg, 4.5);
      checkPair('onUrgentAction / urgentAction', p.onUrgentAction, p.urgentAction, 4.5);
      checkPair('info / infoBg', p.info, p.infoBg, 4.5);
      checkPair('neutral / neutralBg', p.neutral, p.neutralBg, 4.5);
      checkPair('disabledFg / disabledBg', p.disabledFg, p.disabledBg, 4.5);
      checkPair('medicationInk / medicationWell', p.medicationInk, p.medicationWell, 3.0);
      checkPair('planInk / planWell', p.planInk, p.planWell, 3.0);
      checkPair('testInk / testWell', p.testInk, p.testWell, 3.0);
      checkPair('profileInk / profileWell', p.profileInk, p.profileWell, 3.0);
      checkPair('chart1 / surface', p.chart1, p.surface, 3.0);
      checkPair('chart1 / chartBand', p.chart1, p.chartBand, 3.0);
      checkPair('chart2 / surface', p.chart2, p.surface, 3.0);
      checkPair('chartAxis / surface', p.chartAxis, p.surface, 4.5);
      checkPair('chartBandEdge / chartBand', p.chartBandEdge, p.chartBand, 3.0);
      checkPair('focus / surface', p.focus, p.surface, 3.0);
      checkPair('outline / surface', p.outline, p.surface, 3.0);
    }
  });

  testWidgets('Touch targets >= 48dp, HighContrast suppresses glass shadows, and 200% TextScaler never overflows', (
    tester,
  ) async {
    await tester.pumpWidget(
      MediaQuery(
        data: const MediaQueryData(
          size: Size(360, 800),
          textScaler: TextScaler.linear(2.0),
          disableAnimations: true,
        ),
        child: MaterialApp(
          locale: const Locale('fa', 'IR'),
          theme: buildBinaTheme(Brightness.light, highContrast: true),
          home: Directionality(
            textDirection: TextDirection.rtl,
            child: Builder(
              builder: (ctx) {
                expect(BinaMotion.resolve(ctx, BinaMotion.route), Duration.zero);
                expect(ctx.bina.highContrast, isTrue);
                expect(ctx.bina.shadowCard, isEmpty);
                return BinaShellLayout(
                  artVariant: BinaCanvasArtVariant.today,
                  appBar: BinaAppBar(
                    title: 'امروز',
                    isRootTab: true,
                    onUrgentHelp: () {},
                  ),
                  navItems: const <BinaNavItem>[
                    BinaNavItem(labelFa: 'امروز', icon: Icons.home_outlined, selectedIcon: Icons.home),
                    BinaNavItem(labelFa: 'مراقبت', icon: Icons.favorite_border_rounded, selectedIcon: Icons.favorite_rounded),
                    BinaNavItem(labelFa: 'حساب من', icon: Icons.person_outline, selectedIcon: Icons.person),
                  ],
                  selectedIndex: 0,
                  onSelectTab: (_) {},
                  body: SingleChildScrollView(
                    padding: const EdgeInsetsDirectional.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: <Widget>[
                        const BinaHero(
                          title: 'وضعیت امروز',
                          status: 'پایدار',
                          statusIcon: Icons.check,
                          subtitle: 'برنامه مراقبت شما آماده است',
                        ),
                        const SizedBox(height: 12),
                        BinaSegments<String>(
                          choices: const {'OD': 'چشم راست (OD)', 'OS': 'چشم چپ (OS)'},
                          selected: 'OD',
                          onChanged: (_) {},
                        ),
                        const SizedBox(height: 12),
                        BinaGradientButton(
                          label: 'ثبت مصرف',
                          icon: Icons.check,
                          onPressed: () {},
                        ),
                        const SizedBox(height: 12),
                        BinaUrgentButton(
                          label: 'تماس فوری با اورژانس کلینیک',
                          onPressed: () {},
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final primarySize = tester.getSize(find.byType(BinaGradientButton));
    expect(primarySize.height, greaterThanOrEqualTo(56));
    final urgentSize = tester.getSize(find.byType(BinaUrgentButton));
    expect(urgentSize.height, greaterThanOrEqualTo(64));
    expect(find.byIcon(Icons.arrow_back_rounded), findsNothing); // Root tab omits back arrow
    expect(tester.takeException(), isNull);
  });

  testWidgets('Expanded >=600dp switches BinaShellLayout from dock to NavigationRail cleanly in Dark', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(840, 800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      MaterialApp(
        theme: buildBinaTheme(Brightness.dark),
        home: Directionality(
          textDirection: TextDirection.rtl,
          child: BinaShellLayout(
            navItems: const <BinaNavItem>[
              BinaNavItem(labelFa: 'امروز', icon: Icons.home_outlined, selectedIcon: Icons.home),
              BinaNavItem(labelFa: 'مراقبت', icon: Icons.favorite_border_rounded, selectedIcon: Icons.favorite_rounded),
              BinaNavItem(labelFa: 'حساب من', icon: Icons.person_outline, selectedIcon: Icons.person),
            ],
            selectedIndex: 1,
            onSelectTab: (_) {},
            body: const Center(child: Text('محتوای تبلت')),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(NavigationRail), findsOneWidget);
    expect(find.byType(BinaFloatingDock), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
