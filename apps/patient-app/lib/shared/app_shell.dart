import 'package:bina_design_system/bina_design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../app/providers.dart';
import '../app/router.dart';

/// Production shell wrapping root tabs with floating dock / navigation rail (`v2.1 §6.1`),
/// persistent caregiver context (`v2.1 §9.5`), and optional dev preview harness launcher.
class BinaAppShell extends ConsumerWidget {
  const BinaAppShell({
    super.key,
    required this.navigationShell,
  });

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(appConfigProvider);
    final session = ref.watch(sessionProvider);
    final destinations = BinaDestinationId.enabledFor(config);
    final currentIndex = navigationShell.currentIndex.clamp(0, destinations.length - 1);

    return BinaShellLayout(
      navItems: destinations.map((d) => d.toNavItem()).toList(growable: false),
      selectedIndex: currentIndex,
      onSelectTab: (idx) {
        navigationShell.goBranch(idx, initialLocation: idx == navigationShell.currentIndex);
      },
      body: Column(
        children: <Widget>[
          if (config.enablePreviewHarness)
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton.icon(
                onPressed: () => context.push('/__preview'),
                icon: const Icon(Icons.preview_outlined, size: 18),
                label: const Text('پیش‌نمایش V01–V09'),
              ),
            ),
          if (session?.actorType == 'caregiver')
            Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(16, 8, 16, 4),
              child: BinaContextBanner(
                patientNameFa: session!.activePatientNameFa ?? 'پرونده تحت مراقبت',
                onSwitchPatient: () => context.push('/caregiver/patients'),
              ),
            ),
          Expanded(
            child: _TabCrossfadeWrapper(
              index: currentIndex,
              child: navigationShell,
            ),
          ),
        ],
      ),
    );
  }
}

class _TabCrossfadeWrapper extends StatefulWidget {
  const _TabCrossfadeWrapper({
    required this.index,
    required this.child,
  });

  final int index;
  final Widget child;

  @override
  State<_TabCrossfadeWrapper> createState() => _TabCrossfadeWrapperState();
}

class _TabCrossfadeWrapperState extends State<_TabCrossfadeWrapper>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    value: 1.0,
    duration: BinaMotion.tab,
  );
  late final Animation<double> _opacity = CurvedAnimation(
    parent: _controller,
    curve: BinaMotion.curveStandard,
  );

  @override
  void didUpdateWidget(covariant _TabCrossfadeWrapper oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.index != widget.index) {
      if (BinaMotion.isReduced(context)) {
        _controller.value = 1.0;
      } else {
        _controller.forward(from: 0.25);
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _opacity,
      child: widget.child,
    );
  }
}

/// Safe not-found deep-link fallback (`v2.1 §9.8 SYS-08`).
/// Never falls back to an unrelated patient's route.
class BinaMissingRouteScreen extends StatelessWidget {
  const BinaMissingRouteScreen({super.key, required this.location});

  final String location;

  @override
  Widget build(BuildContext context) {
    return BinaCanvas(
      artVariant: BinaCanvasArtVariant.none,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: BinaAppBar(
          title: 'صفحه یافت نشد',
          isRootTab: true,
          onUrgentHelp: () => context.push('/help/urgent'),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsetsDirectional.all(24),
            child: BinaEmptyState(
              icon: Icons.explore_off_outlined,
              title: 'مسیر درخواستی در دسترس نیست',
              message: 'این صفحه وجود ندارد یا مجوز مشاهده آن برقرار نیست.',
              actionLabel: 'بازگشت به برنامه امروز',
              onAction: () => context.go(BinaDestinationId.today.path),
            ),
          ),
        ),
      ),
    );
  }
}
