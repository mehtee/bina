import 'package:bina_design_system/bina_design_system.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// SYS-05 `/system/update-required`: Incompatible API / forced update gate (`v2.1 §9.8`).
/// Preserves offline SOS help (`کمک فوری`) cleanly without fabricated app store links.
class RequiredUpdateScreen extends StatelessWidget {
  const RequiredUpdateScreen({
    super.key,
    this.minimumVersionLabel = 'نسخه جدید سازگار با سرور کلینیک',
  });

  final String minimumVersionLabel;

  @override
  Widget build(BuildContext context) {
    return BinaCanvas(
      artVariant: BinaCanvasArtVariant.none,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: BinaAppBar(
          title: 'نیاز به بروزرسانی برنامه',
          isRootTab: true,
          onUrgentHelp: () => context.push('/help/urgent'),
        ),
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsetsDirectional.all(BinaSpacing.marginCompact),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: BinaSpacing.readingMax),
                child: BinaFadeSlideIn(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: <Widget>[
                      BinaBanner(
                        kind: BinaStatusKind.warning,
                        title: 'نسخه فعلی نیاز به بروزرسانی دارد',
                        body:
                            'برای ادامه ثبت و همگام‌سازی ایمن اطلاعات با کلینیک، لازم است به $minimumVersionLabel بروزرسانی کنید. داده‌های آفلاین ثبت‌شده روی دستگاه حفظ می‌شوند.',
                      ),
                      const SizedBox(height: 16),
                      BinaUrgentButton(
                        label: 'کمک فوری و تماس با کلینیک',
                        onPressed: () => context.push('/help/urgent'),
                      ),
                    ],
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

/// SYS-06 `/system/permissions`: Permission denied recovery screen using [BinaPermissionPanel].
class PermissionDeniedScreen extends StatelessWidget {
  const PermissionDeniedScreen({
    super.key,
    this.permissionTitle = 'نیاز به مجوز دسترسی دستگاه',
    this.rationaleFa =
        'برای اندازه‌گیری فاصله یا نور محیط در آزمون بینایی خانگی یا ارسال یادآور داروها به این مجوز نیاز است.',
  });

  final String permissionTitle;
  final String rationaleFa;

  @override
  Widget build(BuildContext context) {
    return BinaCanvas(
      artVariant: BinaCanvasArtVariant.headerOnly,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: BinaAppBar(
          title: 'مدیریت مجوزها',
          isRootTab: false,
          onBack: () => context.pop(),
          onUrgentHelp: () => context.push('/help/urgent'),
        ),
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsetsDirectional.all(BinaSpacing.marginCompact),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: BinaSpacing.readingMax),
                child: BinaFadeSlideIn(
                  child: BinaPermissionPanel(
                    title: permissionTitle,
                    rationaleFa: rationaleFa,
                    privacyNoteFa:
                        'هیچ تصویر یا ویدیوی چهره ذخیره نمی‌شود و مجوز یادآور نیز بدون افشای نام دارو عمل می‌کند.',
                    actionLabel: 'بازگشت و بررسی مجدد',
                    onRequestPermission: () => context.pop(),
                    secondaryLabel: 'تماس با کلینیک / انجام حضوری',
                    onSecondary: () => context.push('/help/urgent'),
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
