import 'package:bina_design_system/bina_design_system.dart';
import 'package:bina_patient_app/features/preview_harness/preview_harness_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const configs = <({Brightness brightness, bool highContrast, Size size, double scale, String name})>[
    (brightness: Brightness.light, highContrast: false, size: Size(412, 824), scale: 1.0, name: 'Light 412x824 1.0x'),
    (brightness: Brightness.dark, highContrast: false, size: Size(360, 800), scale: 2.0, name: 'Dark 360x800 2.0x'),
    (brightness: Brightness.light, highContrast: true, size: Size(360, 800), scale: 1.5, name: 'HC Light 360x800 1.5x'),
  ];

  testWidgets('All 9 reference previews V01..V09 render without overflow across Light, Dark, HC & 200% scale', (
    tester,
  ) async {
    for (final cfg in configs) {
      tester.view.physicalSize = cfg.size;
      tester.view.devicePixelRatio = 1.0;

      for (final screenId in ReferenceScreenId.values) {
        await tester.pumpWidget(
          ProviderScope(
            child: MediaQuery(
              data: MediaQueryData(
                size: cfg.size,
                textScaler: TextScaler.linear(cfg.scale),
              ),
              child: MaterialApp(
                theme: buildBinaTheme(cfg.brightness, highContrast: cfg.highContrast),
                home: Directionality(
                  textDirection: TextDirection.rtl,
                  child: buildReferencePreviewScreen(screenId),
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(
          tester.takeException(),
          isNull,
          reason: '${screenId.code} failed under ${cfg.name}',
        );
      }
    }
    tester.view.resetPhysicalSize();
  });

  testWidgets('PreviewHarnessScreen switches screens cleanly inside 412x824 frame', (tester) async {
    tester.view.physicalSize = const Size(900, 1100);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          theme: buildBinaTheme(Brightness.light),
          home: const Directionality(
            textDirection: TextDirection.rtl,
            child: PreviewHarnessScreen(),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('01-Today.png'), findsOneWidget);
    await tester.tap(find.byType(DropdownButton<ReferenceScreenId>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('V09 — حساب من').last);
    await tester.pumpAndSettle();
    expect(find.textContaining('09-My-Account.png'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
