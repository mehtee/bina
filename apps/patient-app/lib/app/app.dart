import 'dart:ui';

import 'package:bina_design_system/bina_design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'providers.dart';
import 'router.dart';

class _BinaScrollBehavior extends MaterialScrollBehavior {
  const _BinaScrollBehavior();

  @override
  Set<PointerDeviceKind> get dragDevices => const <PointerDeviceKind>{
        PointerDeviceKind.touch,
        PointerDeviceKind.mouse,
        PointerDeviceKind.trackpad,
        PointerDeviceKind.stylus,
      };
}

class BinaPatientApp extends ConsumerWidget {
  const BinaPatientApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final themeMode = ref.watch(themeModeProvider);
    final highContrast = ref.watch(highContrastProvider);
    final reduceMotion = ref.watch(reduceMotionProvider);

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
      scrollBehavior: const _BinaScrollBehavior(),
      themeMode: themeMode,
      themeAnimationDuration: reduceMotion ? Duration.zero : BinaMotion.expand,
      theme: buildBinaTheme(
        Brightness.light,
        highContrast: highContrast,
        reduceMotion: reduceMotion,
      ),
      darkTheme: buildBinaTheme(
        Brightness.dark,
        highContrast: highContrast,
        reduceMotion: reduceMotion,
      ),
      routerConfig: router,
    );
  }
}
