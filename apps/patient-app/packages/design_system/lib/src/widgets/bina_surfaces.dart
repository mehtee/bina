import 'package:flutter/material.dart';
import '../tokens/bina_spacing.dart';
import 'bina_art_widgets.dart';

enum BinaSurfaceVariant {
  frosted,
  hero,
  metric,
  solid,
  chart,
}

/// Shared frosted/hero/metric surface wrapper (`v2.1 §7.3`) separating outer
/// shadow from inner clipped ink material so shadows never clip.
class BinaSurface extends StatelessWidget {
  const BinaSurface({
    super.key,
    required this.child,
    this.variant = BinaSurfaceVariant.frosted,
    this.padding,
    this.radius,
    this.onTap,
    this.semanticLabel,
    this.mintMetricAccent = false,
  });

  final Widget child;
  final BinaSurfaceVariant variant;
  final EdgeInsetsGeometry? padding;
  final double? radius;
  final VoidCallback? onTap;
  final String? semanticLabel;
  final bool mintMetricAccent;

  @override
  Widget build(BuildContext context) {
    final sem = context.bina;
    final p = sem.palette;

    final effectiveRadius = radius ??
        switch (variant) {
          BinaSurfaceVariant.hero || BinaSurfaceVariant.chart => BinaRadii.hero,
          BinaSurfaceVariant.metric => BinaRadii.large,
          BinaSurfaceVariant.frosted || BinaSurfaceVariant.solid => BinaRadii.xl,
        };

    final borderRadius = BorderRadius.circular(effectiveRadius);

    final Decoration decoration = switch (variant) {
      BinaSurfaceVariant.frosted || BinaSurfaceVariant.chart => BoxDecoration(
          gradient: sem.frostedGradient,
          borderRadius: borderRadius,
          border: Border.all(color: sem.cardStrokeColor, width: sem.cardStrokeWidth),
          boxShadow: sem.shadowCard,
        ),
      BinaSurfaceVariant.hero => BoxDecoration(
          gradient: sem.mintHeroGradient,
          borderRadius: borderRadius,
          border: Border.all(color: sem.cardStrokeColor, width: sem.cardStrokeWidth),
          boxShadow: sem.shadowHero,
        ),
      BinaSurfaceVariant.metric => BoxDecoration(
          gradient: sem.metricGradient(mintAccent: mintMetricAccent),
          borderRadius: borderRadius,
          border: Border.all(color: sem.cardStrokeColor, width: sem.cardStrokeWidth),
          boxShadow: sem.shadowCard,
        ),
      BinaSurfaceVariant.solid => BoxDecoration(
          color: p.surface,
          borderRadius: borderRadius,
          border: Border.all(color: sem.outlineColorForSolid, width: sem.cardStrokeWidth),
          boxShadow: sem.shadowCard,
        ),
    };

    final inner = Padding(
      padding: padding ?? const EdgeInsetsDirectional.all(BinaSpacing.cardPaddingCompact),
      child: child,
    );

    final widgetTree = DecoratedBox(
      decoration: decoration,
      child: ClipRRect(
        borderRadius: borderRadius,
        child: Material(
          type: MaterialType.transparency,
          child: onTap != null
              ? InkWell(
                  onTap: onTap,
                  borderRadius: borderRadius,
                  child: inner,
                )
              : inner,
        ),
      ),
    );

    if (semanticLabel != null && semanticLabel!.isNotEmpty) {
      return Semantics(
        button: onTap != null,
        label: semanticLabel,
        child: widgetTree,
      );
    }
    return widgetTree;
  }
}

extension on BinaSemanticColors {
  Color get outlineColorForSolid => highContrast ? palette.outline : palette.outlineVariant;
}

enum BinaWellKind {
  medication,
  plan,
  test,
  profile,
  education,
  urgent,
  neutral,
}

/// 40/48/56dp rounded pastel icon well (`v2.1 §4.3 & §7.3`).
class BinaIconWell extends StatelessWidget {
  const BinaIconWell({
    super.key,
    required this.kind,
    required this.icon,
    this.size = BinaSpacing.iconWell,
  });

