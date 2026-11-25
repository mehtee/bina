import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../tokens/bina_palette.dart';
import '../tokens/bina_spacing.dart';
import 'bina_controls.dart';
import 'bina_surfaces.dart';

/// Multi-step workflow progress header (`v2.1 §7 & §10.2`) for Onboarding,
/// Auth, Symptoms, and Vision Testing flows.
class BinaStepHeader extends StatelessWidget {
  const BinaStepHeader({
    super.key,
    required this.currentStep,
    required this.totalSteps,
    required this.titleFa,
  });

  final int currentStep;
  final int totalSteps;
  final String titleFa;

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    final ratio = totalSteps > 0 ? (currentStep / totalSteps).clamp(0.0, 1.0) : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Row(
          children: <Widget>[
            Expanded(
              child: Text(titleFa, style: Theme.of(context).textTheme.titleMedium),
            ),
            Text(
              'مرحله $currentStep از $totalSteps',
              style: Theme.of(context).textTheme.labelMedium?.copyWith(color: p.primary),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(BinaRadii.pill),
          child: TweenAnimationBuilder<double>(
            tween: Tween<double>(begin: ratio, end: ratio),
            duration: BinaMotion.resolve(context, BinaMotion.expand),
            curve: BinaMotion.curveStandard,
            builder: (context, val, _) => LinearProgressIndicator(
              value: val,
              minHeight: 6,
              backgroundColor: p.surfaceSoft,
              valueColor: AlwaysStoppedAnimation<Color>(p.primary),
            ),
          ),
        ),
      ],
    );
  }
}

/// Reusable frosted/solid modal bottom sheet with explicit close button and
/// large-text safe scroll (`v2.1 §7`).
Future<T?> showBinaBottomSheet<T>(
  BuildContext context, {
  required String titleFa,
  required Widget child,
}) {
  final p = context.binaPalette;
  final sem = context.bina;
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: p.surfaceRaised,
    shape: RoundedRectangleBorder(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(BinaRadii.hero)),
      side: sem.highContrast ? BorderSide(color: p.outline, width: 2.0) : BorderSide.none,
    ),
    builder: (ctx) => Padding(
      padding: EdgeInsetsDirectional.fromSTEB(
        20,
        16,
        20,
        20 + MediaQuery.viewInsetsOf(ctx).bottom,
      ),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(ctx).height * 0.85),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Row(
              children: <Widget>[
                Expanded(child: Text(titleFa, style: Theme.of(ctx).textTheme.titleLarge)),
                IconButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  tooltip: 'بستن',
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
            const Divider(),
            Flexible(
              child: SingleChildScrollView(
                child: child,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

/// Reusable permission rationale & OS settings recovery panel (`v2.1 §7 & SYS-06`).
class BinaPermissionPanel extends StatelessWidget {
  const BinaPermissionPanel({
    super.key,
    required this.title,
    required this.rationaleFa,
    required this.privacyNoteFa,
    required this.actionLabel,
    required this.onRequestPermission,
    this.secondaryLabel,
    this.onSecondary,
    this.icon = Icons.privacy_tip_outlined,
  });

  final String title;
  final String rationaleFa;
  final String privacyNoteFa;
  final String actionLabel;
  final VoidCallback onRequestPermission;
  final String? secondaryLabel;
  final VoidCallback? onSecondary;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return BinaSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Row(
            children: <Widget>[
              BinaIconWell(kind: BinaWellKind.test, icon: icon, size: 48),
              const SizedBox(width: 12),
              Expanded(child: Text(title, style: Theme.of(context).textTheme.titleLarge)),
            ],
          ),
          const SizedBox(height: 12),
          Text(rationaleFa, style: Theme.of(context).textTheme.bodyLarge),
          const SizedBox(height: 8),
          Text(
            privacyNoteFa,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: context.binaPalette.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 16),
          BinaGradientButton(label: actionLabel, onPressed: onRequestPermission),
          if (secondaryLabel != null && onSecondary != null) ...<Widget>[
            const SizedBox(height: 10),
            BinaSecondaryButton(label: secondaryLabel!, onPressed: onSecondary),
          ],
        ],
      ),
    );
  }
}

