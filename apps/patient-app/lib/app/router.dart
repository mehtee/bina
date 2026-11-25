import 'package:bina_api_dtos/bina_api_dtos.dart';
import 'package:bina_design_system/bina_design_system.dart';
import 'package:bina_offline_store/bina_offline_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../core/config/app_config.dart';
import '../core/data/patient_gateway.dart';
import '../features/account/account_screens.dart';
import '../features/auth_onboarding/auth_screens.dart';
import '../features/care_plan/care_screens.dart';
import '../features/care_plan/today_screen.dart';
import '../features/caregiver/caregiver_screens.dart';
import '../features/diagnostic_results/diagnostic_results_screens.dart';
import '../features/education/education_screens.dart';
import '../features/preview_harness/preview_harness_screen.dart';
import '../features/symptoms_sos/sos_screens.dart';
import '../features/vision_testing/vision_testing_screens.dart';
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

  BinaNavItem toNavItem() => BinaNavItem(
        labelFa: labelFa,
        icon: icon,
        selectedIcon: selectedIcon,
      );

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
  final authRefresh = ValueNotifier<int>(0);
  ref.listen<AuthSessionContext?>(sessionProvider, (_, _) {
    authRefresh.value += 1;
  });
  ref.onDispose(authRefresh.dispose);

  return GoRouter(
    initialLocation: '/bootstrap',
    refreshListenable: authRefresh,
    redirect: (context, state) {
      final session = ref.read(sessionProvider);
      final loc = state.uri.path;
      final isPublic = loc == '/bootstrap' ||
          loc.startsWith('/auth/') ||
          loc.startsWith('/help/urgent') ||
          loc == '/caregiver/revoked' ||
          (config.enablePreviewHarness && loc == '/__preview');
      if (session == null && !isPublic) {
        return '/auth/welcome';
      }
      return null;
    },
    errorBuilder: (context, state) => Wave0MissingRouteScreen(location: state.uri.toString()),
    routes: <RouteBase>[
      GoRoute(path: '/bootstrap', builder: (_, _) => const BootstrapScreen()),
      GoRoute(path: '/auth/welcome', builder: (_, _) => const WelcomeScreen()),
      GoRoute(path: '/auth/invitation', builder: (_, _) => const InvitationScreen()),
      GoRoute(path: '/auth/phone', builder: (_, _) => const PhoneEntryScreen()),
      GoRoute(path: '/auth/otp', builder: (_, _) => const OtpVerifyScreen()),
      GoRoute(path: '/auth/consent', builder: (_, _) => const ConsentScreen()),
      GoRoute(path: '/auth/accessibility', builder: (_, _) => const AccessibilitySetupScreen()),
      GoRoute(path: '/auth/help', builder: (_, _) => const AuthHelpScreen()),
      GoRoute(path: '/auth/session-expired', builder: (_, _) => const SessionExpiredScreen()),
      GoRoute(path: '/help/urgent', builder: (_, _) => const UrgentHelpScreen()),
      GoRoute(path: '/help/symptoms', builder: (_, _) => const SymptomIntroScreen()),
      GoRoute(path: '/help/symptoms/eye', builder: (_, _) => const SymptomEyeScreen()),
      GoRoute(path: '/help/symptoms/questions', builder: (_, _) => const SymptomQuestionsScreen()),
      GoRoute(path: '/help/symptoms/review', builder: (_, _) => const SymptomReviewScreen()),
      GoRoute(
        path: '/help/symptoms/receipt',
        builder: (_, state) => SymptomReceiptScreen(
          payload: state.extra is SymptomReceiptPayload ? state.extra! as SymptomReceiptPayload : null,
        ),
      ),
      GoRoute(path: '/care/education', builder: (_, _) => const EducationListScreen()),
      GoRoute(
        path: '/care/education/:topicId',
        builder: (_, state) => EducationDetailScreen(topicId: state.pathParameters['topicId']!),
      ),
      GoRoute(path: '/account/caregivers', builder: (_, _) => const CaregiversListScreen()),
      GoRoute(path: '/account/caregivers/invite', builder: (_, _) => const CaregiverInviteScreen()),
      GoRoute(
        path: '/account/caregivers/scope',
        builder: (_, state) => CaregiverScopeScreen(
          draft: state.extra is CaregiverInviteDraft ? state.extra! as CaregiverInviteDraft : null,
        ),
      ),
      GoRoute(
        path: '/account/caregivers/grant/:grantId',
        builder: (_, state) => CaregiverGrantDetailScreen(
          grantId: state.pathParameters['grantId']!,
          initialGrant: state.extra is CaregiverGrant ? state.extra! as CaregiverGrant : null,
        ),
      ),
      GoRoute(path: '/caregiver/accept', builder: (_, _) => const CaregiverAcceptScreen()),
      GoRoute(path: '/caregiver/patients', builder: (_, _) => const CaregiverPatientsScreen()),
      GoRoute(path: '/caregiver/revoked', builder: (_, _) => const CaregiverRevokedScreen()),
      GoRoute(
        path: '/results/:signedReportId',
        builder: (_, state) => SignedReportDetailScreen(
          signedReportId: state.pathParameters['signedReportId']!,
        ),
      ),
      GoRoute(
        path: '/results/:signedReportId/follow-up',
        builder: (_, state) => ReportFollowUpScreen(
          signedReportId: state.pathParameters['signedReportId']!,
        ),
      ),
      GoRoute(path: '/tests/history', builder: (_, _) => const TestHistoryScreen()),
      GoRoute(
        path: '/tests/:assignmentId/eligibility',
        builder: (_, state) => TestEligibilityScreen(assignmentId: state.pathParameters['assignmentId']!),
      ),
      GoRoute(
        path: '/tests/:assignmentId/eye',
        builder: (_, state) => TestEyeConfirmScreen(assignmentId: state.pathParameters['assignmentId']!),
      ),
      GoRoute(
        path: '/tests/:assignmentId/instructions',
        builder: (_, state) => TestInstructionsScreen(assignmentId: state.pathParameters['assignmentId']!),
      ),
      GoRoute(
        path: '/tests/:assignmentId/calibration',
        builder: (_, state) => TestCalibrationScreen(assignmentId: state.pathParameters['assignmentId']!),
      ),
      GoRoute(
        path: '/tests/:assignmentId/practice',
        builder: (_, state) => TestPracticeScreen(assignmentId: state.pathParameters['assignmentId']!),
      ),
      GoRoute(
        path: '/tests/:assignmentId/preflight',
        builder: (_, state) => TestPreflightScreen(assignmentId: state.pathParameters['assignmentId']!),
      ),
      GoRoute(
        path: '/tests/:assignmentId/run/landolt',
        builder: (_, state) => LandoltSessionScreen(assignmentId: state.pathParameters['assignmentId']!),
      ),
      GoRoute(
        path: '/tests/:assignmentId/run/amsler',
        builder: (_, state) => AmslerSessionScreen(assignmentId: state.pathParameters['assignmentId']!),
      ),
      GoRoute(
        path: '/tests/:assignmentId/receipt',
        builder: (_, state) => TestQualityReceiptScreen(assignmentId: state.pathParameters['assignmentId']!),
      ),
      GoRoute(path: '/account/profile', builder: (_, _) => const ProfileScreen()),
      GoRoute(path: '/account/settings', builder: (_, _) => const SettingsScreen()),
      GoRoute(path: '/account/appearance', builder: (_, _) => const AppearanceScreen()),
      GoRoute(path: '/account/accessibility', builder: (_, _) => const AccessibilitySettingsScreen()),
      GoRoute(path: '/account/notifications', builder: (_, _) => const NotificationsSettingsScreen()),
      GoRoute(path: '/account/consents', builder: (_, _) => const ConsentsScreen()),
      GoRoute(path: '/account/sync', builder: (_, _) => const SyncStatusScreen()),
      GoRoute(path: '/account/clinic', builder: (_, _) => const ClinicInfoScreen()),
      GoRoute(path: '/account/help', builder: (_, _) => const AppHelpScreen()),
      GoRoute(path: '/care/medications', builder: (_, _) => const MedicationsListScreen()),
      GoRoute(
        path: '/care/episode/:episodeId',
        builder: (_, state) => EpisodeDetailScreen(episodeId: state.pathParameters['episodeId']!),
      ),
      GoRoute(
        path: '/care/dose/:doseId',
        builder: (_, state) => MedicationDetailScreen(doseOrMedicationKey: state.pathParameters['doseId']!),
      ),
      GoRoute(
        path: '/care/medication/:medicationId',
        builder: (_, state) =>
            MedicationDetailScreen(doseOrMedicationKey: state.pathParameters['medicationId']!),
      ),
      GoRoute(
        path: '/care/dose/:doseId/record',
        builder: (_, state) => DoseRecordScreen(doseKey: state.pathParameters['doseId']!),
      ),
      GoRoute(
        path: '/care/receipt/:eventId',
        builder: (_, state) => DoseReceiptScreen(
          eventId: state.pathParameters['eventId']!,
          entry: state.extra is OutboxEntry ? state.extra! as OutboxEntry : null,
        ),
      ),
      GoRoute(path: '/care/history', builder: (_, _) => const AdherenceHistoryScreen()),
      GoRoute(path: '/care/instructions', builder: (_, _) => const CareInstructionsScreen()),
      if (config.enablePreviewHarness)
        GoRoute(path: '/__preview', builder: (_, _) => const PreviewHarnessScreen()),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return Wave0ShellScaffold(navigationShell: navigationShell);
        },
        branches: <StatefulShellBranch>[
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: BinaDestinationId.today.path,
                builder: (_, _) => const TodayScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: BinaDestinationId.care.path,
                builder: (_, _) => const CareHubScreen(),
              ),
            ],
          ),
          if (config.enableWave4Tests)
            StatefulShellBranch(
              routes: [
                GoRoute(
                  path: BinaDestinationId.tests.path,
                  builder: (_, _) => const TestsHubScreen(),
                ),
              ],
            ),
          if (config.enableWave3Results)
            StatefulShellBranch(
              routes: [
                GoRoute(
                  path: BinaDestinationId.results.path,
                  builder: (_, _) => const ResultsScreen(),
                ),
              ],
            ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: BinaDestinationId.account.path,
                builder: (_, _) => const AccountScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
