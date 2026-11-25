import 'package:flutter/material.dart';
import '../tokens/bina_palette.dart';
import '../tokens/bina_spacing.dart';
import 'bina_surfaces.dart';

/// Primary CTA button with G04 deep-teal gradient (`v2.1 §7.3`).
class BinaGradientButton extends StatelessWidget {
  const BinaGradientButton({
    super.key,
    required this.label,
    this.icon,
    required this.onPressed,
    this.busy = false,
    this.fullWidth = true,
  });

  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool busy;
  final bool fullWidth;

  @override
  Widget build(BuildContext context) {
    final sem = context.bina;
    final p = sem.palette;
    final enabled = onPressed != null && !busy;
    final radius = BorderRadius.circular(BinaRadii.xl);

    final content = Row(
      mainAxisSize: fullWidth ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: <Widget>[
        if (busy) ...<Widget>[
          SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(
              strokeWidth: 2.5,
              color: enabled ? p.onPrimaryGradient : p.disabledFg,
            ),
          ),
          const SizedBox(width: 10),
        ] else if (icon != null) ...<Widget>[
          Icon(icon, size: 22, color: enabled ? p.onPrimaryGradient : p.disabledFg),
          const SizedBox(width: 8),
        ],
        Flexible(
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  color: enabled ? p.onPrimaryGradient : p.disabledFg,
                ),
          ),
        ),
      ],
    );

    return Semantics(
      button: true,
      enabled: enabled,
      label: label,
      child: ConstrainedBox(
        constraints: const BoxConstraints(
          minHeight: BinaSpacing.buttonMin,
          minWidth: BinaSpacing.touchMin,
        ),
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: enabled ? sem.primaryButtonGradient : null,
            color: enabled ? null : p.disabledBg,
            borderRadius: radius,
            boxShadow: enabled ? sem.shadowAction : sem.shadowNone,
          ),
          child: ClipRRect(
            borderRadius: radius,
            child: Stack(
              children: <Widget>[
                if (enabled && !sem.highContrast)
                  Positioned(
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    child: ColoredBox(color: p.primaryShine.withValues(alpha: 0.40)),
                  ),
                Material(
                  type: MaterialType.transparency,
                  child: InkWell(
                    onTap: enabled ? onPressed : null,
                    borderRadius: radius,
                    child: Padding(
                      padding: const EdgeInsetsDirectional.symmetric(horizontal: 16, vertical: 14),
                      child: Center(widthFactor: fullWidth ? null : 1.0, child: content),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Secondary outline button with identical 56dp height rhythm (`v2.1 §7`).
class BinaSecondaryButton extends StatelessWidget {
  const BinaSecondaryButton({
    super.key,
    required this.label,
    this.icon,
    required this.onPressed,
    this.fullWidth = true,
  });

  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool fullWidth;

  @override
  Widget build(BuildContext context) {
    final child = icon != null
        ? OutlinedButton.icon(onPressed: onPressed, icon: Icon(icon), label: Text(label))
        : OutlinedButton(onPressed: onPressed, child: Text(label));
    return fullWidth ? SizedBox(width: double.infinity, child: child) : child;
  }
}

/// High-priority urgent call button (`v2.1 §7`). Preferred 64dp height, static (no pulse).
class BinaUrgentButton extends StatelessWidget {
  const BinaUrgentButton({
    super.key,
    required this.label,
    this.icon = Icons.phone_in_talk_rounded,
    required this.onPressed,
  });

  final String label;
  final IconData icon;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    return SizedBox(
      width: double.infinity,
      child: FilledButton.icon(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          minimumSize: const Size(BinaSpacing.touchMin, BinaSpacing.urgentTouchMin),
          backgroundColor: p.urgentAction,
          foregroundColor: p.onUrgentAction,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(BinaRadii.xl)),
        ),
        icon: Icon(icon, size: 24),
        label: Text(label),
      ),
    );
  }
}

/// G02 track with G05 active pill segmented control (`v2.1 §7.3`).
class BinaSegments<T> extends StatelessWidget {
  const BinaSegments({
    super.key,
    required this.choices,
    required this.selected,
    required this.onChanged,
  });

  final Map<T, String> choices;
  final T selected;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    final sem = context.bina;
    final p = sem.palette;
    final textScale = MediaQuery.textScalerOf(context).scale(16);
    final entries = choices.entries.toList(growable: false);

    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: sem.frostedGradient,
        borderRadius: BorderRadius.circular(textScale >= 24 ? BinaRadii.xl : BinaRadii.pill),
        border: Border.all(color: sem.cardStrokeColor, width: sem.cardStrokeWidth),
        boxShadow: sem.shadowCard,
      ),
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final useColumn = constraints.maxWidth < 300 || textScale >= 24;
            final children = <Widget>[
              for (final entry in entries)
                _SegmentButton(
                  label: entry.value,
                  isSelected: entry.key == selected,
                  onTap: () => onChanged(entry.key),
                  p: p,
                  sem: sem,
                ),
            ];
            if (useColumn) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: children,
              );
            }
            return Row(
              children: <Widget>[
                for (final child in children) Expanded(child: child),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _SegmentButton extends StatelessWidget {
  const _SegmentButton({
    required this.label,
    required this.isSelected,
    required this.onTap,
    required this.p,
    required this.sem,
  });

  final String label;
  final bool isSelected;
  final VoidCallback onTap;
  final BinaPalette p;
  final BinaSemanticColors sem;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: isSelected,
      label: label,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 44),
        child: AnimatedContainer(
          duration: BinaMotion.resolve(context, BinaMotion.select),
          curve: BinaMotion.curveStandard,
          decoration: BoxDecoration(
            gradient: isSelected ? sem.primaryButtonGradient : null,
            borderRadius: BorderRadius.circular(BinaRadii.pill),
          ),
          child: Material(
            type: MaterialType.transparency,
            child: InkWell(
              onTap: onTap,
              borderRadius: BorderRadius.circular(BinaRadii.pill),
              child: Padding(
                padding: const EdgeInsetsDirectional.symmetric(horizontal: 10, vertical: 10),
                child: Center(
                  child: Text(
                    label,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.labelMedium?.copyWith(
                          color: isSelected ? p.onPrimaryGradient : p.onSurface,
                        ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Persistent-label input field (`v2.1 §7`). Never relies on placeholder alone.
class BinaField extends StatelessWidget {
  const BinaField({
    super.key,
    required this.controller,
    required this.labelText,
    this.hintText,
    this.helperText,
    this.errorText,
    this.keyboardType,
    this.textDirection,
    this.maxLength,
    this.maxLines = 1,
    this.onChanged,
  });

  final TextEditingController controller;
  final String labelText;
  final String? hintText;
  final String? helperText;
  final String? errorText;
  final TextInputType? keyboardType;
  final TextDirection? textDirection;
  final int? maxLength;
  final int maxLines;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      textDirection: textDirection,
      maxLength: maxLength,
      maxLines: maxLines,
      onChanged: onChanged,
      style: Theme.of(context).textTheme.bodyLarge,
      decoration: InputDecoration(
        labelText: labelText,
        hintText: hintText,
        helperText: helperText,
        errorText: errorText,
        errorMaxLines: 2,
      ),
    );
  }
}

/// Single accessible OTP entry supporting paste and OS autofill (`v2.1 §7`).
class BinaOtpField extends StatelessWidget {
  const BinaOtpField({
    super.key,
    required this.controller,
    this.labelText = 'کد تایید',
    this.errorText,
    this.onChanged,
  });

  final TextEditingController controller;
  final String labelText;
  final String? errorText;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      keyboardType: TextInputType.number,
      textDirection: TextDirection.ltr,
      textAlign: TextAlign.center,
      maxLength: 6,
      autofillHints: const <String>[AutofillHints.oneTimeCode],
      onChanged: onChanged,
      style: Theme.of(context).textTheme.headlineSmall?.copyWith(letterSpacing: 6),
      decoration: InputDecoration(
        labelText: labelText,
        hintText: '------',
        counterText: '',
        errorText: errorText,
      ),
    );
  }
}

/// Explicit eye laterality badge (`چشم راست` / `چشم چپ` — never `OD`/`OS` alone).
class BinaEyeLabel extends StatelessWidget {
  const BinaEyeLabel({
    super.key,
    required this.eyeCode,
    required this.fullPersianLabel,
  });

  final String eyeCode;
  final String fullPersianLabel;

  @override
  Widget build(BuildContext context) {
    return BinaStatusChip(
      kind: eyeCode == 'OD' ? BinaStatusKind.info : BinaStatusKind.neutral,
      icon: Icons.visibility_outlined,
      text: fullPersianLabel,
    );
  }
}

/// Persistent contextual banner (`v2.1 §7`).
class BinaBanner extends StatelessWidget {
  const BinaBanner({
    super.key,
    required this.kind,
    required this.title,
    required this.body,
    this.actionLabel,
    this.onAction,
  });

  final BinaStatusKind kind;
  final String title;
  final String body;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    final (Color bg, Color fg, IconData icon) = switch (kind) {
      BinaStatusKind.success => (p.successBg, p.success, Icons.check_circle_outline_rounded),
      BinaStatusKind.warning => (p.warningBg, p.warning, Icons.cloud_off_rounded),
      BinaStatusKind.error => (p.errorBg, p.error, Icons.error_outline_rounded),
      BinaStatusKind.info => (p.infoBg, p.info, Icons.info_outline_rounded),
      BinaStatusKind.neutral => (p.neutralBg, p.neutral, Icons.info_outline_rounded),
    };

    return Container(
      padding: const EdgeInsetsDirectional.all(14),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(BinaRadii.large),
        border: Border.all(color: fg.withValues(alpha: 0.45), width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Row(
            children: <Widget>[
              Icon(icon, color: fg, size: 22),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(color: fg),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(body, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: p.onSurface)),
          if (actionLabel != null && onAction != null) ...<Widget>[
            const SizedBox(height: 10),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: OutlinedButton(onPressed: onAction, child: Text(actionLabel!)),
            ),
          ],
        ],
      ),
    );
  }
}

/// Non-dismissible urgent clinical guidance card (`v2.1 §7 & §9.4 SOS-08`).
class BinaUrgentActionCard extends StatelessWidget {
  const BinaUrgentActionCard({
    super.key,
    required this.title,
    required this.body,
    required this.ctaLabel,
    required this.onCallPressed,
  });

  final String title;
  final String body;
  final String ctaLabel;
  final VoidCallback onCallPressed;

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsetsDirectional.all(16),
        decoration: BoxDecoration(
          color: p.errorBg,
          borderRadius: BorderRadius.circular(BinaRadii.xl),
          border: Border.all(color: p.error, width: 2),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Row(
              children: <Widget>[
                Icon(Icons.emergency_rounded, color: p.error, size: 26),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    title,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(color: p.error),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(body, style: Theme.of(context).textTheme.bodyLarge),
            const SizedBox(height: 12),
            BinaUrgentButton(label: ctaLabel, onPressed: onCallPressed),
          ],
        ),
      ),
    );
  }
}

/// Persistent caregiver delegation banner (`v2.1 §9.5 & §7`).
class BinaContextBanner extends StatelessWidget {
  const BinaContextBanner({
    super.key,
    required this.patientNameFa,
    this.onSwitchPatient,
  });

  final String patientNameFa;
  final VoidCallback? onSwitchPatient;

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    return Container(
      padding: const EdgeInsetsDirectional.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: p.infoBg,
        borderRadius: BorderRadius.circular(BinaRadii.large),
        border: Border.all(color: p.info.withValues(alpha: 0.45)),
      ),
      child: Row(
        children: <Widget>[
          Icon(Icons.supervisor_account_outlined, color: p.info),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'در حال مراقبت از: $patientNameFa',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(color: p.info),
            ),
          ),
          if (onSwitchPatient != null)
            TextButton(
              onPressed: onSwitchPatient,
              child: const Text('تغییر بیمار'),
            ),
        ],
      ),
    );
  }
}