/// Chronological sample model for [BinaIOPChart].
@immutable
class BinaIopSample {
  const BinaIopSample({
    required this.labelJalali,
    required this.timestampUtc,
    required this.iopMmHg,
    required this.eyeLabelFa,
  });

  final String labelJalali;
  final DateTime timestampUtc;
  final double iopMmHg;
  final String eyeLabelFa;
}

/// Legend swatches for clinical plots (`v2.1 §7.3 & §11.1`).
class BinaChartLegend extends StatelessWidget {
  const BinaChartLegend({
    super.key,
    required this.seriesLabel,
    this.targetBandLabel,
  });

  final String seriesLabel;
  final String? targetBandLabel;

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    return Wrap(
      spacing: 16,
      runSpacing: 8,
      children: <Widget>[
        Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: p.surface,
                border: Border.all(color: p.chart1, width: 2.5),
              ),
            ),
            const SizedBox(width: 6),
            Flexible(child: Text(seriesLabel, style: Theme.of(context).textTheme.bodySmall)),
          ],
        ),
        if (targetBandLabel != null)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Container(
                width: 14,
                height: 10,
                decoration: BoxDecoration(
                  color: p.chartBand,
                  border: Border.all(color: p.chartBandEdge),
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
              const SizedBox(width: 6),
              Flexible(child: Text(targetBandLabel!, style: Theme.of(context).textTheme.bodySmall)),
            ],
          ),
      ],
    );
  }
}

/// Interactive single-eye chronological IOP chart (`v2.1 §7.3 & §11.1`):
/// plots real timestamps, never animates values, shows accessible companion table.
class BinaIOPChart extends StatefulWidget {
  const BinaIOPChart({
    super.key,
    required this.samples,
    required this.eyeLabelFa,
    this.targetMinMmHg,
    this.targetMaxMmHg,
    this.targetLabelFa,
  });

  final List<BinaIopSample> samples;
  final String eyeLabelFa;
  final double? targetMinMmHg;
  final double? targetMaxMmHg;
  final String? targetLabelFa;

  @override
  State<BinaIOPChart> createState() => _BinaIOPChartState();
}

class _BinaIOPChartState extends State<BinaIOPChart> {
  late int _selectedIndex = widget.samples.isNotEmpty ? widget.samples.length - 1 : 0;
  bool _showTable = false;

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    if (widget.samples.isEmpty) {
      return const BinaEmptyState(
        icon: Icons.show_chart_rounded,
        title: 'داده‌ای برای نمایش نمودار موجود نیست',
        message: 'پس از ثبت اندازه‌گیری معتبر، نمودار فشار چشم برای همین چشم نمایش داده می‌شود.',
      );
    }

    final sorted = List<BinaIopSample>.of(widget.samples)
      ..sort((a, b) => a.timestampUtc.compareTo(b.timestampUtc));
    final idx = _selectedIndex.clamp(0, sorted.length - 1);
    final selected = sorted[idx];

