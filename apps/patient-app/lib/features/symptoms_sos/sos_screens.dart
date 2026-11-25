import 'dart:convert';

import 'package:bina_api_dtos/bina_api_dtos.dart';
import 'package:bina_design_system/bina_design_system.dart';
import 'package:bina_offline_store/bina_offline_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:uuid/uuid.dart';
import '../../app/providers.dart';
import '../../core/data/patient_gateway.dart';
import '../../core/data/session_cache_repository.dart';
import '../../core/i18n/bina_i18n.dart';
import '../care_plan/care_plan_controller.dart';

/// Shared zero-art scaffold for all urgent / symptom flows (`v2.1 §4.4.4 & §9.4`).
class _SosScaffold extends StatelessWidget {
  const _SosScaffold({
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
      artVariant: BinaCanvasArtVariant.none,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: BinaAppBar(
          title: title,
          isRootTab: !showBack,
          onBack: showBack ? () => context.pop() : null,
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

/// SOS-01 `/help/urgent` & SOS-09 out-of-hours guidance (`v2.1 §9.4`).
/// Works completely offline and without login; ZERO decorative art.
class UrgentHelpScreen extends ConsumerStatefulWidget {
  const UrgentHelpScreen({super.key});

  @override
  ConsumerState<UrgentHelpScreen> createState() => _UrgentHelpScreenState();
}

class _UrgentHelpScreenState extends ConsumerState<UrgentHelpScreen> {
  ClinicProfile? _cachedClinic;

  @override
  void initState() {
    super.initState();
    _loadCachedClinic();
  }

  Future<void> _loadCachedClinic() async {
    final session = ref.read(sessionProvider);
    if (session == null) return;
    final loaded = await ref.read(sessionCacheRepositoryProvider).loadClinic(session);
    if (mounted && loaded != null) {
      setState(() => _cachedClinic = loaded.data);
    }
  }

  Future<void> _copyPhoneAndGuide(String phone) async {
    await Clipboard.setData(ClipboardData(text: phone));
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('شماره ${BinaI18nCatalog.isolateLtr(phone)} کپی شد؛ برای تماس فوری شماره‌گیری کنید.'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    final session = ref.watch(sessionProvider);
    final loadedPlan = ref.watch(carePlanControllerProvider).asData?.value;
    final clinic = loadedPlan?.clinic ?? _cachedClinic;
    final phone = clinic?.emergencyPhone;
    final hasPhone = phone != null && phone.trim().isNotEmpty;
    final staffedNow = clinic?.currentlyStaffed;

    return _SosScaffold(
      title: 'کمک فوری',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Container(
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
                    Icon(Icons.emergency_rounded, color: p.error, size: 28),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'کمک فوری و تماس اورژانسی',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: p.error),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  'اگر درد شدید چشم، کاهش ناگهانی دید، ترشح چرکی، جرقه نور یا پرده سیاه دارید منتظر پیام یا نوبت نمانید و فوراً تماس بگیرید یا به اورژانس چشم مراجعه کنید.',
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          if (hasPhone) ...<Widget>[
            BinaSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  Text(clinic!.nameFa, style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 8),
                  const Text('شماره ثبت‌شده کلینیک برای مواقع فوری:'),
                  const SizedBox(height: 8),
                  SelectableText(
                    BinaI18nCatalog.isolateLtr(phone),
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: p.urgentAction),
                  ),
                  const SizedBox(height: 12),
                  BinaUrgentButton(
                    label: 'شماره‌گیری / کپی شماره کلینیک (${BinaI18nCatalog.isolateLtr(phone)})',
                    onPressed: () => _copyPhoneAndGuide(phone),
                  ),
                ],
              ),
            ),
          ] else ...<Widget>[
            BinaSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  Text(
                    'شماره کلینیک در این دستگاه ذخیره نشده است',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'برای دریافت کمک فوری، بلافاصله با اورژانس ۱۱۵ تماس بگیرید یا به نزدیک‌ترین مرکز اورژانس چشم‌پزشکی مراجعه کنید.',
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  const SizedBox(height: 12),
                  BinaUrgentButton(
                    label: 'کپی شماره اورژانس کشور (۱۱۵)',
                    onPressed: () => _copyPhoneAndGuide('115'),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 14),
          // Explicit staffed hours + out-of-hours guidance (`SOS-09`): never claims 24/7.
          BinaBanner(
            kind: staffedNow == false ? BinaStatusKind.warning : BinaStatusKind.info,
            title: staffedNow == false ? 'خارج از ساعات کاری کلینیک' : 'ساعات پاسخ‌گویی کلینیک و ساعات غیرکاری',
            body: clinic != null
                ? 'ساعات کاری ثبت‌شده: ${clinic.staffedHoursFa}\nکلینیک پاسخ‌گویی ۲۴ ساعته ندارد. در ساعات غیرکاری یا در صورت عدم پاسخ، فوراً به نزدیک‌ترین اورژانس چشم مراجعه کنید یا با ۱۱۵ تماس بگیرید.'
                : 'اطلاعات ساعات کاری کلینیک در دسترس نیست. پاسخ‌گویی ۲۴ ساعته تضمین نمی‌شود؛ در مواقع اضطراری به نزدیک‌ترین اورژانس چشم مراجعه کنید.',
          ),
          const SizedBox(height: 16),
          if (session != null)
            BinaSecondaryButton(
              label: 'ثبت علائم ساختاریافته',
              icon: Icons.assignment_outlined,
              onPressed: () => context.push('/help/symptoms'),
            )
          else
            BinaBanner(
              kind: BinaStatusKind.neutral,
              title: 'ثبت گزارش علائم در پرونده',
              body:
                  'تماس فوری نیاز به ورود ندارد. برای ارسال گزارش علائم به پرونده خود در کلینیک، ابتدا وارد حساب کاربری شوید.',
              actionLabel: 'ورود به حساب',
              onAction: () => context.push('/auth/phone'),
            ),
        ],
      ),
    );
  }
}

@immutable
class SymptomDraftState {
  const SymptomDraftState({
    this.selectedEye,
    this.severePain = false,
    this.suddenVisionLoss = false,
    this.purulentDischarge = false,
    this.flashesOrCurtain = false,
    this.freeTextFa = '',
  });

