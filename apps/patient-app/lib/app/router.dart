import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/config/app_config.dart';
import '../features/preview_harness/preview_harness_screen.dart';
import '../shared/scaffold_placeholder.dart';
import 'providers.dart';

/// Canonical shell destinations matching `BINA_AI_PATIENT_APP_UI_UX_SPEC_V2_1.md` §3.1.
enum BinaDestinationId {
  today('/today', 'امروز', Icons.home_outlined, Icons.home),
  care('/care', 'مراقبت', Icons.favorite_border_rounded, Icons.favorite_rounded),
  tests('/tests', 'آزمون‌ها', Icons.assignment_turned_in_outlined, Icons.assignment_turned_in),
  results('/results', 'نتایج', Icons.insert_chart_outlined, Icons.insert_chart),
  account('/account', 'حساب من', Icons.person_outline, Icons.person);

  const BinaDestinationId(this.path, this.labelFa, this.icon, this.selectedIcon);
  final String path;
  final String labelFa;
  final IconData icon;
  final IconData selectedIcon;

  static List<BinaDestinationId> enabledFor(AppConfig config) {
    return <BinaDestinationId>[
      today,
      care,
      if (config.enableWave4Tests) tests,
      if (config.enableWave3Results) results,
      account,
    ];
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final config = ref.watch(appConfigProvider);

  return GoRouter(
    initialLocation: BinaDestinationId.today.path,
    errorBuilder: (context, state) => Wave0MissingRouteScreen(location: state.uri.toString()),
    routes: <RouteBase>[
      GoRoute(
        path: '/auth/welcome',
        builder: (context, state) => const Wave0PlaceholderPage(
          routeId: 'AUTH-02',
          titleFa: 'خوش‌آمدگویی و ورود',
          subtitleFa: 'ورود بیمار و همراه با شماره موبایل +98 و رضایت‌نامه فارسی',
        ),
      ),
      GoRoute(
        path: '/help/urgent',
        builder: (context, state) => const Wave0SosPlaceholderScreen(),
      ),
      if (config.enablePreviewHarness)
        GoRoute(
          path: '/__preview',
          builder: (context, state) => const PreviewHarnessScreen(),
        ),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return Wave0ShellScaffold(navigationShell: navigationShell);
        },
        branches: <StatefulShellBranch>[
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: BinaDestinationId.today.path,
                builder: (context, state) => const Wave0PlaceholderPage(
                  routeId: 'CARE-01 (V01)',
                  titleFa: 'امروز',
                  subtitleFa: 'اسکفولد Wave 0 آماده است — پیاده‌سازی کامل در Wave 1b (T-B07)',
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: BinaDestinationId.care.path,
                builder: (context, state) => const Wave0PlaceholderPage(
                  routeId: 'CARE-02 (V02)',
                  titleFa: 'مراقبت',
                  subtitleFa: 'فهرست داروها، برنامه درمان و آموزش فارسی (T-B07/T-B08)',
                ),
              ),
            ],
          ),
          if (config.enableWave4Tests)
            StatefulShellBranch(
              routes: [
                GoRoute(
                  path: BinaDestinationId.tests.path,
                  builder: (context, state) => const Wave0PlaceholderPage(
                    routeId: 'TEST-01 (V03)',
                    titleFa: 'آزمون‌ها',
                    subtitleFa: 'آزمون‌های بینایی خانگی کالیبره‌شده (Wave 4 / T-B22)',
                  ),
                ),
              ],
            ),
          if (config.enableWave3Results)
            StatefulShellBranch(
              routes: [
                GoRoute(
                  path: BinaDestinationId.results.path,
                  builder: (context, state) => const Wave0PlaceholderPage(
                    routeId: 'RES-01 (V04)',
                    titleFa: 'نتایج',
                    subtitleFa: 'خلاصه تشخیصی تأییدشده پزشک (Wave 3 / T-B19)',
                  ),
                ),
              ],
            ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: BinaDestinationId.account.path,
                builder: (context, state) => const Wave0PlaceholderPage(
                  routeId: 'ACC-01 (V09)',
                  titleFa: 'حساب من',
                  subtitleFa: 'پروفایل، همراه، ظاهر روشن/تیره، همگام‌سازی و راهنما (T-B06)',
                ),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