  final BinaWellKind kind;
  final IconData icon;
  final double size;

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    final (Color bg, Color fg) = switch (kind) {
      BinaWellKind.medication => (p.medicationWell, p.medicationInk),
      BinaWellKind.plan => (p.planWell, p.planInk),
      BinaWellKind.test => (p.testWell, p.testInk),
      BinaWellKind.profile => (p.profileWell, p.profileInk),
      BinaWellKind.education => (p.tertiaryContainer, p.onTertiaryContainer),
      BinaWellKind.urgent => (p.errorBg, p.error),
      BinaWellKind.neutral => (p.neutralBg, p.neutral),
    };

    return ExcludeSemantics(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(size >= 52 ? BinaRadii.large : BinaRadii.medium),
        ),
        child: Icon(icon, color: fg, size: size * 0.52),
      ),
    );
  }
}

enum BinaStatusKind {
  success,
  warning,
  error,
  info,
  neutral,
}

/// Semantic pill chip (`v2.1 §7.3`) pairing text with optional icon (never color alone).
class BinaStatusChip extends StatelessWidget {
  const BinaStatusChip({
    super.key,
    required this.kind,
    required this.text,
    this.icon,
  });

  final BinaStatusKind kind;
  final String text;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    final (Color bg, Color fg, IconData fallbackIcon) = switch (kind) {
      BinaStatusKind.success => (p.successBg, p.success, Icons.check_circle_rounded),
      BinaStatusKind.warning => (p.warningBg, p.warning, Icons.schedule_rounded),
      BinaStatusKind.error => (p.errorBg, p.error, Icons.warning_amber_rounded),
      BinaStatusKind.info => (p.infoBg, p.info, Icons.info_outline_rounded),
      BinaStatusKind.neutral => (p.neutralBg, p.neutral, Icons.circle_outlined),
    };

    return Container(
      padding: const EdgeInsetsDirectional.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(BinaRadii.pill),
        border: Border.all(color: fg.withValues(alpha: 0.25), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(icon ?? fallbackIcon, size: 18, color: fg),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              text,
              style: Theme.of(context).textTheme.labelMedium?.copyWith(color: fg),
            ),
          ),
        ],
      ),
    );
  }
}

/// Frosted adaptive G03 hero card pairing A01 iris artwork with RTL copy (`v2.1 §7.3`).
class BinaHero extends StatelessWidget {
  const BinaHero({
    super.key,
    required this.title,
    this.status,
    this.statusColor,
    this.statusIcon,
    required this.subtitle,
    this.artOnPhysicalLeft = true,
    this.minHeight = 172,
    this.action,
  });

  final String title;
  final String? status;
  final Color? statusColor;
  final IconData? statusIcon;
  final String subtitle;
  final bool artOnPhysicalLeft;
  final double minHeight;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final sem = context.bina;
    final p = sem.palette;
    final textScale = MediaQuery.textScalerOf(context).scale(16);
    final showArt = !sem.highContrast && textScale < 28;

