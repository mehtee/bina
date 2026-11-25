import 'package:bina_design_system/bina_design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'providers.dart';
import 'router.dart';

class BinaPatientApp extends ConsumerWidget {
  const BinaPatientApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final themeMode = ref.watch(themeModeProvider);
    final highContrast = ref.watch(highContrastProvider);

    return MaterialApp.router(
      debugShowCheckedModeBanner: false,
      title: BinaBrand.appNameFa,
      locale: const Locale('fa', 'IR'),
      supportedLocales: const <Locale>[
        Locale('fa', 'IR'),
      ],
      localizationsDelegates: const <LocalizationsDelegate<dynamic>>[
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      themeMode: themeMode,
      themeAnimationDuration: BinaMotion.expand,
      theme: buildBinaTheme(Brightness.light, highContrast: highContrast),
      darkTheme: buildBinaTheme(Brightness.dark, highContrast: highContrast),
      routerConfig: router,
    );
  }
}