    return BinaSurface(
      variant: BinaSurfaceVariant.chart,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 12,
            runSpacing: 8,
            children: <Widget>[
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    '${selected.iopMmHg.toStringAsFixed(1)} \u2066mmHg\u2069',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: p.primary),
                  ),
                  Text(
                    '${widget.eyeLabelFa} — ${selected.labelJalali}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
              TextButton(
                onPressed: () => setState(() => _showTable = !_showTable),
                child: Text(_showTable ? 'نمای نمودار' : 'جدول داده‌ها'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_showTable) ...<Widget>[
            for (var i = 0; i < sorted.length; i += 1)
              InkWell(
                onTap: () => setState(() => _selectedIndex = i),
                child: Padding(
                  padding: const EdgeInsetsDirectional.symmetric(vertical: 8, horizontal: 6),
                  child: Row(
                    children: <Widget>[
                      Expanded(child: Text(sorted[i].labelJalali)),
                      Text('\u2066${sorted[i].iopMmHg.toStringAsFixed(1)} mmHg\u2069'),
                    ],
                  ),
                ),
              ),
          ] else ...<Widget>[
            // Scientific time axis convention: oldest left -> newest right (`v2.1 §11.1`).
            Directionality(
              textDirection: TextDirection.ltr,
              child: SizedBox(
                height: 196,
                child: Semantics(
                  label: 'نمودار فشار چشم ${widget.eyeLabelFa}، آخرین مقدار ${selected.iopMmHg.toStringAsFixed(1)} میلی‌متر جیوه',
                  child: CustomPaint(
                    painter: _BinaIopChartPainter(
                      samples: sorted,
                      selectedIndex: idx,
                      palette: p,
                      targetMin: widget.targetMinMmHg,
                      targetMax: widget.targetMaxMmHg,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 6,
              children: <Widget>[
                for (var i = 0; i < sorted.length; i += 1)
                  ChoiceChip(
                    label: Text(sorted[i].labelJalali),
                    selected: i == idx,
                    onSelected: (_) => setState(() => _selectedIndex = i),
                  ),
              ],
            ),
          ],
          const SizedBox(height: 12),
          BinaChartLegend(
            seriesLabel: widget.eyeLabelFa,
            targetBandLabel: widget.targetLabelFa,
          ),
        ],
      ),
    );
  }
}

class _BinaIopChartPainter extends CustomPainter {
  _BinaIopChartPainter({
    required this.samples,
    required this.selectedIndex,
    required this.palette,
    this.targetMin,
    this.targetMax,
  });

  final List<BinaIopSample> samples;
  final int selectedIndex;
  final BinaPalette palette;
  final double? targetMin;
  final double? targetMax;

  @override
  void paint(Canvas canvas, Size size) {
    const padL = 36.0;
    const padR = 14.0;
    const padT = 14.0;
    const padB = 22.0;
    final plotW = (size.width - padL - padR).clamp(20.0, size.width);
    final plotH = (size.height - padT - padB).clamp(20.0, size.height);

    var minY = samples.map((s) => s.iopMmHg).reduce(math.min);
    var maxY = samples.map((s) => s.iopMmHg).reduce(math.max);
    if (targetMin != null) minY = math.min(minY, targetMin!);
    if (targetMax != null) maxY = math.max(maxY, targetMax!);
    minY = (minY - 2.0).floorToDouble();
    maxY = (maxY + 2.0).ceilToDouble();
    final spanY = (maxY - minY).abs() < 1e-3 ? 4.0 : (maxY - minY);

    double yFor(double v) => padT + plotH - ((v - minY) / spanY) * plotH;

    if (targetMin != null && targetMax != null) {
      final top = yFor(targetMax!);
      final bot = yFor(targetMin!);
      canvas.drawRect(
        Rect.fromLTRB(padL, top, padL + plotW, bot),
        Paint()..color = palette.chartBand,
      );
    }

    final gridPaint = Paint()
      ..color = palette.chartGrid
      ..strokeWidth = 1.0;
    for (var i = 0; i <= 3; i += 1) {
      final y = padT + (i / 3.0) * plotH;
      canvas.drawLine(Offset(padL, y), Offset(padL + plotW, y), gridPaint);
      final tickVal = maxY - (i / 3.0) * spanY;
      final tp = TextPainter(
        text: TextSpan(
          text: tickVal.toStringAsFixed(0),
          style: TextStyle(color: palette.chartAxis, fontSize: 11),
        ),
        textDirection: TextDirection.ltr,
      )..layout();
      tp.paint(canvas, Offset(4, y - tp.height / 2));
    }

    final minMs = samples.first.timestampUtc.millisecondsSinceEpoch;
    final maxMs = samples.last.timestampUtc.millisecondsSinceEpoch;
    final spanMs = (maxMs - minMs).abs();

    Offset pointAt(int i) {
      final tNorm = spanMs == 0
          ? (samples.length == 1 ? 0.5 : i / (samples.length - 1))
          : (samples[i].timestampUtc.millisecondsSinceEpoch - minMs) / spanMs;
      return Offset(padL + tNorm * plotW, yFor(samples[i].iopMmHg));
    }

    final path = Path();
    for (var i = 0; i < samples.length; i += 1) {
      final pt = pointAt(i);
      if (i == 0) {
        path.moveTo(pt.dx, pt.dy);
      } else {
        path.lineTo(pt.dx, pt.dy);
      }
    }
    canvas.drawPath(
      path,
      Paint()
        ..color = palette.chart1
        ..strokeWidth = 3.0
        ..style = PaintingStyle.stroke,
    );

    for (var i = 0; i < samples.length; i += 1) {
      final pt = pointAt(i);
      final isSel = i == selectedIndex;
      canvas.drawCircle(pt, isSel ? 6.0 : 4.5, Paint()..color = palette.surface);
      canvas.drawCircle(
        pt,
        isSel ? 6.0 : 4.5,
        Paint()
          ..color = palette.chart1
          ..strokeWidth = isSel ? 3.0 : 2.2
          ..style = PaintingStyle.stroke,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _BinaIopChartPainter oldDelegate) =>
      oldDelegate.samples != samples ||
      oldDelegate.selectedIndex != selectedIndex ||
      oldDelegate.palette != palette;
}

/// White-paper locked deterministic 24-2 visual field sensitivity map (`v2.1 §7.3 & §9.0A V07`).
/// Never inverted by Dark Theme or mirrored by RTL.
class BinaVFMap extends StatelessWidget {
  const BinaVFMap({
    super.key,
    required this.gridValuesDb,
    required this.semanticSummaryFa,
    this.size = 190,
  });

  /// 6x6 grayscale matrix of normalized sensitivity (`0.0 = defect, 1.0 = full`).
  final List<List<double>> gridValuesDb;
  final String semanticSummaryFa;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Directionality(
      textDirection: TextDirection.ltr,
      child: Semantics(
        label: semanticSummaryFa,
        child: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: const Color(0xFFFFFFFF),
            border: Border.all(color: context.binaPalette.outlineVariant),
            borderRadius: BorderRadius.circular(BinaRadii.medium),
          ),
          child: SizedBox(
            width: size,
            height: size,
            child: CustomPaint(
              painter: _BinaVfMapPainter(grid: gridValuesDb),
            ),
          ),
        ),
      ),
    );
  }
}

class _BinaVfMapPainter extends CustomPainter {
  _BinaVfMapPainter({required this.grid});
  final List<List<double>> grid;