class BinaOfflineBanner extends StatelessWidget {
  const BinaOfflineBanner({
    super.key,
    this.lastUpdatedLabel,
    this.onRetry,
  });

  final String? lastUpdatedLabel;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final body = lastUpdatedLabel == null
        ? 'اتصال به سرور برقرار نیست. اطلاعات ذخیره‌شده و کمک فوری در دسترس هستند.'
        : 'اتصال برقرار نیست (آخرین بروزرسانی: $lastUpdatedLabel). ثبت‌ها روی دستگاه ذخیره و پس از اتصال همگام می‌شوند.';
    return BinaBanner(
      kind: BinaStatusKind.warning,
      title: 'حالت آفلاین',
      body: body,
      actionLabel: onRetry != null ? 'تلاش دوباره' : null,
      onAction: onRetry,
    );
  }
}

class BinaSyncBanner extends StatelessWidget {
  const BinaSyncBanner({
    super.key,
    required this.pendingCount,
    this.onOpenSync,
  });

  final int pendingCount;
  final VoidCallback? onOpenSync;

  @override
  Widget build(BuildContext context) {
    if (pendingCount <= 0) return const SizedBox.shrink();
    return BinaBanner(
      kind: BinaStatusKind.warning,
      title: 'در انتظار ارسال ($pendingCount مورد)',
      body: 'این ثبت‌ها به‌صورت ایمن روی دستگاه ذخیره شده‌اند و پس از اتصال به سرور ارسال می‌شوند.',
      actionLabel: onOpenSync != null ? 'وضعیت همگام‌سازی' : null,
      onAction: onOpenSync,
    );
  }
}