    final copyBlock = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        Text(title, style: Theme.of(context).textTheme.titleLarge),
        if (status != null) ...<Widget>[
          const SizedBox(height: 6),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              if (statusIcon != null) ...<Widget>[
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: statusColor ?? p.successIcon,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(statusIcon, size: 18, color: Colors.white),
                ),
                const SizedBox(width: 8),
              ],
              Flexible(
                child: Text(
                  status!,
                  style: Theme.of(context).textTheme.displayMedium?.copyWith(
                        color: statusColor ?? p.success,
                      ),
                ),
              ),
            ],
          ),
        ],
        const SizedBox(height: 6),
        Text(
          subtitle,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: p.onSurfaceVariant),
        ),
        if (action != null) ...<Widget>[
          const SizedBox(height: 12),
          action!,
        ],
      ],
    );

    return BinaSurface(
      variant: BinaSurfaceVariant.hero,
      padding: EdgeInsets.zero,
      child: ConstrainedBox(
        constraints: BoxConstraints(minHeight: minHeight),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final compactWidth = constraints.maxWidth < 310;
            if (!showArt || compactWidth) {
              return Padding(
                padding: const EdgeInsetsDirectional.all(16),
                child: copyBlock,
              );
            }
            return IntrinsicHeight(
              child: Directionality(
                textDirection: TextDirection.ltr,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    if (artOnPhysicalLeft)
                      ClipRRect(
                        borderRadius: const BorderRadius.only(
                          topLeft: Radius.circular(BinaRadii.hero),
                          bottomLeft: Radius.circular(BinaRadii.hero),
                        ),
                        child: BinaIrisArtwork(
                          width: (constraints.maxWidth * 0.44).clamp(128.0, 190.0),
                          height: minHeight,
                          fadeTowardPhysicalRight: true,
                        ),
                      ),
                    Expanded(
                      child: Directionality(
                        textDirection: TextDirection.rtl,
                        child: Padding(
                          padding: const EdgeInsetsDirectional.all(16),
                          child: copyBlock,
                        ),
                      ),
                    ),
                    if (!artOnPhysicalLeft)
                      ClipRRect(
                        borderRadius: const BorderRadius.only(
                          topRight: Radius.circular(BinaRadii.hero),
                          bottomRight: Radius.circular(BinaRadii.hero),
                        ),
                        child: BinaIrisArtwork(
                          width: (constraints.maxWidth * 0.44).clamp(128.0, 190.0),
                          height: minHeight,
                          fadeTowardPhysicalRight: false,
                        ),
                      ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

/// Profile/header avatar (`v2.1 §7.3`) with neutral initials or icon fallback.
class BinaAvatar extends StatelessWidget {
  const BinaAvatar({
    super.key,
    required this.size,
    this.initials,
    this.verified = false,
  });

  final double size;
  final String? initials;
  final bool verified;

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    return Stack(
      clipBehavior: Clip.none,
      children: <Widget>[
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: p.profileWell,
            border: Border.all(color: p.surfaceRaised, width: 2),
          ),
          alignment: Alignment.center,
          child: (initials != null && initials!.trim().isNotEmpty)
              ? Text(
                  initials!.trim(),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(color: p.profileInk),
                )
              : Icon(Icons.person_outline_rounded, size: size * 0.52, color: p.profileInk),
        ),
        if (verified)
          PositionedDirectional(
            bottom: -2,
            start: -2,
            child: Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                color: p.successIcon,
                shape: BoxShape.circle,
                border: Border.all(color: p.surfaceRaised, width: 2),
              ),
              child: const Icon(Icons.check, size: 13, color: Colors.white),
            ),
          ),
      ],
    );
  }
}

/// Frosted rich list row with leading well, text, optional trailing widget & chevron.
class BinaRichRow extends StatelessWidget {
  const BinaRichRow({
    super.key,
    required this.title,
    this.subtitle,
    required this.wellKind,
    required this.icon,
    this.trailing,
    this.onTap,
    this.showChevron = true,
    this.minHeight = BinaSpacing.rowRich,
    this.wellSize = BinaSpacing.iconWell,
  });

  final String title;
  final String? subtitle;
  final BinaWellKind wellKind;
  final IconData icon;
  final Widget? trailing;
  final VoidCallback? onTap;
  final bool showChevron;
  final double minHeight;
  final double wellSize;

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    return BinaSurface(
      onTap: onTap,
      padding: const EdgeInsetsDirectional.symmetric(horizontal: 16, vertical: 12),
      child: ConstrainedBox(
        constraints: BoxConstraints(minHeight: minHeight - 24),
        child: Row(
          children: <Widget>[
            BinaIconWell(kind: wellKind, icon: icon, size: wellSize),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: <Widget>[
                  Text(title, style: Theme.of(context).textTheme.titleMedium),
                  if (subtitle != null && subtitle!.isNotEmpty) ...<Widget>[
                    const SizedBox(height: 2),
                    Text(
                      subtitle!,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: p.onSurfaceVariant),
                    ),
                  ],
                ],
              ),
            ),
            if (trailing != null) ...<Widget>[
              const SizedBox(width: 8),
              trailing!,
            ],
            if (onTap != null && showChevron) ...<Widget>[
              const SizedBox(width: 4),
              Icon(Icons.chevron_right_rounded, color: p.onSurfaceVariant, size: 24),
            ],
          ],
        ),
      ),
    );
  }
}

/// Task row matching `01-Today.png` & `03-Tests.png` with time pill (`v2.1 §7.3`).
class BinaTaskRow extends StatelessWidget {
  const BinaTaskRow({
    super.key,
    required this.title,
    required this.subtitle,
    required this.timeLabel,
    required this.wellKind,
    required this.icon,
    this.onTap,
    this.mintTimePill = false,
  });

