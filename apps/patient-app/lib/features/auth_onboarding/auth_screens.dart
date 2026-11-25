import 'package:bina_design_system/bina_design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/providers.dart';
import '../../core/i18n/bina_i18n.dart';
import 'auth_controller.dart';

/// AUTH-01 `/bootstrap` — resolves session immediately with zero artificial delay.
class BootstrapScreen extends ConsumerStatefulWidget {
  const BootstrapScreen({super.key});

  @override
  ConsumerState<BootstrapScreen> createState() => _BootstrapScreenState();
}

class _BootstrapScreenState extends ConsumerState<BootstrapScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final session = ref.read(sessionProvider);
      context.go(session != null ? '/today' : '/auth/welcome');
    });
  }

  @override
  Widget build(BuildContext context) {
    return const BinaCanvas(
      artVariant: BinaCanvasArtVariant.none,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              BinaBrandMark(full: false, height: 64, announceSemanticBrand: true),
              SizedBox(height: 16),
              Text('در حال آماده‌سازی برنامه...'),
            ],
          ),
        ),
      ),
    );
  }
}

/// Shared clean layout container for AUTH routes (`v2.1 §9.0A V10`).
class _AuthPageScaffold extends StatelessWidget {
  const _AuthPageScaffold({
    required this.title,
    required this.child,
    this.showBack = true,
  });

  final String title;
  final Widget child;
  final bool showBack;

  @override
  Widget build(BuildContext context) {
    return BinaCanvas(
      artVariant: BinaCanvasArtVariant.headerOnly,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: BinaAppBar(
          title: title,
          isRootTab: !showBack,
          onBack: showBack ? () => context.pop() : null,
          onUrgentHelp: () => context.push('/help/urgent'),
        ),
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsetsDirectional.all(BinaSpacing.marginCompact),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: BinaSpacing.readingMax),
                child: child,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// AUTH-02 `/auth/welcome`
class WelcomeScreen extends ConsumerWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(appConfigProvider);
    return _AuthPageScaffold(
      title: BinaBrand.appNameFa,
      showBack: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          const Align(
            alignment: AlignmentDirectional.centerStart,
            child: BinaBrandMark(full: true, height: 48, announceSemanticBrand: true),
          ),
          const SizedBox(height: 20),
          BinaHero(
            title: BinaBrand.format('به {appName} خوش آمدید'),
            subtitle:
                'برنامه مراقبت چشمی شما توسط کلینیک و پزشک معالج صادر می‌شود. تمام پیام‌ها و زمان‌های مصرف دارو به فارسی و با تقویم شمسی نمایش داده می‌شوند.',
          ),
          const SizedBox(height: 20),
          BinaGradientButton(
            label: 'ورود با شماره موبایل',
            icon: Icons.login_rounded,
            onPressed: () => context.push('/auth/phone'),
          ),
          const SizedBox(height: 12),
          BinaSecondaryButton(
            label: 'راهنمای ورود و دسترسی',
            icon: Icons.help_outline_rounded,
            onPressed: () => context.push('/auth/help'),
          ),
          const SizedBox(height: 12),
          BinaSecondaryButton(
            label: 'استعلام دعوت‌نامه کلینیک',
            icon: Icons.local_hospital_outlined,
            onPressed: () => context.push('/auth/invitation'),
          ),
          if (config.enablePreviewHarness) ...<Widget>[
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => context.push('/__preview'),
              child: const Text('پیش‌نمایش طراحی V01–V09'),
            ),
          ],
        ],
      ),
    );
  }
}

/// AUTH-03 `/auth/invitation`
class InvitationScreen extends StatelessWidget {
  const InvitationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return _AuthPageScaffold(
      title: 'دعوت‌نامه کلینیک',
      child: BinaSurface(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Text('فعال‌سازی مراقبت از طریق کلینیک', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 10),
            const Text(
              'برای امنیت شما، پرونده و برنامه دارو تنها پس از تایید پیامکی کلینیک فعال می‌شوند و چشم درمان‌شده از روی لینک حدس زده نمی‌شود.',
            ),
            const SizedBox(height: 16),
            BinaGradientButton(
              label: 'ادامه با شماره موبایل ثبت‌شده',
              onPressed: () => context.push('/auth/phone'),
            ),
          ],
        ),
      ),
    );
  }
}

/// AUTH-04 `/auth/phone`
class PhoneEntryScreen extends ConsumerStatefulWidget {
  const PhoneEntryScreen({super.key});