class BinaReceipt extends StatelessWidget {
  const BinaReceipt({
    super.key,
    required this.isServerConfirmed,
    required this.statusLabel,
    required this.detailText,
    this.timestampLabel,
  });

  final bool isServerConfirmed;
  final String statusLabel;
  final String detailText;
  final String? timestampLabel;

  @override
  Widget build(BuildContext context) {
    return BinaBanner(
      kind: isServerConfirmed ? BinaStatusKind.success : BinaStatusKind.warning,
      title: statusLabel,
      body: timestampLabel == null ? detailText : '$detailText\nزمان: $timestampLabel',
    );
  }
}

class BinaEmptyState extends StatelessWidget {
  const BinaEmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    return BinaSurface(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          BinaIconWell(kind: BinaWellKind.neutral, icon: icon, size: BinaSpacing.iconWellLarge),
          const SizedBox(height: 12),
          Text(title, style: Theme.of(context).textTheme.titleLarge, textAlign: TextAlign.center),
          const SizedBox(height: 8),
          Text(
            message,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: p.onSurfaceVariant),
            textAlign: TextAlign.center,
          ),
          if (actionLabel != null && onAction != null) ...<Widget>[
            const SizedBox(height: 16),
            BinaSecondaryButton(label: actionLabel!, onPressed: onAction, fullWidth: false),
          ],
        ],
      ),
    );
  }
}