  final String title;
  final String subtitle;
  final String timeLabel;
  final BinaWellKind wellKind;
  final IconData icon;
  final VoidCallback? onTap;
  final bool mintTimePill;

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    final pillBg = mintTimePill ? p.testWell : p.surfaceCream;
    final pillFg = p.onSurface;
    return BinaRichRow(
      title: title,
      subtitle: subtitle,
      wellKind: wellKind,
      icon: icon,
      onTap: onTap,
      trailing: Container(
        padding: const EdgeInsetsDirectional.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: pillBg,
          borderRadius: BorderRadius.circular(BinaRadii.pill),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Icon(Icons.schedule_rounded, size: 16, color: pillFg),
            const SizedBox(width: 4),
            Text(
              timeLabel,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: pillFg,
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Eye-isolated dose card for R1 post-cataract shared care (`v2.1 §9.2`).
/// Does NOT allow swipe-to-complete; explicit CTA opens recording confirmation.
class BinaDoseCard extends StatelessWidget {
  const BinaDoseCard({
    super.key,
    required this.eyeLabelFa,
    required this.drugNameFa,
    required this.bottleCapColorFa,
    required this.scheduledTimeLabel,
    required this.instructionsFa,
    required this.statusText,
    required this.statusKind,
    this.actionLabel = 'مشاهده و ثبت مصرف',
    required this.onOpen,
  });

  final String eyeLabelFa;
  final String drugNameFa;
  final String bottleCapColorFa;
  final String scheduledTimeLabel;
  final String instructionsFa;
  final String statusText;
  final BinaStatusKind statusKind;
  final String actionLabel;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    return BinaSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Row(
            children: <Widget>[
              const BinaIconWell(kind: BinaWellKind.medication, icon: Icons.water_drop_outlined),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      eyeLabelFa,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(color: p.primary),
                    ),
                    Text(drugNameFa, style: Theme.of(context).textTheme.titleLarge),
                  ],
                ),
              ),
              BinaStatusChip(kind: statusKind, text: statusText),
            ],
          ),
          const SizedBox(height: 10),
          Text(instructionsFa, style: Theme.of(context).textTheme.bodyLarge),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: <Widget>[
              Chip(
                avatar: const Icon(Icons.medication_outlined, size: 18),
                label: Text(bottleCapColorFa),
              ),
              Chip(
                avatar: const Icon(Icons.schedule_rounded, size: 18),
                label: Text(scheduledTimeLabel),
              ),
            ],
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: onOpen,
            icon: const Icon(Icons.check_circle_outline_rounded),
            label: Text(actionLabel),
          ),
        ],
      ),
    );
  }
}

/// Metric summary tile (`v2.1 §7.3`). Never displays missing data as `0`.
class BinaMetricTile extends StatelessWidget {
  const BinaMetricTile({
    super.key,
    required this.label,
    required this.value,
    this.unit,
    this.footer,
    this.leadingStatus,
    this.trailingVisual,
    this.onTap,
    this.mintAccent = false,
  });