  @override
  void paint(Canvas canvas, Size size) {
    final rows = grid.length;
    if (rows == 0) return;
    final cellH = size.height / rows;
    final cols = grid.first.length;
    if (cols == 0) return;
    final cellW = size.width / cols;

    for (var r = 0; r < rows; r += 1) {
      for (var c = 0; c < grid[r].length; c += 1) {
        final v = grid[r][c];
        if (v < 0) continue; // outside 24-2 oval
        final gray = (v.clamp(0.0, 1.0) * 230 + 20).round();
        canvas.drawRect(
          Rect.fromLTWH(c * cellW + 1, r * cellH + 1, cellW - 2, cellH - 2),
          Paint()..color = Color.fromARGB(255, gray, gray, gray),
        );
      }
    }

    final axisPaint = Paint()
      ..color = const Color(0xFF334155)
      ..strokeWidth = 1.2;
    canvas.drawLine(Offset(size.width / 2, 0), Offset(size.width / 2, size.height), axisPaint);
    canvas.drawLine(Offset(0, size.height / 2), Offset(size.width, size.height / 2), axisPaint);
  }

  @override
  bool shouldRepaint(covariant _BinaVfMapPainter oldDelegate) => oldDelegate.grid != grid;
}

/// Chronological timeline widget (`v2.1 §7`) for taper schedules and history.
class BinaTimeline extends StatelessWidget {
  const BinaTimeline({
    super.key,
    required this.entries,
  });

  final List<({String title, String subtitle, String dateLabel, bool active})> entries;

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        for (var i = 0; i < entries.length; i += 1)
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Column(
                children: <Widget>[
                  Container(
                    width: 14,
                    height: 14,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: entries[i].active ? p.primary : p.outlineVariant,
                    ),
                  ),
                  if (i + 1 < entries.length)
                    Container(width: 2, height: 42, color: p.outlineVariant),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: const EdgeInsetsDirectional.only(bottom: 12),
                  child: BinaSurface(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(entries[i].title, style: Theme.of(context).textTheme.titleMedium),
                        const SizedBox(height: 2),
                        Text(entries[i].subtitle, style: Theme.of(context).textTheme.bodySmall),
                        const SizedBox(height: 4),
                        Text(
                          entries[i].dateLabel,
                          style: Theme.of(context).textTheme.labelSmall?.copyWith(color: p.primary),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
      ],
    );
  }
}

/// Custom local vector artwork matching `v2.1 §7.5` (teal dropper, IOP gauge, VF dots, VR goggles).
class BinaVectorArt extends StatelessWidget {
  const BinaVectorArt.dropper({super.key, this.size = 92}) : _kind = _BinaVectorKind.dropper;
  const BinaVectorArt.iopGauge({super.key, this.size = 56}) : _kind = _BinaVectorKind.iopGauge;
  const BinaVectorArt.vfDots({super.key, this.size = 56}) : _kind = _BinaVectorKind.vfDots;
  const BinaVectorArt.vrGoggles({super.key, this.size = 36}) : _kind = _BinaVectorKind.vrGoggles;