  final EyeLaterality? selectedEye;
  final bool severePain;
  final bool suddenVisionLoss;
  final bool purulentDischarge;
  final bool flashesOrCurtain;
  final String freeTextFa;

  bool get hasRedFlag => severePain || suddenVisionLoss || purulentDischarge || flashesOrCurtain;

  SymptomDraftState copyWith({
    EyeLaterality? selectedEye,
    bool? severePain,
    bool? suddenVisionLoss,
    bool? purulentDischarge,
    bool? flashesOrCurtain,
    String? freeTextFa,
  }) {
    return SymptomDraftState(
      selectedEye: selectedEye ?? this.selectedEye,
      severePain: severePain ?? this.severePain,
      suddenVisionLoss: suddenVisionLoss ?? this.suddenVisionLoss,
      purulentDischarge: purulentDischarge ?? this.purulentDischarge,
      flashesOrCurtain: flashesOrCurtain ?? this.flashesOrCurtain,
      freeTextFa: freeTextFa ?? this.freeTextFa,
    );
  }
}

class SymptomDraftNotifier extends Notifier<SymptomDraftState> {
  @override
  SymptomDraftState build() => const SymptomDraftState();

  void setEye(EyeLaterality eye) => state = state.copyWith(selectedEye: eye);

  void setSeverePain(bool v) => state = state.copyWith(severePain: v);

  void setSuddenVisionLoss(bool v) => state = state.copyWith(suddenVisionLoss: v);

  void setPurulentDischarge(bool v) => state = state.copyWith(purulentDischarge: v);

  void setFlashesOrCurtain(bool v) => state = state.copyWith(flashesOrCurtain: v);

  void setFreeTextFa(String text) => state = state.copyWith(freeTextFa: text);

  void reset() => state = const SymptomDraftState();
}

final symptomDraftProvider =
    NotifierProvider<SymptomDraftNotifier, SymptomDraftState>(SymptomDraftNotifier.new);

@immutable
class SymptomReceiptPayload {
  const SymptomReceiptPayload({
    required this.entry,
    required this.hasRedFlag,
    required this.eyeLaterality,
  });

