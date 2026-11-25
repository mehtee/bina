import 'package:bina_api_dtos/bina_api_dtos.dart';
import 'package:bina_design_system/bina_design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/providers.dart';
import '../../core/data/patient_gateway.dart';
import '../../core/i18n/bina_i18n.dart';
import '../account/account_screens.dart';
import '../care_plan/care_plan_controller.dart';
import '../symptoms_sos/sos_screens.dart';

const Map<String, String> caregiverScopeLabelsFa = <String, String>{
  'care_plan:read': 'مشاهده برنامه مراقبت و زمان‌بندی قطره‌ها',
  'adherence:write': 'ثبت مصرف دارو و گزارش پایبندی',
  'symptoms:write': 'ارسال گزارش علائم چشمی',
  'results:read': 'مشاهده خلاصه نتایج تأییدشده پزشک',
};

@immutable
class CaregiverInviteDraft {
  const CaregiverInviteDraft({
    required this.phoneE164,
    required this.relationshipFa,
  });

  final String phoneE164;
  final String relationshipFa;
}

class CaregiverGrantsController extends AsyncNotifier<List<CaregiverGrant>> {
  @override
  Future<List<CaregiverGrant>> build() async {
    final session = ref.watch(sessionProvider);
    if (session == null || session.actorType == 'caregiver') {
      return const <CaregiverGrant>[];
    }
    final res = await ref.read(patientGatewayProvider).listPatientCaregivers(session);
    return res.items;
  }

  Future<void> refresh() async {
    final session = ref.read(sessionProvider);
    if (session == null || session.actorType == 'caregiver') return;
    state = await AsyncValue.guard(
      () async => (await ref.read(patientGatewayProvider).listPatientCaregivers(session)).items,
    );
  }

  Future<void> grant({
    required String caregiverPhone,
    required String relationshipFa,
    required List<String> scopes,
  }) async {
    final session = ref.read(sessionProvider);
    if (session == null) return;
    await ref.read(patientGatewayProvider).grantCaregiverAccess(
          session: session,
          request: CaregiverGrantRequest(
            caregiverPhone: caregiverPhone,
            relationshipFa: relationshipFa,
            scopes: scopes,
          ),
        );
    await refresh();
  }

  Future<void> revoke(String grantId) async {
    final session = ref.read(sessionProvider);
    if (session == null) return;
    await ref.read(patientGatewayProvider).revokeCaregiverAccess(
          session: session,
          grantId: grantId,
        );
    await refresh();
  }
}

final caregiverGrantsControllerProvider =
    AsyncNotifierProvider<CaregiverGrantsController, List<CaregiverGrant>>(
  CaregiverGrantsController.new,
);

class CaregiverPatientsController extends AsyncNotifier<List<CaregiverPatientLink>> {
  @override
  Future<List<CaregiverPatientLink>> build() async {
    final session = ref.watch(sessionProvider);
    if (session == null || session.actorType != 'caregiver') {
      return const <CaregiverPatientLink>[];
    }
    final res = await ref.read(patientGatewayProvider).listCaregiverPatients(session);
    return res.items;
  }

  Future<void> refresh() async {
    final session = ref.read(sessionProvider);
    if (session == null || session.actorType != 'caregiver') return;
    state = await AsyncValue.guard(
      () async => (await ref.read(patientGatewayProvider).listCaregiverPatients(session)).items,
    );
  }
}

final caregiverPatientsControllerProvider =
    AsyncNotifierProvider<CaregiverPatientsController, List<CaregiverPatientLink>>(
  CaregiverPatientsController.new,
);

/// CG-01 `/account/caregivers`: Patient-only caregiver grant list.
class CaregiversListScreen extends ConsumerWidget {
  const CaregiversListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    if (session?.actorType == 'caregiver') {
      return const AccountSubpageScaffold(
        title: 'همراه (مراقب)',
        child: BinaEmptyState(
          icon: Icons.lock_outline_rounded,
          title: 'دسترسی مخصوص بیمار',
          message: 'مدیریت دسترسی همراهان تنها توسط خود بیمار یا کلینیک انجام می‌شود.',
        ),
      );
    }