  final double size;
  final _BinaVectorKind _kind;

  @override
  Widget build(BuildContext context) {
    return ExcludeSemantics(
      child: SizedBox(
        width: size,
        height: size,
        child: CustomPaint(
          painter: _BinaVectorPainter(kind: _kind, palette: context.binaPalette),
        ),
      ),
    );
  }
}

enum _BinaVectorKind { dropper, iopGauge, vfDots, vrGoggles }

class _BinaVectorPainter extends CustomPainter {
  _BinaVectorPainter({required this.kind, required this.palette});
  final _BinaVectorKind kind;
  final BinaPalette palette;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    switch (kind) {
      case _BinaVectorKind.dropper:
        // Teal dropper bottle with white cap matching `06-Medication-Detail.png`
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromLTWH(w * 0.24, h * 0.34, w * 0.52, h * 0.56),
            Radius.circular(w * 0.14),
          ),
          Paint()..color = palette.primary,
        );
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromLTWH(w * 0.30, h * 0.46, w * 0.40, h * 0.28),
            Radius.circular(w * 0.06),
          ),
          Paint()..color = Colors.white.withValues(alpha: 0.90),
        );
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromLTWH(w * 0.36, h * 0.14, w * 0.28, h * 0.22),
            Radius.circular(w * 0.06),
          ),
          Paint()..color = palette.surfaceRaised,
        );
        canvas.drawPath(
          Path()
            ..moveTo(w * 0.44, h * 0.14)
            ..lineTo(w * 0.56, h * 0.14)
            ..lineTo(w * 0.52, h * 0.04)
            ..lineTo(w * 0.48, h * 0.04)
            ..close(),
          Paint()..color = Colors.white,
        );
      case _BinaVectorKind.iopGauge:
        final rect = Rect.fromLTWH(w * 0.1, h * 0.2, w * 0.8, h * 0.7);
        canvas.drawArc(
          rect,
          math.pi,
          math.pi,
          false,
          Paint()
            ..color = palette.testInk
            ..strokeWidth = 5
            ..style = PaintingStyle.stroke
            ..strokeCap = StrokeCap.round,
        );
        canvas.drawLine(
          Offset(w * 0.5, h * 0.56),
          Offset(w * 0.72, h * 0.34),
          Paint()
            ..color = palette.primary
            ..strokeWidth = 4
            ..strokeCap = StrokeCap.round,
        );
        canvas.drawCircle(Offset(w * 0.5, h * 0.56), 4.5, Paint()..color = palette.primary);
      case _BinaVectorKind.vfDots:
        for (var r = 0; r < 4; r += 1) {
          for (var c = 0; c < 4; c += 1) {
            final radius = (r == 1 && c == 2) ? 4.2 : 2.8;
            canvas.drawCircle(
              Offset(w * (0.2 + c * 0.2), h * (0.2 + r * 0.2)),
              radius,
              Paint()..color = (r + c).isEven ? palette.planInk : palette.primary,
            );
          }
        }
      case _BinaVectorKind.vrGoggles:
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromLTWH(w * 0.12, h * 0.28, w * 0.76, h * 0.44),
            Radius.circular(w * 0.12),
          ),
          Paint()
            ..color = palette.planInk
            ..style = PaintingStyle.stroke
            ..strokeWidth = 2.8,
        );
        canvas.drawCircle(Offset(w * 0.36, h * 0.5), w * 0.09, Paint()..color = palette.planInk);
        canvas.drawCircle(Offset(w * 0.64, h * 0.5), w * 0.09, Paint()..color = palette.planInk);
    }
  }

  @override
  bool shouldRepaint(covariant _BinaVectorPainter oldDelegate) =>
      oldDelegate.kind != kind || oldDelegate.palette != palette;
}