  final OutboxEntry entry;
  final bool hasRedFlag;
  final EyeLaterality eyeLaterality;
}

/// Static urgent card shown IMMEDIATELY when any red-flag toggle is true (`SOS-08`).
class _StaticUrgentSymptomCard extends StatelessWidget {
  const _StaticUrgentSymptomCard({required this.onCallUrgent});

  final VoidCallback onCallUrgent;

  @override
  Widget build(BuildContext context) {
    return BinaUrgentActionCard(
      title: 'نیاز به اقدام فوری — منتظر تکمیل فرم نمانید',
      body:
          'بر اساس نشانه انتخاب‌شده، لازم است بلافاصله با شماره ثبت‌شده کلینیک تماس بگیرید یا به اورژانس چشم مراجعه کنید.',
      ctaLabel: 'باز کردن تماس فوری',
      onCallPressed: onCallUrgent,
    );
  }
}

/// SOS-02 `/help/symptoms`
class SymptomIntroScreen extends ConsumerWidget {
  const SymptomIntroScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return _SosScaffold(
      title: 'گزارش علائم چشمی',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          BinaUrgentButton(
            label: 'تماس فوری (در صورت درد شدید یا کاهش دید)',
            onPressed: () => context.push('/help/urgent'),
          ),
          const SizedBox(height: 16),
          BinaSurface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Text('تفاوت تماس فوری و ثبت علائم', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 8),
                Text(
                  'ثبت علائم برای اطلاع تیم درمان انجام می‌شود و به معنی بررسی لحظه‌ای توسط پزشک نیست. در صورت نبود اینترنت، گزارش روی دستگاه ذخیره و پس از اتصال ارسال می‌شود.',
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          BinaGradientButton(
            label: 'شروع ثبت علائم',
            icon: Icons.arrow_forward_rounded,
            onPressed: () {
              ref.read(symptomDraftProvider.notifier).reset();
              context.push('/help/symptoms/eye');
            },
          ),
        ],
      ),
    );
  }
}

/// SOS-03 `/help/symptoms/eye`: explicit eye selection with NO default (`v2.1 §9.4`).
class SymptomEyeScreen extends ConsumerWidget {
  const SymptomEyeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedEye = ref.watch(symptomDraftProvider.select((s) => s.selectedEye));

