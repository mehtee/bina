import 'package:flutter/material.dart';
import '../tokens/bina_spacing.dart';
import 'bina_art_widgets.dart';

@immutable
class BinaNavItem {
  const BinaNavItem({
    required this.labelFa,
    required this.icon,
    required this.selectedIcon,
  });

  final String labelFa;
  final IconData icon;
  final IconData selectedIcon;
}

/// G07 floating dock on compact widths (<600dp) and NavigationRail on expanded
/// widths (`v2.1 §5.3 & §7.3`). All labels stay visible; zero icon-only nav.
class BinaFloatingDock extends StatelessWidget {
  const BinaFloatingDock({
    super.key,
    required this.items,
    required this.selectedIndex,
    required this.onSelected,
  });

  final List<BinaNavItem> items;
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    final sem = context.bina;
    final p = sem.palette;

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsetsDirectional.fromSTEB(16, 0, 16, 8),
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: sem.dockGradient,
            borderRadius: BorderRadius.circular(BinaRadii.dock),
            border: Border.all(color: sem.cardStrokeColor, width: sem.cardStrokeWidth),
            boxShadow: sem.shadowDock,
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(BinaRadii.dock),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
              child: Row(
                children: <Widget>[
                  for (var i = 0; i < items.length; i += 1)
                    Expanded(
                      child: _DockTabButton(
                        item: items[i],
                        selected: i == selectedIndex,
                        onTap: () => onSelected(i),
                        p: p,
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _DockTabButton extends StatelessWidget {
  const _DockTabButton({
    required this.item,
    required this.selected,
    required this.onTap,
    required this.p,
  });

  final BinaNavItem item;
  final bool selected;
  final VoidCallback onTap;
  final dynamic p;

  @override
  Widget build(BuildContext context) {
    final fg = selected ? p.onPrimaryContainer as Color : p.onSurfaceVariant as Color;
    return Semantics(
      button: true,
      selected: selected,
      label: item.labelFa,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 62, minWidth: BinaSpacing.touchMin),
        child: AnimatedContainer(
          duration: BinaMotion.resolve(context, BinaMotion.tab),
          decoration: BoxDecoration(
            color: selected ? (p.primaryContainer as Color) : Colors.transparent,
            borderRadius: BorderRadius.circular(18),
          ),
          child: Material(
            type: MaterialType.transparency,
            child: InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(18),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: <Widget>[
                    Icon(selected ? item.selectedIcon : item.icon, size: 24, color: fg),
                    const SizedBox(height: 3),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      child: Text(
                        item.labelFa,
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: fg,
                              fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                            ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Shell / detail AppBar enforcing RTL right-side back arrow on child pages
/// and NO back arrow on root tabs (`v2.1 §14.2`). Always exposes labeled SOS help.
class BinaAppBar extends StatelessWidget implements PreferredSizeWidget {
  const BinaAppBar({
    super.key,
    required this.title,
    this.isRootTab = false,
    this.onBack,
    this.onUrgentHelp,
    this.actions = const <Widget>[],
  });

  final String title;
  final bool isRootTab;
  final VoidCallback? onBack;
  final VoidCallback? onUrgentHelp;
  final List<Widget> actions;

  @override
  Size get preferredSize => const Size.fromHeight(BinaSpacing.topBarMin);

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    return AppBar(
      automaticallyImplyLeading: false,
      leading: (!isRootTab && (onBack != null || Navigator.of(context).canPop()))
          ? IconButton(
              onPressed: onBack ?? () => Navigator.of(context).maybePop(),
              tooltip: 'بازگشت',
              icon: const Icon(Icons.arrow_back_rounded),
            )
          : null,
      title: Text(title, overflow: TextOverflow.ellipsis),
      actions: <Widget>[
        ...actions,
        if (onUrgentHelp != null)
          Padding(
            padding: const EdgeInsetsDirectional.only(end: 8),
            child: TextButton.icon(
              onPressed: onUrgentHelp,
              style: TextButton.styleFrom(
                foregroundColor: p.urgentAction,
                textStyle: Theme.of(context).textTheme.labelMedium?.copyWith(
                      color: p.urgentAction,
                      decoration: TextDecoration.none,
                    ),
              ),
              icon: const Icon(Icons.phone_in_talk_rounded, size: 20),
              label: const Text('کمک فوری'),
            ),
          ),
      ],
    );
  }
}

/// Adaptive scaffold coordinating [BinaFloatingDock] / `NavigationRail` and
/// [BinaCanvas] (`v2.1 §6.1`).
class BinaShellLayout extends StatelessWidget {
  const BinaShellLayout({
    super.key,
    required this.navItems,
    required this.selectedIndex,
    required this.onSelectTab,
    required this.body,
    this.appBar,
    this.artVariant = BinaCanvasArtVariant.none,
  });

  final List<BinaNavItem> navItems;
  final int selectedIndex;
  final ValueChanged<int> onSelectTab;
  final Widget body;
  final PreferredSizeWidget? appBar;
  final BinaCanvasArtVariant artVariant;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final useRail = constraints.maxWidth >= 600;
        return BinaCanvas(
          artVariant: artVariant,
          child: Scaffold(
            backgroundColor: Colors.transparent,
            appBar: appBar,
            body: SafeArea(
              child: useRail
                  ? Row(
                      children: <Widget>[
                        NavigationRail(
                          selectedIndex: selectedIndex,
                          onDestinationSelected: onSelectTab,
                          labelType: NavigationRailLabelType.all,
                          destinations: <NavigationRailDestination>[
                            for (final item in navItems)
                              NavigationRailDestination(
                                icon: Icon(item.icon),
                                selectedIcon: Icon(item.selectedIcon),
                                label: Text(item.labelFa),
                              ),
                          ],
                        ),
                        const VerticalDivider(width: 1),
                        Expanded(child: body),
                      ],
                    )
                  : body,
            ),
            bottomNavigationBar: useRail
                ? null
                : BinaFloatingDock(
                    items: navItems,
                    selectedIndex: selectedIndex,
                    onSelected: onSelectTab,
                  ),
          ),
        );
      },
    );
  }
}