  final String label;
  final String value;
  final String? unit;
  final String? footer;
  final Widget? leadingStatus;
  final Widget? trailingVisual;
  final VoidCallback? onTap;
  final bool mintAccent;

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    return BinaSurface(
      variant: BinaSurfaceVariant.metric,
      mintMetricAccent: mintAccent,
      onTap: onTap,
      padding: const EdgeInsetsDirectional.all(14),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 88),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: <Widget>[
            Text(label, style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            Row(
              children: <Widget>[
                if (leadingStatus != null) ...<Widget>[
                  leadingStatus!,
                  const SizedBox(width: 8),
                ],
                Expanded(
                  child: Text.rich(
                    TextSpan(
                      children: <InlineSpan>[
                        TextSpan(
                          text: value,
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        if (unit != null && unit!.isNotEmpty) ...<InlineSpan>[
                          const TextSpan(text: ' '),
                          TextSpan(
                            text: '\u2066$unit\u2069',
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                  color: p.onSurfaceVariant,
                                ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                ?trailingVisual,
              ],
            ),
            if (footer != null && footer!.isNotEmpty) ...<Widget>[
              const SizedBox(height: 6),
              Text(
                footer!,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: p.onSurfaceVariant),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Stat tile for IOP summary trio (`08-IOP-Detail.png` `v2.1 §7.3`).
class BinaStatTile extends StatelessWidget {
  const BinaStatTile({
    super.key,
    required this.label,
    required this.value,
    required this.unit,
    required this.icon,
  });

  final String label;
  final String value;
  final String unit;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    return BinaSurface(
      padding: const EdgeInsetsDirectional.all(12),
      radius: BinaRadii.large,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 84),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(label, style: Theme.of(context).textTheme.titleSmall?.copyWith(color: p.onSurfaceVariant)),
            const SizedBox(height: 6),
            Row(
              children: <Widget>[
                Expanded(
                  child: Text(value, style: Theme.of(context).textTheme.headlineMedium),
                ),
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(color: p.surfaceMint, shape: BoxShape.circle),
                  child: Icon(icon, size: 18, color: p.primary),
                ),
              ],
            ),
            Text('\u2066$unit\u2069', style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    );
  }
}

/// Expandable frosted disclosure row (`06-Medication-Detail.png` `v2.1 §7.3`).
class BinaExpandableRow extends StatefulWidget {
  const BinaExpandableRow({
    super.key,
    required this.title,
    required this.content,
    this.initiallyExpanded = false,
  });

  final String title;
  final String content;
  final bool initiallyExpanded;

  @override
  State<BinaExpandableRow> createState() => _BinaExpandableRowState();
}

class _BinaExpandableRowState extends State<BinaExpandableRow> {
  late bool _expanded = widget.initiallyExpanded;

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    return BinaSurface(
      onTap: () => setState(() => _expanded = !_expanded),
      child: Semantics(
        toggled: _expanded,
        label: widget.title,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Row(
              children: <Widget>[
                const BinaIconWell(
                  kind: BinaWellKind.neutral,
                  icon: Icons.info_outline_rounded,
                  size: BinaSpacing.iconWellSmall,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(widget.title, style: Theme.of(context).textTheme.titleMedium),
                ),
                Icon(
                  _expanded ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                  color: p.onSurfaceVariant,
                ),
              ],
            ),
            AnimatedSize(
              duration: BinaMotion.resolve(context, BinaMotion.expand),
              curve: BinaMotion.curveExpand,
              child: _expanded
                  ? Padding(
                      padding: const EdgeInsetsDirectional.only(top: 12),
                      child: SelectableText(
                        widget.content,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: p.onSurfaceVariant),
                      ),
                    )
                  : const SizedBox.shrink(),
            ),
          ],
        ),
      ),
    );
  }
}

/// Toggle row inside frosted card (`06-Medication-Detail.png` `v2.1 §7.3`).
class BinaSwitchRow extends StatelessWidget {
  const BinaSwitchRow({
    super.key,
    required this.title,
    this.subtitle,
    required this.value,
    required this.onChanged,
    this.icon = Icons.notifications_none_rounded,
    this.wellKind = BinaWellKind.medication,
  });

  final String title;
  final String? subtitle;
  final bool value;
  final ValueChanged<bool>? onChanged;
  final IconData icon;
  final BinaWellKind wellKind;

  @override
  Widget build(BuildContext context) {
    return BinaSurface(
      padding: const EdgeInsetsDirectional.symmetric(horizontal: 12, vertical: 8),
      child: SwitchListTile(
        contentPadding: const EdgeInsetsDirectional.symmetric(horizontal: 4),
        secondary: BinaIconWell(kind: wellKind, icon: icon, size: BinaSpacing.iconWellSmall),
        title: Text(title, style: Theme.of(context).textTheme.titleMedium),
        subtitle: subtitle != null
            ? Text(
                subtitle!,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: context.binaPalette.onSurfaceVariant,
                    ),
              )
            : null,
        value: value,
        onChanged: onChanged,
      ),
    );
  }
}

/// Daily adherence progress count with explicit denominator (`v2.1 §11.1`).
class BinaCareProgress extends StatelessWidget {
  const BinaCareProgress({
    super.key,
    required this.recordedCount,
    required this.totalCount,
    required this.label,
  });

  final int recordedCount;
  final int totalCount;
  final String label;

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    final ratio = totalCount > 0 ? (recordedCount / totalCount).clamp(0.0, 1.0) : 0.0;
    return BinaSurface(
      padding: const EdgeInsetsDirectional.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(child: Text(label, style: Theme.of(context).textTheme.titleSmall)),
              Text(
                '$recordedCount از $totalCount',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(color: p.primary),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(BinaRadii.pill),
            child: LinearProgressIndicator(
              value: ratio,
              minHeight: 8,
              backgroundColor: p.surfaceSoft,
              valueColor: AlwaysStoppedAnimation<Color>(p.primary),
            ),
          ),
        ],
      ),
    );
  }
}
