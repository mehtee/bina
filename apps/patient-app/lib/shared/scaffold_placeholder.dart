import 'package:bina_design_system/bina_design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../app/providers.dart';
import '../app/router.dart';

class Wave0ShellScaffold extends ConsumerWidget {
  const Wave0ShellScaffold({
    super.key,
    required this.navigationShell,
  });

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(appConfigProvider);
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
          Expanded(child: navigationShell),
        ],
      ),
    );
  }
}

class Wave0PlaceholderPage extends ConsumerWidget {
  const Wave0PlaceholderPage({
    super.key,
    required this.routeId,
    required this.titleFa,
    required this.subtitleFa,
  });

  final String routeId;
  final String titleFa;
  final String subtitleFa;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final brightness = Theme.of(context).brightness;
    final logo = BinaArtResolver.resolve(BinaArtId.logoFull, brightness);
    final headerWave = BinaArtResolver.resolve(BinaArtId.waveHeader, brightness);
    final catalogAsync = ref.watch(i18nCatalogProvider);

    return Stack(
      children: <Widget>[
        Positioned(
          top: 0,
          left: 0,
          right: 0,
          height: 120,
          child: IgnorePointer(
            child: Opacity(
              opacity: headerWave.defaultOpacity,
              child: Image.asset(
                headerWave.assetPath,
                fit: BoxFit.fitWidth,
                alignment: Alignment.topLeft,
                excludeFromSemantics: true,
              ),
            ),
          ),
        ),
        ListView(
          padding: const EdgeInsetsDirectional.all(16),
          children: <Widget>[
            const SizedBox(height: 16),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: Image.asset(
                logo.assetPath,
                height: 36,
                fit: BoxFit.contain,
                excludeFromSemantics: true,
              ),
            ),
            const SizedBox(height: 16),
            Text(titleFa, style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 8),
            Text(subtitleFa, style: Theme.of(context).textTheme.bodyLarge),
            const SizedBox(height: 12),
            Text('شناسه مسیر: $routeId', style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 12),
            catalogAsync.when(
              data: (cat) => Text(cat.text('common', 'welcomeTitle')),
              loading: () => const Text('در حال بارگذاری...'),
              error: (_, _) => const Text('خطا در بارگذاری کاتالوگ زبان'),
            ),
          ],
        ),
      ],
    );
  }
}

class Wave0SosPlaceholderScreen extends StatelessWidget {
  const Wave0SosPlaceholderScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Spec v2.1 §4.4.4 & §9.4: Zero decorative art on SOS screen.
    return Scaffold(
      appBar: AppBar(title: const Text('کمک فوری')),
      body: const SafeArea(
        child: Padding(
          padding: EdgeInsetsDirectional.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text(
                'اگر درد شدید، کاهش ناگهانی دید یا ترشح چرکی دارید فوراً با اورژانس چشم تماس بگیرید.',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
              ),
              SizedBox(height: 16),
              SelectableText(
                '\u2066+982182400000\u2069',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class Wave0MissingRouteScreen extends StatelessWidget {
  const Wave0MissingRouteScreen({super.key, required this.location});
  final String location;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('مسیر یافت نشد')),
      body: Center(
        child: Padding(
          padding: const EdgeInsetsDirectional.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              const Text('صفحه درخواستی در دسترس نیست.'),
              const SizedBox(height: 12),
              Text(location, textDirection: TextDirection.ltr),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => context.go(BinaDestinationId.today.path),
                child: const Text('بازگشت به امروز'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