class BinaErrorState extends StatelessWidget {
  const BinaErrorState({
    super.key,
    required this.message,
    this.onRetry,
    this.onOpenHelp,
  });

  final String message;
  final VoidCallback? onRetry;
  final VoidCallback? onOpenHelp;

  @override
  Widget build(BuildContext context) {
    return BinaBanner(
      kind: BinaStatusKind.error,
      title: 'امکان دریافت اطلاعات فراهم نشد',
      body: message,
      actionLabel: onRetry != null ? 'تلاش دوباره' : (onOpenHelp != null ? 'کمک فوری' : null),
      onAction: onRetry ?? onOpenHelp,
    );
  }
}

/// Appearance picker (`System` / `Light` / `Dark`) per `v2.1 §7.3 & §9.8`.
class BinaAppearancePicker extends StatelessWidget {
  const BinaAppearancePicker({
    super.key,
    required this.mode,
    required this.onChanged,
  });

  final ThemeMode mode;
  final ValueChanged<ThemeMode> onChanged;

  @override
  Widget build(BuildContext context) {
    return BinaSurface(
      padding: const EdgeInsetsDirectional.symmetric(vertical: 8, horizontal: 4),
      child: RadioGroup<ThemeMode>(
        groupValue: mode,
        onChanged: (val) {
          if (val != null) onChanged(val);
        },
        child: const Column(
          children: <Widget>[
            RadioListTile<ThemeMode>(
              value: ThemeMode.system,
              title: Text('مطابق تنظیم دستگاه'),
            ),
            RadioListTile<ThemeMode>(
              value: ThemeMode.light,
              title: Text('روشن (روز)'),
            ),
            RadioListTile<ThemeMode>(
              value: ThemeMode.dark,
              title: Text('تیره (شب)'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Static data-only sparkline (`v2.1 §7.3 & §11.1`). Never invents data or animates.
class BinaSparkline extends StatelessWidget {
  const BinaSparkline({
    super.key,
    required this.samples,
    required this.semanticLabel,
    this.width = 76,
    this.height = 28,
  });

  final List<double> samples;
  final String semanticLabel;
  final double width;
  final double height;

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    return Semantics(
      label: semanticLabel,
      child: SizedBox(
        width: width,
        height: height,
        child: CustomPaint(
          painter: _SparklinePainter(samples: samples, color: p.chart1),
        ),
      ),
    );
  }
}

class _SparklinePainter extends CustomPainter {
  _SparklinePainter({required this.samples, required this.color});
  final List<double> samples;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    if (samples.length < 2) return;
    var minV = samples.first;
    var maxV = samples.first;
    for (final v in samples) {
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
    final range = (maxV - minV).abs() < 1e-6 ? 1.0 : (maxV - minV);
    final path = Path();
    final paint = Paint()
      ..color = color
      ..strokeWidth = 2.8
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    for (var i = 0; i < samples.length; i += 1) {
      final x = (i / (samples.length - 1)) * (size.width - 8) + 4;
      final norm = (samples[i] - minV) / range;
      final y = size.height - 4 - norm * (size.height - 8);
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    canvas.drawPath(path, paint);
    final lastX = size.width - 4;
    final lastNorm = (samples.last - minV) / range;
    final lastY = size.height - 4 - lastNorm * (size.height - 8);
    canvas.drawCircle(Offset(lastX, lastY), 3.5, Paint()..color = color);
  }

  @override
  bool shouldRepaint(covariant _SparklinePainter oldDelegate) =>
      oldDelegate.samples != samples || oldDelegate.color != color;
}

/// User-controlled education audio bar without autoplay (`v2.1 §7 & §9.3`).
class BinaAudioPlayer extends StatelessWidget {
  const BinaAudioPlayer({
    super.key,
    required this.title,
    required this.playing,
    required this.onTogglePlay,
  });

  final String title;
  final bool playing;
  final VoidCallback onTogglePlay;

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    return BinaSurface(
      padding: const EdgeInsetsDirectional.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        children: <Widget>[
          IconButton(
            onPressed: onTogglePlay,
            tooltip: playing ? 'توقف صوت' : 'پخش صوت',
            icon: Icon(
              playing ? Icons.pause_circle_filled_rounded : Icons.play_circle_filled_rounded,
              color: p.primary,
              size: 36,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(title, style: Theme.of(context).textTheme.titleSmall),
                Text(
                  playing ? 'در حال پخش...' : 'پخش صوتی اختیاری (متن کامل زیر موجود است)',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Accessible confirmation dialog helper (`v2.1 §7 & §9.8 SYS-07`).
Future<bool> showBinaConfirmDialog(
  BuildContext context, {
  required String title,
  required String message,
  required String confirmLabel,
  String cancelLabel = 'انصراف',
  bool destructive = false,
}) async {
  final p = context.binaPalette;
  final result = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: Text(message),
      actions: <Widget>[
        TextButton(
          onPressed: () => Navigator.of(ctx).pop(false),
          child: Text(cancelLabel),
        ),
        FilledButton(
          style: destructive
              ? FilledButton.styleFrom(backgroundColor: p.urgentAction, foregroundColor: p.onUrgentAction)
              : null,
          onPressed: () => Navigator.of(ctx).pop(true),
          child: Text(confirmLabel),
        ),
      ],
    ),
  );
  return result ?? false;
}
