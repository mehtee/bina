import 'package:bina_api_dtos/bina_api_dtos.dart';
import 'package:bina_design_system/bina_design_system.dart';
import 'package:bina_offline_store/bina_offline_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/providers.dart';
import '../../core/i18n/bina_i18n.dart';

/// Shared detail scaffold for `/account/*` pages (`v2.1 §9.0A V10 & §9.8`).
class AccountSubpageScaffold extends StatelessWidget {
  const AccountSubpageScaffold({
    super.key,
    required this.title,
    required this.child,
  });

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return BinaCanvas(
      artVariant: BinaCanvasArtVariant.headerOnly,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: BinaAppBar(
          title: title,
          isRootTab: false,
          onBack: () => context.pop(),
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

/// ACC-01 `/account` (V09 `09-My-Account.png`).
class AccountScreen extends ConsumerWidget {
  const AccountScreen({
    super.key,
    this.previewMode = false,
  });

  final bool previewMode;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final isCaregiver = !previewMode && session?.actorType == 'caregiver';
    final displayName = previewMode
        ? 'مهدی احمدی'
        : (isCaregiver ? 'همراه بیمار' : 'بیمار محترم');
    final rawId = session?.patientId ?? '---';
    final shortId = rawId.length > 8 ? rawId.substring(0, 8) : rawId;
    final idSubtitle = previewMode
        ? 'شناسه بیمار: \u2066PT-1042\u2069'
        : 'کد پرونده: \u2066$shortId\u2069';

    return BinaCanvas(
      artVariant: BinaCanvasArtVariant.headerOnly,
      child: ListView(
        padding: const EdgeInsetsDirectional.fromSTEB(16, 12, 16, 24),
        children: <Widget>[
          if (!previewMode)
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: TextButton.icon(
                onPressed: () => context.push('/help/urgent'),
                icon: Icon(Icons.phone_in_talk_rounded, color: context.binaPalette.urgentAction),
                label: Text(
                  'کمک فوری',
                  style: TextStyle(color: context.binaPalette.urgentAction),
                ),
              ),
            ),
          BinaSurface(
            variant: BinaSurfaceVariant.hero,
            padding: EdgeInsets.zero,
            child: Directionality(
              textDirection: TextDirection.ltr,
              child: Row(
                children: <Widget>[
                  const ClipRRect(
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(BinaRadii.hero),
                      bottomLeft: Radius.circular(BinaRadii.hero),
                    ),
                    child: BinaIrisArtwork(width: 140, height: 144),
                  ),
                  Expanded(
                    child: Directionality(
                      textDirection: TextDirection.rtl,
                      child: Padding(
                        padding: const EdgeInsetsDirectional.all(14),
                        child: Row(
                          children: <Widget>[
                            BinaAvatar(
                              size: 68,
                              initials: previewMode ? 'م' : 'ب',
                              verified: previewMode,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: <Widget>[
                                  Text(displayName, style: Theme.of(context).textTheme.headlineSmall),
                                  const SizedBox(height: 4),
                                  Text(
                                    idSubtitle,
                                    style: Theme.of(context).textTheme.bodySmall,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          BinaRichRow(
            title: 'اطلاعات شخصی',
            wellKind: BinaWellKind.profile,
            icon: Icons.person_outline_rounded,
            minHeight: 62,
            wellSize: 42,
            onTap: previewMode ? () {} : () => context.push('/account/profile'),
          ),
          const SizedBox(height: 10),
          if (!isCaregiver) ...<Widget>[
            BinaRichRow(
              title: 'همراه (مراقب)',
              wellKind: BinaWellKind.test,
              icon: Icons.group_outlined,
              minHeight: 62,
              wellSize: 42,
              onTap: previewMode ? () {} : () => context.push('/account/caregivers'),
            ),
            const SizedBox(height: 10),
          ] else ...<Widget>[
            BinaRichRow(
              title: 'تغییر بیمار تحت مراقبت',
              wellKind: BinaWellKind.test,
              icon: Icons.switch_account_outlined,
              minHeight: 62,
              wellSize: 42,
              onTap: () => context.push('/caregiver/patients'),
            ),
            const SizedBox(height: 10),
          ],
          BinaRichRow(
            title: 'تنظیمات',
            wellKind: BinaWellKind.test,
            icon: Icons.settings_outlined,
            minHeight: 62,
            wellSize: 42,
            onTap: previewMode ? () {} : () => context.push('/account/settings'),
          ),
          const SizedBox(height: 10),
          BinaRichRow(
            title: 'اعلان‌ها و یادآورها',
            wellKind: BinaWellKind.medication,
            icon: Icons.notifications_none_rounded,
            minHeight: 62,
            wellSize: 42,
            onTap: previewMode ? () {} : () => context.push('/account/notifications'),
          ),
          const SizedBox(height: 10),
          BinaRichRow(
            title: 'امنیت و حریم خصوصی',
            wellKind: BinaWellKind.profile,
            icon: Icons.verified_user_outlined,
            minHeight: 62,
            wellSize: 42,
            onTap: previewMode ? () {} : () => context.push('/account/consents'),
          ),
          const SizedBox(height: 10),
          BinaRichRow(
            title: 'درباره برنامه',
            wellKind: BinaWellKind.plan,
            icon: Icons.info_outline_rounded,
            minHeight: 62,
            wellSize: 42,
            onTap: previewMode ? () {} : () => context.push('/account/help'),
          ),
          if (!previewMode) ...<Widget>[
            const SizedBox(height: 16),
            BinaRichRow(
              title: 'وضعیت همگام‌سازی و اطلاعات کلینیک',
              subtitle: 'صف آفلاین و ساعات کاری کلینیک',
              wellKind: BinaWellKind.neutral,
              icon: Icons.sync_rounded,
              minHeight: 64,
              wellSize: 42,
              onTap: () => context.push('/account/sync'),
            ),
            const SizedBox(height: 12),
            BinaSecondaryButton(
              label: 'خروج از حساب',
              icon: Icons.logout_rounded,
              onPressed: () async {
                final confirmed = await showBinaConfirmDialog(
                  context,
                  title: 'خروج از حساب کاربری',
                  message: 'با خروج از حساب، داده‌های کش‌شده پاک می‌شوند. ثبت‌های ارسال‌نشده نیازمند همگام‌سازی هستند.',
                  confirmLabel: 'خروج',
                  destructive: true,
                );
                if (confirmed && context.mounted) {
                  await ref.read(sessionProvider.notifier).signOutAndPurge();
                  if (context.mounted) context.go('/auth/welcome');
                }
              },
            ),
          ],
        ],
      ),
    );
  }
}

/// ACC-02 `/account/profile` (read-only authorized patient identity).
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final gw = ref.watch(patientGatewayProvider);

    return AccountSubpageScaffold(
      title: 'اطلاعات شخصی',
      child: session == null
          ? const BinaEmptyState(
              icon: Icons.person_off_outlined,
              title: 'حساب فعال نیست',
              message: 'لطفاً دوباره وارد شوید.',
            )
          : FutureBuilder<PatientProfileResponse>(
              future: gw.getPatientProfile(session),
              builder: (context, snap) {
                if (snap.connectionState == ConnectionState.waiting) {
                  return const Center(child: Text('در حال بارگذاری اطلاعات...'));
                }
                if (snap.hasError || !snap.hasData) {
                  return BinaErrorState(
                    message: 'دریافت پروفایل از سرور میسر نشد.',
                    onOpenHelp: () => context.push('/account/clinic'),
                  );
                }
                final p = snap.data!;
                return BinaSurface(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: <Widget>[
                      ListTile(title: const Text('نام نمایشی'), subtitle: Text(p.fullNameFa)),
                      ListTile(
                        title: const Text('شماره موبایل'),
                        subtitle: Text(BinaI18nCatalog.isolateLtr(p.phoneMasked)),
                      ),
                      const ListTile(title: Text('زبان و تقویم'), subtitle: Text('فارسی / هجری شمسی')),
                      const Divider(),
                      Text(
                        'برای اصلاح مشخصات هویتی با پذیرش کلینیک تماس بگیرید.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }
}

/// Settings Hub `/account/settings`
class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AccountSubpageScaffold(
      title: 'تنظیمات',
      child: Column(
        children: <Widget>[
          BinaRichRow(
            title: 'ظاهر روشن و تیره',
            wellKind: BinaWellKind.profile,
            icon: Icons.dark_mode_outlined,
            onTap: () => context.push('/account/appearance'),
          ),
          const SizedBox(height: 10),
          BinaRichRow(
            title: 'دسترسی‌پذیری و اندازه متن',
            wellKind: BinaWellKind.plan,
            icon: Icons.accessibility_new_rounded,
            onTap: () => context.push('/account/accessibility'),
          ),
          const SizedBox(height: 10),
          BinaRichRow(
            title: 'وضعیت همگام‌سازی آفلاین',
            wellKind: BinaWellKind.test,
            icon: Icons.sync_rounded,
            onTap: () => context.push('/account/sync'),
          ),
          const SizedBox(height: 10),
          BinaRichRow(
            title: 'اطلاعات کلینیک و ساعات پاسخگویی',
            wellKind: BinaWellKind.neutral,
            icon: Icons.local_hospital_outlined,
            onTap: () => context.push('/account/clinic'),
          ),
        ],
      ),
    );
  }
}

/// ACC-03 `/account/appearance`
class AppearanceScreen extends ConsumerWidget {
  const AppearanceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(themeModeProvider);
    final hc = ref.watch(highContrastProvider);
    return AccountSubpageScaffold(
      title: 'ظاهر برنامه',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          BinaAppearancePicker(
            mode: mode,
            onChanged: (m) => ref.read(themeModeProvider.notifier).setMode(m),
          ),
          const SizedBox(height: 12),
          BinaSwitchRow(
            title: 'کنتراست بالا',
            subtitle: 'حذف پس‌زمینه شیشه‌ای و تقویت کادرها',
            icon: Icons.contrast_rounded,
            wellKind: BinaWellKind.profile,
            value: hc,
            onChanged: (v) => ref.read(highContrastProvider.notifier).setEnabled(v),
          ),
        ],
      ),
    );
  }
}

/// ACC-04 `/account/accessibility`
class AccessibilitySettingsScreen extends ConsumerWidget {
  const AccessibilitySettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hc = ref.watch(highContrastProvider);
    return AccountSubpageScaffold(
      title: 'دسترسی‌پذیری',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          BinaSwitchRow(
            title: 'حالت کنتراست بالا',
            subtitle: 'برای خوانایی بیشتر متن‌ها و دکمه‌ها',
            icon: Icons.contrast_rounded,
            wellKind: BinaWellKind.profile,
            value: hc,
            onChanged: (v) => ref.read(highContrastProvider.notifier).setEnabled(v),
          ),
          const SizedBox(height: 12),
          const BinaSurface(
            child: Text(
              'اندازه فونت برنامه به‌صورت خودکار از تنظیمات سیستم‌عامل گوشی شما پیروی می‌کند و در آزمون‌های بالینی استاندارد ثابت نگه داشته می‌شود.',
            ),
          ),
        ],
      ),
    );
  }
}

/// ACC-05 `/account/notifications`
class NotificationsSettingsScreen extends ConsumerWidget {
  const NotificationsSettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reminders = ref.watch(localReminderPortProvider);
    return AccountSubpageScaffold(
      title: 'اعلان‌ها و یادآورها',
      child: FutureBuilder<bool>(
        future: reminders.hasOsPermission(),
        builder: (context, snap) {
          final allowed = snap.data ?? false;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              BinaBanner(
                kind: allowed ? BinaStatusKind.success : BinaStatusKind.warning,
                title: allowed ? 'مجوز یادآور فعال است' : 'مجوز یادآور در این مرورگر/دستگاه فعال نیست',
                body: allowed
                    ? 'یادآورها بدون نمایش نام دارو یا تشخیص در صفحه قفل ارسال می‌شوند.'
                    : 'برنامه مراقبت شما همچنان در تب امروز و مراقبت فعال است، اما هشدار خودکار سیستم ارسال نمی‌شود.',
              ),
            ],
          );
        },
      ),
    );
  }
}

/// ACC-06 `/account/consents`
class ConsentsScreen extends ConsumerWidget {
  const ConsentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final gw = ref.watch(patientGatewayProvider);
    return AccountSubpageScaffold(
      title: 'امنیت و حریم خصوصی',
      child: session == null
          ? const SizedBox.shrink()
          : FutureBuilder<PatientProfileResponse>(
              future: gw.getPatientProfile(session),
              builder: (context, snap) {
                final consents = snap.data?.consents ?? const <ConsentRecord>[];
                return BinaSurface(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: <Widget>[
                      Text('رضایت‌نامه‌های ثبت‌شده', style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 8),
                      if (consents.isEmpty)
                        const Text('اطلاعات رضایت‌نامه ثبت شده در دسترس نیست.')
                      else
                        for (final c in consents)
                          ListTile(
                            leading: const Icon(Icons.verified_user_outlined),
                            title: Text('نسخه \u2066${c.consentVersion}\u2069'),
                            subtitle: Text('زبان: \u2066${c.locale}\u2069'),
                          ),
                    ],
                  ),
                );
              },
            ),
    );
  }
}

/// ACC-07 `/account/sync` — honest queue view with idempotent retry (NO "delete all pending").
class SyncStatusScreen extends ConsumerStatefulWidget {
  const SyncStatusScreen({super.key});

  @override
  ConsumerState<SyncStatusScreen> createState() => _SyncStatusScreenState();
}

class _SyncStatusScreenState extends ConsumerState<SyncStatusScreen> {
  bool _syncing = false;

  Future<void> _retryAll() async {
    final session = ref.read(sessionProvider);
    if (session == null) return;
    setState(() => _syncing = true);
    try {
      final partition = StoragePartitionKey(
        tenantId: session.tenantId,
        patientId: session.patientId,
        actorId: session.actorPartitionId,
      );
      await ref.read(outboxQueueProvider).flushPartition(partition);
    } finally {
      if (mounted) setState(() => _syncing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);
    final outbox = ref.watch(outboxQueueProvider);
    if (session == null) {
      return const AccountSubpageScaffold(title: 'همگام‌سازی', child: SizedBox.shrink());
    }
    final partition = StoragePartitionKey(
      tenantId: session.tenantId,
      patientId: session.patientId,
      actorId: session.actorPartitionId,
    );

    return AccountSubpageScaffold(
      title: 'وضعیت همگام‌سازی',
      child: FutureBuilder<List<OutboxEntry>>(
        future: outbox.listForPartition(partition),
        builder: (context, snap) {
          final entries = snap.data ?? const <OutboxEntry>[];
          final pending = entries.where((e) => e.status != OutboxSyncStatus.acknowledged).toList();
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              BinaBanner(
                kind: pending.isEmpty ? BinaStatusKind.success : BinaStatusKind.warning,
                title: pending.isEmpty
                    ? 'همه ثبت‌ها به سرور ارسال شده‌اند'
                    : '${pending.length} ثبت در صف ارسال',
                body: 'ثبت‌های آفلاین با شناسه یکتا ذخیره می‌شوند تا از ارسال تکراری جلوگیری شود.',
              ),
              const SizedBox(height: 12),
              if (pending.isNotEmpty)
                BinaGradientButton(
                  label: 'تلاش دوباره برای ارسال صف',
                  busy: _syncing,
                  onPressed: _retryAll,
                ),
              const SizedBox(height: 12),
              for (final entry in entries) ...<Widget>[
                BinaSurface(
                  child: ListTile(
                    title: Text(entry.operationType == 'adherence' ? 'ثبت مصرف دارو' : 'گزارش علائم'),
                    subtitle: Text(
                      'وضعیت: ${_statusFa(entry.status)}'
                      '${entry.eyeLaterality != null ? ' — ${entry.eyeLaterality == 'OD' ? 'چشم راست' : 'چشم چپ'}' : ''}',
                    ),
                  ),
                ),
                const SizedBox(height: 8),
              ],
            ],
          );
        },
      ),
    );
  }

  String _statusFa(OutboxSyncStatus s) => switch (s) {
        OutboxSyncStatus.draft => 'پیش‌نویس',
        OutboxSyncStatus.pendingUpload => 'در انتظار ارسال',
        OutboxSyncStatus.sending => 'در حال ارسال',
        OutboxSyncStatus.acknowledged => 'ارسال شد',
        OutboxSyncStatus.retryableFailure => 'ارسال نشد؛ تلاش دوباره',
        OutboxSyncStatus.conflictOrRejected => 'نیاز به بررسی',
        OutboxSyncStatus.unauthorizedOrRevoked => 'دسترسی پایان یافته است',
      };
}

/// ACC-08 `/account/clinic`
class ClinicInfoScreen extends ConsumerWidget {
  const ClinicInfoScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final gw = ref.watch(patientGatewayProvider);
    return AccountSubpageScaffold(
      title: 'اطلاعات کلینیک',
      child: FutureBuilder<ClinicProfile>(
        future: gw.getCurrentClinic(session: session),
        builder: (context, snap) {
          final c = snap.data;
          if (c == null) {
            return const BinaOfflineBanner();
          }
          return BinaSurface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Text(c.nameFa, style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 8),
                Text('ساعات پاسخگویی: ${c.staffedHoursFa}'),
                const SizedBox(height: 8),
                SelectableText('شماره تماس کلینیک: \u2066${c.emergencyPhone}\u2069'),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// ACC-09 `/account/help`
class AppHelpScreen extends StatelessWidget {
  const AppHelpScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AccountSubpageScaffold(
      title: 'درباره برنامه و راهنما',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          const Align(
            alignment: AlignmentDirectional.centerStart,
            child: BinaBrandMark(full: true, height: 42),
          ),
          const SizedBox(height: 16),
          BinaSurface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(BinaBrand.appNameFa, style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 8),
                const Text(
                  'سامانه همراه مراقبت چشم‌پزشکی، پیگیری دقیق قطره‌های چشم راست و چپ، ارتباط با همراه و دسترسی فوری به اورژانس کلینیک.',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