  @override
  ConsumerState<PhoneEntryScreen> createState() => _PhoneEntryScreenState();
}

class _PhoneEntryScreenState extends ConsumerState<PhoneEntryScreen> {
  final TextEditingController _phoneCtrl = TextEditingController();

  @override
  void dispose() {
    _phoneCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final ok = await ref.read(authControllerProvider.notifier).requestOtp(_phoneCtrl.text);
    if (ok && mounted) {
      context.push('/auth/otp');
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(authControllerProvider);
    return _AuthPageScaffold(
      title: 'ورود',
      child: BinaSurface(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Text('شماره موبایل خود را وارد کنید', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 6),
            Text(
              'شماره موبایل ایران با پیش‌شماره \u2066+98\u2069 یا ۰۹ پشتیبانی می‌شود.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            BinaField(
              controller: _phoneCtrl,
              labelText: 'شماره موبایل',
              hintText: '09123456789',
              helperText: 'می‌توانید با کیبورد فارسی یا انگلیسی وارد کنید.',
              keyboardType: TextInputType.phone,
              textDirection: TextDirection.ltr,
              onChanged: (_) => ref.read(authControllerProvider.notifier).clearError(),
            ),
            const SizedBox(height: 12),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('ورود به‌عنوان همراه بیمار'),
              subtitle: const Text('در صورت دریافت مجوز دسترسی از بیمار'),
              value: state.isCaregiverMode,
              onChanged: (val) => ref.read(authControllerProvider.notifier).setCaregiverMode(val),
            ),
            if (state.errorMessageFa != null) ...<Widget>[
              const SizedBox(height: 12),
              BinaBanner(
                kind: BinaStatusKind.error,
                title: 'خطا در شماره موبایل',
                body: state.errorMessageFa!,
              ),
            ],
            const SizedBox(height: 20),
            BinaGradientButton(
              label: 'دریافت کد ورود',
              busy: state.busy,
              onPressed: _submit,
            ),
          ],
        ),
      ),
    );
  }
}

/// AUTH-05 `/auth/otp`
class OtpVerifyScreen extends ConsumerStatefulWidget {
  const OtpVerifyScreen({super.key});

  @override
  ConsumerState<OtpVerifyScreen> createState() => _OtpVerifyScreenState();
}

class _OtpVerifyScreenState extends ConsumerState<OtpVerifyScreen> {
  final TextEditingController _otpCtrl = TextEditingController();