    final grantsAsync = ref.watch(caregiverGrantsControllerProvider);
    return AccountSubpageScaffold(
      title: 'مدیریت همراه (مراقب)',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          BinaGradientButton(
            label: 'افزودن همراه جدید',
            icon: Icons.person_add_alt_1_outlined,
            onPressed: () => context.push('/account/caregivers/invite'),
          ),
          const SizedBox(height: 16),
          grantsAsync.when(
            loading: () => const BinaSurface(child: Text('در حال بارگذاری فهرست همراهان...')),
            error: (_, _) => BinaErrorState(
              message: 'امکان دریافت فهرست همراهان وجود ندارد.',
              onRetry: () => ref.read(caregiverGrantsControllerProvider.notifier).refresh(),
            ),
            data: (grants) {
              if (grants.isEmpty) {
                return const BinaEmptyState(
                  icon: Icons.group_outlined,
                  title: 'هنوز همراهی ثبت نشده است',
                  message: 'در صورت تمایل می‌توانید برای یکی از اعضای خانواده دسترسی محدود تعریف کنید.',
                );
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  for (final g in grants) ...<Widget>[
                    BinaRichRow(
                      title: g.relationshipFa,
                      subtitle: '${BinaI18nCatalog.isolateLtr(g.caregiverPhone)} — ${g.scopes.length} مجوز',
                      wellKind: BinaWellKind.profile,
                      icon: Icons.person_outline_rounded,
                      trailing: BinaStatusChip(
                        kind: g.active ? BinaStatusKind.success : BinaStatusKind.neutral,
                        text: g.active ? 'فعال' : 'لغوشده',
                      ),
                      onTap: () => context.push('/account/caregivers/grant/${g.grantId}', extra: g),
                    ),
                    const SizedBox(height: 10),
                  ],
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

/// CG-02 `/account/caregivers/invite`: Draft invitation only (grants NO access yet).
class CaregiverInviteScreen extends StatefulWidget {
  const CaregiverInviteScreen({super.key});

  @override
  State<CaregiverInviteScreen> createState() => _CaregiverInviteScreenState();
}

class _CaregiverInviteScreenState extends State<CaregiverInviteScreen> {
  final TextEditingController _phoneCtrl = TextEditingController();
  String _relationshipFa = 'فرزند بیمار';
  String? _errorFa;

  static const List<String> _relationships = <String>[
    'فرزند بیمار',
    'همسر',
    'والدین',
    'سایر بستگان',
  ];

  @override
  void dispose() {
    _phoneCtrl.dispose();
    super.dispose();
  }

  void _continueToScopes() {
    final normalized = BinaI18nCatalog.normalizeIranMobileE164(_phoneCtrl.text);
    if (normalized == null) {
      setState(() => _errorFa = 'شماره موبایل معتبر ایران وارد کنید (مانند ۰۹۱۲۳۴۵۶۷۸۹).');
      return;
    }
    setState(() => _errorFa = null);
    context.push(
      '/account/caregivers/scope',
      extra: CaregiverInviteDraft(phoneE164: normalized, relationshipFa: _relationshipFa),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AccountSubpageScaffold(
      title: 'دعوت همراه',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          const BinaBanner(
            kind: BinaStatusKind.info,
            title: 'اعطای دسترسی مرحله‌ای',
            body: 'وارد کردن شماره هنوز دسترسی ایجاد نمی‌کند. در مرحله بعد دقیقاً سطح مجوز همراه را تعیین می‌کنید.',
          ),
          const SizedBox(height: 14),
          BinaSurface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                BinaField(
                  controller: _phoneCtrl,
                  labelText: 'شماره موبایل همراه (+98)',
                  hintText: '۰۹۱۲۳۴۵۶۷۸۹',
                  keyboardType: TextInputType.phone,
                  textDirection: TextDirection.ltr,
                  errorText: _errorFa,
                ),
                const SizedBox(height: 14),
                Text('نسبت با بیمار', style: Theme.of(context).textTheme.titleSmall),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: <Widget>[
                    for (final rel in _relationships)
                      ChoiceChip(
                        label: Text(rel),
                        selected: _relationshipFa == rel,
                        onSelected: (_) => setState(() => _relationshipFa = rel),
                      ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          BinaGradientButton(
            label: 'ادامه و انتخاب مجوزها',
            onPressed: _continueToScopes,
          ),
        ],
      ),
    );
  }
}

/// CG-03 `/account/caregivers/scope`: Least-privilege default (only `care_plan:read` initially selected).
class CaregiverScopeScreen extends ConsumerStatefulWidget {
  const CaregiverScopeScreen({
    super.key,
    required this.draft,
  });

  final CaregiverInviteDraft? draft;

  @override
  ConsumerState<CaregiverScopeScreen> createState() => _CaregiverScopeScreenState();
}

class _CaregiverScopeScreenState extends ConsumerState<CaregiverScopeScreen> {
  // Least privilege default (`v2.1 §9.5 CG-03`): NO "all access" default!
  final Set<String> _selectedScopes = <String>{'care_plan:read'};
  bool _confirmed = false;
  bool _submitting = false;
  String? _errorFa;

  Future<void> _submit() async {
    final draft = widget.draft;
    if (draft == null || !_confirmed || _selectedScopes.isEmpty) return;

    setState(() {
      _submitting = true;
      _errorFa = null;
    });

    try {
      await ref.read(caregiverGrantsControllerProvider.notifier).grant(
            caregiverPhone: draft.phoneE164,
            relationshipFa: draft.relationshipFa,
            scopes: _selectedScopes.toList(growable: false),
          );
      if (!mounted) return;
      context.go('/account/caregivers');
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _errorFa = 'اعطای دسترسی در حال حاضر انجام نشد. اتصال اینترنت را بررسی کنید.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final draft = widget.draft;
    if (draft == null) {
      return AccountSubpageScaffold(
        title: 'تعیین مجوزها',
        child: BinaEmptyState(
          icon: Icons.person_outline,
          title: 'اطلاعات دعوت موجود نیست',
          message: 'لطفاً شماره موبایل همراه را دوباره وارد کنید.',
          actionLabel: 'شروع مجدد',
          onAction: () => context.go('/account/caregivers/invite'),
        ),
      );
    }

    return AccountSubpageScaffold(
      title: 'مجوزهای همراه',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          BinaSurface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Text('${draft.relationshipFa} — ${BinaI18nCatalog.isolateLtr(draft.phoneE164)}'),
                const SizedBox(height: 12),
                Text('حداقل دسترسی مجاز را انتخاب کنید:', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                for (final entry in caregiverScopeLabelsFa.entries)
                  CheckboxListTile(
                    title: Text(entry.value),
                    value: _selectedScopes.contains(entry.key),
                    onChanged: (checked) {
                      setState(() {
                        if (checked == true) {
                          _selectedScopes.add(entry.key);
                        } else if (entry.key != 'care_plan:read') {
                          _selectedScopes.remove(entry.key);
                        }
                      });
                    },
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          BinaSurface(
            child: CheckboxListTile(
              title: const Text('با آگاهی از حدود دسترسی بالا، این مجوز را تایید می‌کنم.'),
              value: _confirmed,
              onChanged: (v) => setState(() => _confirmed = v ?? false),
            ),
          ),
          if (_errorFa != null) ...<Widget>[
            const SizedBox(height: 12),
            BinaBanner(kind: BinaStatusKind.error, title: 'خطا', body: _errorFa!),
          ],
          const SizedBox(height: 16),
          BinaGradientButton(
            label: 'تایید و فعال‌سازی دسترسی',
            busy: _submitting,
            onPressed: (_confirmed && !_submitting) ? _submit : null,
          ),
        ],
      ),
    );
  }
}

/// CG-04 & CG-05 `/account/caregivers/grant/:grantId`: Online-verified revocation only.
class CaregiverGrantDetailScreen extends ConsumerStatefulWidget {
  const CaregiverGrantDetailScreen({
    super.key,
    required this.grantId,
    this.initialGrant,
  });

  final String grantId;
  final CaregiverGrant? initialGrant;

  @override
  ConsumerState<CaregiverGrantDetailScreen> createState() => _CaregiverGrantDetailScreenState();
}

class _CaregiverGrantDetailScreenState extends ConsumerState<CaregiverGrantDetailScreen> {
  bool _revoking = false;
  String? _errorFa;

  Future<void> _confirmAndRevoke(CaregiverGrant grant) async {
    final confirmed = await showBinaConfirmDialog(
      context,
      title: 'لغو دسترسی ${grant.relationshipFa}',
      message: 'پس از لغو، این همراه دیگر نمی‌تواند برنامه یا وضعیت پرونده شما را مشاهده کند.',
      confirmLabel: 'لغو دسترسی',
      destructive: true,
    );
    if (!confirmed || !mounted) return;

    setState(() {
      _revoking = true;
      _errorFa = null;
    });

    try {
      await ref.read(caregiverGrantsControllerProvider.notifier).revoke(grant.grantId);
      if (!mounted) return;
      context.go('/account/caregivers');
    } catch (_) {
      if (!mounted) return;
      // Fail closed (`CG-05`): never claim server revocation completed when offline!
      setState(() {
        _revoking = false;
        _errorFa = 'اتصال اینترنت برقرار نیست؛ دسترسی هنوز در سرور لغو نشده است. پس از اتصال دوباره تلاش کنید.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final grants = ref.watch(caregiverGrantsControllerProvider).asData?.value;
    CaregiverGrant? grant = widget.initialGrant;
    if (grants != null) {
      for (final g in grants) {
        if (g.grantId == widget.grantId) {
          grant = g;
          break;
        }
      }
    }

    if (grant == null) {
      return AccountSubpageScaffold(
        title: 'جزئیات دسترسی همراه',
        child: BinaEmptyState(
          icon: Icons.group_off_outlined,
          title: 'مجوز همراه یافت نشد',
          message: 'ممکن است این دسترسی قبلاً لغو شده باشد.',
          actionLabel: 'بازگشت',
          onAction: () => context.go('/account/caregivers'),
        ),
      );
    }

    return AccountSubpageScaffold(
      title: grant.relationshipFa,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          BinaSurface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Row(
                  children: <Widget>[
                    Expanded(
                      child: Text(grant.relationshipFa, style: Theme.of(context).textTheme.headlineSmall),
                    ),
                    BinaStatusChip(
                      kind: grant.active ? BinaStatusKind.success : BinaStatusKind.neutral,
                      text: grant.active ? 'فعال' : 'لغوشده',
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text('شماره: ${BinaI18nCatalog.isolateLtr(grant.caregiverPhone)}'),
                const SizedBox(height: 12),
                Text('مجوزهای فعال:', style: Theme.of(context).textTheme.titleSmall),
                const SizedBox(height: 6),
                for (final sc in grant.scopes)
                  Padding(
                    padding: const EdgeInsetsDirectional.symmetric(vertical: 2),
                    child: Text('• ${caregiverScopeLabelsFa[sc] ?? sc}'),
                  ),
              ],
            ),
          ),
          if (_errorFa != null) ...<Widget>[
            const SizedBox(height: 12),
            BinaBanner(kind: BinaStatusKind.error, title: 'لغو دسترسی تایید نشد', body: _errorFa!),
          ],
          const SizedBox(height: 16),
          if (grant.active)
            BinaUrgentButton(
              label: _revoking ? 'در حال لغو دسترسی...' : 'لغو دسترسی همراه',
              icon: Icons.person_remove_outlined,
              onPressed: _revoking ? null : () => _confirmAndRevoke(grant!),
            ),
        ],
      ),
    );
  }
}

/// CG-06 `/caregiver/accept`
class CaregiverAcceptScreen extends ConsumerStatefulWidget {
  const CaregiverAcceptScreen({super.key});

  @override
  ConsumerState<CaregiverAcceptScreen> createState() => _CaregiverAcceptScreenState();
}

class _CaregiverAcceptScreenState extends ConsumerState<CaregiverAcceptScreen> {
  bool _accepted = false;

  @override
  Widget build(BuildContext context) {
    return AccountSubpageScaffold(
      title: 'پذیرش نقش همراه',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          const BinaBanner(
            kind: BinaStatusKind.info,
            title: 'دسترسی محدود همراه',
            body: 'تمامی اقدامات شما با نام همراه ثبت می‌شود و بیمار می‌تواند هر زمان دسترسی را لغو کند.',
          ),
          const SizedBox(height: 14),
          BinaSurface(
            child: CheckboxListTile(
              title: const Text('شرایط همراهی و حفظ محرمانگی پرونده را می‌پذیرم.'),
              value: _accepted,
              onChanged: (v) => setState(() => _accepted = v ?? false),
            ),
          ),
          const SizedBox(height: 16),
          BinaGradientButton(
            label: 'ادامه و مشاهده پرونده‌های مجاز',
            onPressed: _accepted ? () => context.go('/caregiver/patients') : null,
          ),
        ],
      ),
    );
  }
}

/// CG-07 `/caregiver/patients`: Explicit context switch clearing stale patient state.
class CaregiverPatientsScreen extends ConsumerStatefulWidget {
  const CaregiverPatientsScreen({super.key});

  @override
  ConsumerState<CaregiverPatientsScreen> createState() => _CaregiverPatientsScreenState();
}

class _CaregiverPatientsScreenState extends ConsumerState<CaregiverPatientsScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      if (mounted) {
        ref.read(caregiverPatientsControllerProvider.notifier).refresh();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);
    final patientsAsync = ref.watch(caregiverPatientsControllerProvider);

    return AccountSubpageScaffold(
      title: 'بیماران تحت مراقبت',
      child: patientsAsync.when(
        loading: () => const BinaSurface(child: Text('در حال بارگذاری پرونده‌های مجاز...')),
        error: (err, _) {
          if (err is PatientGatewayException && err.isUnauthorizedOrRevoked) {
            return BinaBanner(
              kind: BinaStatusKind.error,
              title: 'دسترسی پایان یافته است',
              body: 'دسترسی شما به این پرونده دیگر معتبر نیست.',
              actionLabel: 'ادامه',
              onAction: () async {
                await ref.read(sessionProvider.notifier).handleCaregiverRevoked();
                if (context.mounted) context.go('/caregiver/revoked');
              },
            );
          }
          return BinaErrorState(
            message: 'دریافت فهرست پرونده‌ها انجام نشد.',
            onRetry: () => ref.read(caregiverPatientsControllerProvider.notifier).refresh(),
          );
        },
        data: (patients) {
          if (patients.isEmpty) {
            return const BinaEmptyState(
              icon: Icons.group_outlined,
              title: 'پرونده فعالی یافت نشد',
              message: 'در حال حاضر دسترسی فعالی برای مراقبت از بیمار ثبت نشده است.',
            );
          }
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              for (final link in patients) ...<Widget>[
                BinaRichRow(
                  title: link.patientNameFa,
                  subtitle: '${link.relationshipFa} — ${link.scopes.length} مجوز',
                  wellKind: BinaWellKind.profile,
                  icon: Icons.person_outline_rounded,
                  trailing: (session?.patientId == link.patientId)
                      ? const BinaStatusChip(kind: BinaStatusKind.success, text: 'پرونده فعال')
                      : null,
                  onTap: () async {
                    await ref.read(sessionProvider.notifier).switchCaregiverPatient(link);
                    ref.invalidate(carePlanControllerProvider);
                    ref.read(symptomDraftProvider.notifier).reset();
                    if (context.mounted) context.go('/today');
                  },
                ),
                const SizedBox(height: 10),
              ],
            ],
          );
        },
      ),
    );
  }
}

/// CG-09 `/caregiver/revoked`: Neutral fail-closed termination notice (`v2.1 §9.5`).
class CaregiverRevokedScreen extends StatelessWidget {
  const CaregiverRevokedScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BinaCanvas(
      artVariant: BinaCanvasArtVariant.none,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: const BinaAppBar(title: 'وضعیت دسترسی', isRootTab: true),
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsetsDirectional.all(BinaSpacing.marginCompact),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: BinaSpacing.readingMax),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    const BinaBanner(
                      kind: BinaStatusKind.neutral,
                      title: 'دسترسی پایان یافته است',
                      body:
                          'دسترسی شما به این پرونده بیمار به پایان رسیده و اطلاعات ذخیره‌شده آن از این دستگاه پاک شده است.',
                    ),
                    const SizedBox(height: 16),
                    BinaGradientButton(
                      label: 'بازگشت به صفحه ورود',
                      onPressed: () => context.go('/auth/welcome'),
                    ),
                    const SizedBox(height: 12),
                    BinaSecondaryButton(
                      label: 'کمک فوری کلینیک',
                      icon: Icons.phone_in_talk_rounded,
                      onPressed: () => context.push('/help/urgent'),
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