    return _SosScaffold(
      title: 'انتخاب چشم دارای علامت',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text(
            'علائم در کدام چشم ایجاد شده است؟ هیچ چشمی به‌صورت خودکار انتخاب نمی‌شود.',
            style: Theme.of(context).textTheme.bodyLarge,
          ),
          const SizedBox(height: 16),
          RadioGroup<EyeLaterality?>(
            groupValue: selectedEye,
            onChanged: (val) {
              if (val != null) {
                ref.read(symptomDraftProvider.notifier).setEye(val);
              }
            },
            child: Column(
              children: <Widget>[
                BinaSurface(
                  onTap: () => ref.read(symptomDraftProvider.notifier).setEye(EyeLaterality.oD),
                  child: const RadioListTile<EyeLaterality?>(
                    value: EyeLaterality.oD,
                    title: Text('چشم راست (OD)'),
                    subtitle: Text('علامت مربوط به چشم راست است'),
                  ),
                ),
                const SizedBox(height: 12),
                BinaSurface(
                  onTap: () => ref.read(symptomDraftProvider.notifier).setEye(EyeLaterality.oS),
                  child: const RadioListTile<EyeLaterality?>(
                    value: EyeLaterality.oS,
                    title: Text('چشم چپ (OS)'),
                    subtitle: Text('علامت مربوط به چشم چپ است'),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          BinaGradientButton(
            label: 'ادامه',
            onPressed: selectedEye == null ? null : () => context.push('/help/symptoms/questions'),
          ),
          const SizedBox(height: 12),
          BinaSecondaryButton(
            label: 'مطمئن نیستم / تماس فوری',
            icon: Icons.phone_in_talk_rounded,
            onPressed: () => context.push('/help/urgent'),
          ),
        ],
      ),
    );
  }
}

/// SOS-04 / SOS-05 / SOS-08 `/help/symptoms/questions`
class SymptomQuestionsScreen extends ConsumerStatefulWidget {
  const SymptomQuestionsScreen({super.key});

  @override
  ConsumerState<SymptomQuestionsScreen> createState() => _SymptomQuestionsScreenState();
}

class _SymptomQuestionsScreenState extends ConsumerState<SymptomQuestionsScreen> {
  late final TextEditingController _noteCtrl;

  @override
  void initState() {
    super.initState();
    _noteCtrl = TextEditingController(text: ref.read(symptomDraftProvider).freeTextFa);
  }

  @override
  void dispose() {
    _noteCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final draft = ref.watch(symptomDraftProvider);
    final notifier = ref.read(symptomDraftProvider.notifier);

    if (draft.selectedEye == null) {
      return _SosScaffold(
        title: 'پرسش‌های علائم',
        child: BinaEmptyState(
          icon: Icons.visibility_outlined,
          title: 'ابتدا چشم دارای علامت را مشخص کنید',
          message: 'برای جلوگیری از ثبت اشتباه، باید چشم راست یا چشم چپ را انتخاب کنید.',
          actionLabel: 'انتخاب چشم',
          onAction: () => context.go('/help/symptoms/eye'),
        ),
      );
    }

    return _SosScaffold(
      title: 'بررسی علائم (${draft.selectedEye == EyeLaterality.oD ? 'چشم راست' : 'چشم چپ'})',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          // Immediate deterministic urgent card BEFORE network or submission (`SOS-04` + `SOS-08`).
          if (draft.hasRedFlag) ...<Widget>[
            _StaticUrgentSymptomCard(onCallUrgent: () => context.push('/help/urgent')),
            const SizedBox(height: 16),
          ],
          BinaSurface(
            child: Column(
              children: <Widget>[
                SwitchListTile(
                  title: const Text('درد شدید یا رو به افزایش چشم'),
                  value: draft.severePain,
                  onChanged: notifier.setSeverePain,
                ),
                const Divider(),
                SwitchListTile(
                  title: const Text('کاهش ناگهانی یا شدید دید'),
                  value: draft.suddenVisionLoss,
                  onChanged: notifier.setSuddenVisionLoss,
                ),
                const Divider(),
                SwitchListTile(
                  title: const Text('ترشح چرکی یا زردرنگ'),
                  value: draft.purulentDischarge,
                  onChanged: notifier.setPurulentDischarge,
                ),
                const Divider(),
                SwitchListTile(
                  title: const Text('جرقه نور یا پرده سیاه در دید'),
                  value: draft.flashesOrCurtain,
                  onChanged: notifier.setFlashesOrCurtain,
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          BinaSurface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                BinaField(
                  controller: _noteCtrl,
                  labelText: 'توضیحات اختیاری به فارسی',
                  hintText: 'مثلاً از چه ساعتی شروع شد',
                  helperText: 'توضیح متنی هرگز هشدار علائم فوری را لغو یا کم‌اهمیت نمی‌کند.',
                  maxLines: 3,
                  onChanged: notifier.setFreeTextFa,
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          BinaGradientButton(
            label: 'بازبینی و ارسال گزارش',
            onPressed: () => context.push('/help/symptoms/review'),
          ),
        ],
      ),
    );
  }
}

/// SOS-06 `/help/symptoms/review`
class SymptomReviewScreen extends ConsumerStatefulWidget {
  const SymptomReviewScreen({super.key});

  @override
  ConsumerState<SymptomReviewScreen> createState() => _SymptomReviewScreenState();
}

class _SymptomReviewScreenState extends ConsumerState<SymptomReviewScreen> {
  static const Uuid _uuid = Uuid();
  bool _submitting = false;
  String? _errorFa;

  Future<String> _resolveEpisodeId(AuthSessionContext session, EyeLaterality eye) async {
    final loaded = ref.read(carePlanControllerProvider).asData?.value;
    if (loaded != null) {
      for (final pair in loaded.episodes) {
        if (pair.episode.eyeLaterality == eye) return pair.episode.episodeId;
      }
      for (final card in loaded.todayPlan.scheduleItems) {
        if (card.eyeLaterality == eye) return card.episodeId;
      }
      if (loaded.episodes.isNotEmpty) return loaded.episodes.first.episode.episodeId;
    }
    final cachedEps = await ref.read(sessionCacheRepositoryProvider).loadEpisodes(session);
    if (cachedEps != null) {
      for (final pair in cachedEps.data.items) {
        if (pair.episode.eyeLaterality == eye) return pair.episode.episodeId;
      }
      if (cachedEps.data.items.isNotEmpty) return cachedEps.data.items.first.episode.episodeId;
    }
    return 'episode-${eye.value.toLowerCase()}';
  }

  Future<void> _submit() async {
    final draft = ref.read(symptomDraftProvider);
    final eye = draft.selectedEye;
    final session = ref.read(sessionProvider);
    if (eye == null || session == null) return;

    setState(() {
      _submitting = true;
      _errorFa = null;
    });

    try {
      final episodeId = await _resolveEpisodeId(session, eye);
      final partition = SessionCacheRepository.partitionFor(session);
      final outbox = ref.read(outboxQueueProvider);
      final idempotencyKey = _uuid.v4();
      final nowUtc = DateTime.now().toUtc();
      final req = SymptomReportRequest(
        eyeLaterality: eye,
        severePain: draft.severePain,
        suddenVisionLoss: draft.suddenVisionLoss,
        purulentDischarge: draft.purulentDischarge,
        flashesOrCurtain: draft.flashesOrCurtain,
        freeTextFa: draft.freeTextFa.trim(),
      );

      final entry = OutboxEntry(
        idempotencyKey: idempotencyKey,
        partition: partition,
        operationType: 'symptoms',
        endpointPath: '/v1/episodes/$episodeId/symptoms',
        payloadJson: jsonEncode(<String, Object?>{
          'episodeId': episodeId,
          'request': req.toJson(),
        }),
        createdAtUtc: nowUtc,
        status: OutboxSyncStatus.pendingUpload,
        eyeLaterality: eye.value,
      );

      await outbox.enqueue(entry);
      await outbox.flushPartition(partition);
      final list = await outbox.listForPartition(partition);
      final committed = list.firstWhere((e) => e.idempotencyKey == idempotencyKey, orElse: () => entry);

      final hasRedFlag = draft.hasRedFlag;
      ref.read(symptomDraftProvider.notifier).reset();

      if (!mounted) return;
      context.go(
        '/help/symptoms/receipt',
        extra: SymptomReceiptPayload(
          entry: committed,
          hasRedFlag: hasRedFlag,
          eyeLaterality: eye,
        ),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _errorFa = 'ثبت گزارش روی دستگاه انجام نشد. لطفاً دوباره تلاش کنید یا با اورژانس تماس بگیرید.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final draft = ref.watch(symptomDraftProvider);
    final eye = draft.selectedEye;
    if (eye == null) {
      return _SosScaffold(
        title: 'بازبینی علائم',
        child: BinaEmptyState(
          icon: Icons.visibility_outlined,
          title: 'چشم انتخاب نشده است',
          message: 'لطفاً ابتدا چشم دارای علامت را انتخاب کنید.',
          actionLabel: 'انتخاب چشم',
          onAction: () => context.go('/help/symptoms/eye'),
        ),
      );
    }

    final eyeFa = eye == EyeLaterality.oD ? 'چشم راست (OD)' : 'چشم چپ (OS)';
    return _SosScaffold(
      title: 'بازبینی و ارسال علائم',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          if (draft.hasRedFlag) ...<Widget>[
            _StaticUrgentSymptomCard(onCallUrgent: () => context.push('/help/urgent')),
            const SizedBox(height: 16),
          ],
          BinaSurface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                BinaEyeLabel(eyeCode: eye.value, fullPersianLabel: eyeFa),
                const SizedBox(height: 12),
                _AnswerRow(label: 'درد شدید چشم', yes: draft.severePain),
                _AnswerRow(label: 'کاهش ناگهانی دید', yes: draft.suddenVisionLoss),
                _AnswerRow(label: 'ترشح چرکی یا زردرنگ', yes: draft.purulentDischarge),
                _AnswerRow(label: 'جرقه نور یا پرده سیاه', yes: draft.flashesOrCurtain),
                if (draft.freeTextFa.trim().isNotEmpty) ...<Widget>[
                  const Divider(),
                  Text('توضیح: ${draft.freeTextFa.trim()}'),
                ],
              ],
            ),
          ),
          if (_errorFa != null) ...<Widget>[
            const SizedBox(height: 12),
            BinaBanner(kind: BinaStatusKind.error, title: 'خطا', body: _errorFa!),
          ],
          const SizedBox(height: 16),
          BinaGradientButton(
            label: 'ارسال گزارش علائم',
            busy: _submitting,
            onPressed: _submitting ? null : _submit,
          ),
          const SizedBox(height: 12),
          BinaSecondaryButton(
            label: 'ویرایش پاسخ‌ها',
            onPressed: () => context.pop(),
          ),
        ],
      ),
    );
  }
}

class _AnswerRow extends StatelessWidget {
  const _AnswerRow({required this.label, required this.yes});
  final String label;
  final bool yes;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsDirectional.symmetric(vertical: 4),
      child: Row(
        children: <Widget>[
          Expanded(child: Text(label)),
          BinaStatusChip(
            kind: yes ? BinaStatusKind.error : BinaStatusKind.neutral,
            text: yes ? 'بله' : 'خیر',
          ),
        ],
      ),
    );
  }
}