  @override
  void dispose() {
    _otpCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final nextRoute = await ref.read(authControllerProvider.notifier).submitOtp(_otpCtrl.text);
    if (nextRoute != null && mounted) {
      context.go(nextRoute);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(authControllerProvider);
    final destText = state.maskedPhone.isEmpty
        ? 'شماره موبایل ثبت‌شده'
        : BinaI18nCatalog.isolateLtr(state.maskedPhone);

    return _AuthPageScaffold(
      title: 'کد تایید پیامکی',
      child: BinaSurface(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Text(
              'کد ارسال‌شده به $destText را وارد کنید.',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 16),
            BinaOtpField(
              controller: _otpCtrl,
              onChanged: (_) => ref.read(authControllerProvider.notifier).clearError(),
            ),
            if (state.errorMessageFa != null) ...<Widget>[
              const SizedBox(height: 12),
              BinaBanner(
                kind: BinaStatusKind.error,
                title: 'کد تایید نامعتبر',
                body: state.errorMessageFa!,
              ),
            ],
            const SizedBox(height: 16),
            BinaGradientButton(
              label: 'ادامه',
              busy: state.busy,
              onPressed: _submit,
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: <Widget>[
                TextButton(
                  onPressed: () => context.pop(),
                  child: const Text('تغییر شماره'),
                ),
                TextButton(
                  onPressed: state.phoneE164.isEmpty || state.busy
                      ? null
                      : () => ref.read(authControllerProvider.notifier).requestOtp(state.phoneE164),
                  child: const Text('ارسال مجدد کد'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// AUTH-06 `/auth/consent` — explicit non-prechecked Persian clinical consent.
class ConsentScreen extends ConsumerWidget {
  const ConsentScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(authControllerProvider);

    Future<void> confirm() async {
      final ok = await ref.read(authControllerProvider.notifier).completePatientConsentAndVerify();
      if (ok && context.mounted) {
        context.go('/auth/accessibility');
      }
    }

    return _AuthPageScaffold(
      title: 'رضایت‌نامه آگاهانه',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          BinaSurface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Text(
                  BinaBrand.format('شرایط استفاده و حریم خصوصی {appName} (نسخه ${state.consentVersion})'),
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 12),
                const Text(
                  '۱. این سامانه ابزار همراه مراقبت چشم‌پزشکی کلینیک است و جایگزین معاینه حضوری یا اورژانس نمی‌شود.\n'
                  '۲. در صورت درد شدید، کاهش ناگهانی دید یا ترشح چرکی باید فوراً با اورژانس کلینیک تماس بگیرید.\n'
                  '۳. داده‌های شما در کشور نگهداری شده و با دسترسی محدود فقط برای کادر درمان کلینیک شما نمایش داده می‌شوند.',
                ),
                const SizedBox(height: 12),
                CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  value: state.consentAccepted,
                  onChanged: (val) =>
                      ref.read(authControllerProvider.notifier).setConsentAccepted(val ?? false),
                  title: Text(
                    BinaBrand.format('رضایت‌نامه فارسی مراقبت چشمی {appName} را مطالعه کرده و می‌پذیرم.'),
                  ),
                ),
              ],
            ),
          ),
          if (state.errorMessageFa != null) ...<Widget>[
            const SizedBox(height: 12),
            BinaBanner(
              kind: BinaStatusKind.error,
              title: 'عدم امکان تکمیل ورود',
              body: state.errorMessageFa!,
            ),
          ],
          const SizedBox(height: 16),
          BinaGradientButton(
            label: 'تایید و ورود',
            busy: state.busy,
            onPressed: state.consentAccepted ? confirm : null,
          ),
        ],
      ),
    );
  }
}

/// AUTH-07 `/auth/accessibility`
class AccessibilitySetupScreen extends ConsumerWidget {
  const AccessibilitySetupScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final highContrast = ref.watch(highContrastProvider);

    return _AuthPageScaffold(
      title: 'تنظیمات نمایش و خوانایی',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text('ظاهر برنامه را انتخاب کنید', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 10),
          BinaAppearancePicker(
            mode: themeMode,
            onChanged: (m) => ref.read(themeModeProvider.notifier).setMode(m),
          ),
          const SizedBox(height: 12),
          BinaSwitchRow(
            title: 'حالت کنتراست بالا',
            subtitle: 'افزایش وضوح لبه‌ها و حذف شیشه‌ای‌بودن پس‌زمینه',
            icon: Icons.contrast_rounded,
            wellKind: BinaWellKind.profile,
            value: highContrast,
            onChanged: (v) => ref.read(highContrastProvider.notifier).setEnabled(v),
          ),
          const SizedBox(height: 12),
          BinaSurface(
            child: Text(
              'نمونه متن خوانا: قطره چشم راست — ساعت ۱۴:۰۰',
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ),
          const SizedBox(height: 20),
          BinaGradientButton(
            label: 'ادامه به برنامه امروز',
            onPressed: () => context.go('/today'),
          ),
        ],
      ),
    );
  }
}

/// AUTH-08 `/auth/help`
class AuthHelpScreen extends StatelessWidget {
  const AuthHelpScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return _AuthPageScaffold(
      title: 'راهنمای ورود',
      child: BinaSurface(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Text('کمک برای ورود به حساب', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 10),
            const Text(
              'شماره موبایل خود را همان‌طور که در پذیرش کلینیک ثبت کرده‌اید وارد کنید. در صورت تغییر شماره یا دریافت نکردن پیامک، با کلینیک تماس بگیرید.',
            ),
            const SizedBox(height: 16),
            BinaUrgentButton(
              label: 'مشاهده اطلاعات تماس کلینیک و اورژانس',
              onPressed: () => context.push('/help/urgent'),
            ),
          ],
        ),
      ),
    );
  }
}

/// AUTH-09 `/auth/session-expired`
class SessionExpiredScreen extends StatelessWidget {
  const SessionExpiredScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return _AuthPageScaffold(
      title: 'پایان نشست',
      showBack: false,
      child: BinaSurface(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Text('برای ادامه دوباره وارد شوید', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 10),
            const Text('نشست امنیتی شما منقضی شده است. ثبت‌های آفلاین ذخیره شده حفظ می‌شوند.'),
            const SizedBox(height: 16),
            BinaGradientButton(
              label: 'ورود مجدد',
              onPressed: () => context.go('/auth/phone'),
            ),
          ],
        ),
      ),
    );
  }
}
