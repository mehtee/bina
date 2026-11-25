import 'package:bina_design_system/bina_design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/providers.dart';

/// Interactive smooth 4-slide first-run onboarding (`/onboarding`).
/// Never blocks `/help/urgent`, respects `BinaBrand` and reduced motion (`v2.1 §8`).
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _pageIndex = 0;

  static const int _totalPages = 4;

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  Future<void> _finishOnboarding() async {
    await ref.read(onboardingCompletedProvider.notifier).markCompleted();
    if (!mounted) return;
    final session = ref.read(sessionProvider);
    context.go(session != null ? '/today' : '/auth/welcome');
  }

  void _nextPage() {
    if (_pageIndex + 1 >= _totalPages) {
      _finishOnboarding();
      return;
    }
    _pageController.animateToPage(
      _pageIndex + 1,
      duration: BinaMotion.resolve(context, BinaMotion.entrance),
      curve: BinaMotion.curveStandard,
    );
  }

  void _prevPage() {
    if (_pageIndex <= 0) return;
    _pageController.animateToPage(
      _pageIndex - 1,
      duration: BinaMotion.resolve(context, BinaMotion.entrance),
      curve: BinaMotion.curveStandard,
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    final themeMode = ref.watch(themeModeProvider);

    return BinaCanvas(
      artVariant: BinaCanvasArtVariant.headerOnly,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: BinaAppBar(
          title: BinaBrand.appNameFa,
          isRootTab: true,
          actions: <Widget>[
            TextButton(
              onPressed: _finishOnboarding,
              child: const Text('رد کردن'),
            ),
          ],
          onUrgentHelp: () => context.push('/help/urgent'),
        ),
        body: SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: BinaSpacing.readingMax),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(16, 8, 16, 8),
                    child: BinaStepHeader(
                      currentStep: _pageIndex + 1,
                      totalSteps: _totalPages,
                      titleFa: 'آشنایی سریع با ${BinaBrand.appNameFa}',
                    ),
                  ),
                  Expanded(
                    child: PageView(
                      controller: _pageController,
                      onPageChanged: (idx) => setState(() => _pageIndex = idx),
                      children: <Widget>[
                        _OnboardingSlide(
                          visual: BinaAnimatedScaleReveal(
                            child: Column(
                              children: <Widget>[
                                const BinaBrandMark(full: true, height: 48, announceSemanticBrand: true),
                                const SizedBox(height: 16),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(BinaRadii.hero),
                                  child: const BinaIrisArtwork(width: 196, height: 140),
                                ),
                              ],
                            ),
                          ),
                          title: BinaBrand.format('به {appName} خوش آمدید'),
                          body:
                              'همراه هوشمند مراقبت چشم‌پزشکی شما با کلینیک و پزشک معالج؛ تمام برنامه دارویی، پیام‌ها و تاریخ‌ها به فارسی و با تقویم شمسی ارائه می‌شوند.',
                        ),
                        const _OnboardingSlide(
                          visual: BinaAnimatedScaleReveal(
                            child: BinaSurface(
                              variant: BinaSurfaceVariant.hero,
                              child: Center(child: BinaVectorArt.dropper(size: 108)),
                            ),
                          ),
                          title: 'برنامه دقیق قطره‌ها برای هر چشم',
                          body:
                              'داروهای چشم راست (OD) و چشم چپ (OS) همیشه به‌صورت مجزا نمایش داده می‌شوند و ثبت مصرف حتی بدون اینترنت به‌طور ایمن روی دستگاه ذخیره می‌شود.',
                        ),
                        _OnboardingSlide(
                          visual: Container(
                            padding: const EdgeInsetsDirectional.all(20),
                            decoration: BoxDecoration(
                              color: p.errorBg,
                              borderRadius: BorderRadius.circular(BinaRadii.hero),
                              border: Border.all(color: p.error, width: 1.5),
                            ),
                            child: Icon(Icons.phone_in_talk_rounded, size: 72, color: p.urgentAction),
                          ),
                          title: 'دسترسی فوری و همیشگی به اورژانس',
                          body:
                              'در صورت درد شدید، کاهش ناگهانی دید یا ترشح غیرعادی، دکمه «کمک فوری» در بالای صفحات حتی در حالت آفلاین شماره تماس کلینیک و راهنمای اورژانس را نشان می‌دهد.',
                        ),
                        SingleChildScrollView(
                          padding: const EdgeInsetsDirectional.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: <Widget>[
                              const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: <Widget>[
                                  BinaVectorArt.iopGauge(size: 64),
                                  SizedBox(width: 24),
                                  BinaVectorArt.vfDots(size: 64),
                                ],
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'نتایج تاییدشده و آزمون‌های خانگی',
                                textAlign: TextAlign.center,
                                style: Theme.of(context).textTheme.headlineSmall,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'گزارش‌های تاییدشده پزشک و آزمون‌های کالیبره‌شده بینایی را دنبال کنید و ظاهر دلخواه برنامه را همین‌جا انتخاب کنید:',
                                textAlign: TextAlign.center,
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                      color: p.onSurfaceVariant,
                                    ),
                              ),
                              const SizedBox(height: 16),
                              BinaAppearancePicker(
                                mode: themeMode,
                                onChanged: (m) => ref.read(themeModeProvider.notifier).setMode(m),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(16, 8, 16, 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: <Widget>[
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: <Widget>[
                            for (var i = 0; i < _totalPages; i += 1)
                              AnimatedContainer(
                                duration: BinaMotion.resolve(context, BinaMotion.select),
                                margin: const EdgeInsets.symmetric(horizontal: 4),
                                width: i == _pageIndex ? 24 : 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: i == _pageIndex ? p.primary : p.outlineVariant,
                                  borderRadius: BorderRadius.circular(BinaRadii.pill),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        Row(
                          children: <Widget>[
                            if (_pageIndex > 0) ...<Widget>[
                              Expanded(
                                child: BinaSecondaryButton(
                                  label: 'قبلی',
                                  onPressed: _prevPage,
                                ),
                              ),
                              const SizedBox(width: 12),
                            ],
                            Expanded(
                              flex: 2,
                              child: BinaGradientButton(
                                label: _pageIndex + 1 == _totalPages ? 'شروع و ادامه' : 'بعدی',
                                icon: _pageIndex + 1 == _totalPages
                                    ? Icons.check_rounded
                                    : Icons.arrow_back_rounded,
                                onPressed: _nextPage,
                              ),
                            ),
                          ],
                        ),
                      ],
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

class _OnboardingSlide extends StatelessWidget {
  const _OnboardingSlide({
    required this.visual,
    required this.title,
    required this.body,
  });

  final Widget visual;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    return SingleChildScrollView(
      padding: const EdgeInsetsDirectional.all(20),
      child: BinaFadeSlideIn(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Center(child: visual),
            const SizedBox(height: 24),
            BinaSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  Text(
                    title,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    body,
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          color: p.onSurfaceVariant,
                          height: 1.7,
                        ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