/// SOS-07 `/help/symptoms/receipt`
class SymptomReceiptScreen extends StatelessWidget {
  const SymptomReceiptScreen({
    super.key,
    required this.payload,
  });

  final SymptomReceiptPayload? payload;

  @override
  Widget build(BuildContext context) {
    if (payload == null) {
      return _SosScaffold(
        title: 'رسید ثبت علائم',
        child: BinaEmptyState(
          icon: Icons.receipt_long_outlined,
          title: 'رسیدی انتخاب نشده است',
          message: 'برای وضعیت ارسال‌ها به بخش همگام‌سازی مراجعه کنید.',
          actionLabel: 'وضعیت همگام‌سازی',
          onAction: () => context.go('/account/sync'),
        ),
      );
    }

    final item = payload!;
    final isConfirmed = item.entry.status == OutboxSyncStatus.acknowledged;
    final eyeFa = item.eyeLaterality == EyeLaterality.oD ? 'چشم راست' : 'چشم چپ';

    return _SosScaffold(
      title: 'رسید ثبت علائم',
      showBack: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          if (item.hasRedFlag) ...<Widget>[
            _StaticUrgentSymptomCard(onCallUrgent: () => context.push('/help/urgent')),
            const SizedBox(height: 16),
          ],
          BinaReceipt(
            isServerConfirmed: isConfirmed,
            statusLabel: isConfirmed ? 'ارسال شد' : 'روی دستگاه ثبت شد؛ در انتظار ارسال',
            detailText: isConfirmed
                ? 'گزارش علائم برای $eyeFa ثبت و به کلینیک ارسال شد.'
                : 'گزارش روی این دستگاه ثبت شده و هنوز به کلینیک ارسال نشده است.',
          ),
          const SizedBox(height: 12),
          const BinaBanner(
            kind: BinaStatusKind.warning,
            title: 'توجه مهم',
            body: 'ارسال گزارش به معنی بررسی فوری توسط پزشک نیست. برای تماس از شماره ثبت‌شده کلینیک استفاده کنید.',
          ),
          const SizedBox(height: 16),
          BinaSecondaryButton(
            label: 'تماس با کلینیک / کمک فوری',
            icon: Icons.phone_in_talk_rounded,
            onPressed: () => context.push('/help/urgent'),
          ),
          const SizedBox(height: 12),
          BinaGradientButton(
            label: 'بازگشت به برنامه امروز',
            onPressed: () => context.go('/today'),
          ),
        ],
      ),
    );
  }
}
