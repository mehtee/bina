import 'package:bina_api_dtos/bina_api_dtos.dart';
import 'package:bina_design_system/bina_design_system.dart';
import 'package:bina_offline_store/bina_offline_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/providers.dart';
import 'care_plan_controller.dart';

/// Shared detail scaffold for `/care/*` screens (`v2.1 §9.0A V10 & §9.2`).
class CareSubpageScaffold extends StatelessWidget {
  const CareSubpageScaffold({
    super.key,
    required this.title,
    required this.child,
    this.includeFooterWave = false,
  });

  final String title;
  final Widget child;
  final bool includeFooterWave;

  @override
  Widget build(BuildContext context) {
    return BinaCanvas(
      artVariant: includeFooterWave
          ? BinaCanvasArtVariant.headerAndFooter
          : BinaCanvasArtVariant.headerOnly,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: BinaAppBar(
          title: title,
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
                child: child,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// CARE-02 `/care` & Reference V02 (`02-Care.png`).
class CareHubScreen extends StatelessWidget {
  const CareHubScreen({
    super.key,
    this.previewMode = false,
  });

  final bool previewMode;

  @override
  Widget build(BuildContext context) {
    return BinaCanvas(
      artVariant: BinaCanvasArtVariant.care,
      child: ListView(
        padding: const EdgeInsetsDirectional.fromSTEB(16, 12, 16, 24),
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(child: Text('مراقبت', style: Theme.of(context).textTheme.headlineMedium)),
              if (!previewMode)
                TextButton.icon(
                  onPressed: () => context.push('/help/urgent'),
                  icon: Icon(Icons.phone_in_talk_rounded, color: context.binaPalette.urgentAction),
                  label: Text(
                    'کمک فوری',
                    style: TextStyle(color: context.binaPalette.urgentAction),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          BinaRichRow(
            title: 'داروها',
            subtitle: 'مدیریت داروها و یادآوری مصرف',
            wellKind: BinaWellKind.medication,
            icon: Icons.medication_outlined,
            minHeight: 88,
            wellSize: 56,
            onTap: previewMode ? () {} : () => context.push('/care/medications'),
          ),
          const SizedBox(height: 14),
          BinaRichRow(
            title: 'برنامه درمان',
            subtitle: 'طرح درمان و توصیه‌های پزشک',
            wellKind: BinaWellKind.plan,
            icon: Icons.calendar_today_outlined,
            minHeight: 88,
            wellSize: 56,
            onTap: previewMode ? () {} : () => context.push('/care/instructions'),
          ),
          const SizedBox(height: 14),
          BinaRichRow(
            title: 'آموزش و راهنما',
            subtitle: 'مطالب آموزشی متناسب با شما',
            wellKind: BinaWellKind.education,
            icon: Icons.school_outlined,
            minHeight: 88,
            wellSize: 56,
            onTap: previewMode ? () {} : () => context.push('/care/education'),
          ),
          if (!previewMode) ...<Widget>[
            const SizedBox(height: 14),
            BinaRichRow(
              title: 'تاریخچه مصرف داروها',
              subtitle: 'گزارش ثبت‌های قبلی به تفکیک هر چشم',
              wellKind: BinaWellKind.neutral,
              icon: Icons.history_rounded,
              minHeight: 76,
              wellSize: 48,
              onTap: () => context.push('/care/history'),
            ),
          ],
          const SizedBox(height: 20),
          BinaHero(
            title: 'مراقبت بهتر از چشم‌ها',
            subtitle: previewMode
                ? 'با رعایت برنامه درمان، سلامت بینایی خود را حفظ کنید.'
                : 'اجرای دقیق زمان‌بندی قطره‌ها برای چشم راست و چشم چپ به بهبود روند مراقبت کمک می‌کند.',
            minHeight: 168,
          ),
        ],
      ),
    );
  }
}

/// Eye-grouped medication list `/care/medications`.
class MedicationsListScreen extends ConsumerWidget {
  const MedicationsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final planAsync = ref.watch(carePlanControllerProvider);
    return CareSubpageScaffold(
      title: 'داروها',
      child: planAsync.when(
        loading: () => const Center(child: Text('در حال بارگذاری داروها...')),
        error: (_, _) => BinaErrorState(
          message: 'بارگذاری فهرست داروها انجام نشد.',
          onRetry: () => ref.read(carePlanControllerProvider.notifier).refreshPlan(),
        ),
        data: (snapshot) {
          final items = snapshot.todayPlan.scheduleItems;
          if (items.isEmpty) {
            return const BinaEmptyState(
              icon: Icons.medication_outlined,
              title: 'دارویی ثبت نشده است',
              message: 'در حال حاضر داروی فعالی برای شما در این کلینیک صادر نشده است.',
            );
          }
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              for (var i = 0; i < items.length; i += 1) ...<Widget>[
                BinaRichRow(
                  title: '${items[i].drugNameFa} (${items[i].eyeLabelFa})',
                  subtitle: '${items[i].bottleCapColorFa} • نسخه ${items[i].prescriptionVersion}',
                  wellKind: BinaWellKind.medication,
                  icon: Icons.water_drop_outlined,
                  onTap: () => context.push('/care/dose/${buildDoseRouteKey(items[i], i)}'),
                ),
                const SizedBox(height: 12),
              ],
            ],
          );
        },
      ),
    );
  }
}

/// CARE-03 `/care/episode/:episodeId`
class EpisodeDetailScreen extends ConsumerWidget {
  const EpisodeDetailScreen({super.key, required this.episodeId});
  final String episodeId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final planAsync = ref.watch(carePlanControllerProvider);
    return CareSubpageScaffold(
      title: 'پرونده مراقبتی چشم',
      child: planAsync.when(
        loading: () => const Center(child: Text('در حال بارگذاری...')),
        error: (_, _) => const BinaErrorState(message: 'اطلاعات پرونده در دسترس نیست.'),
        data: (snapshot) {
          final match = snapshot.episodes.where((e) => e.episode.episodeId == episodeId).firstOrNull;
          if (match == null) {
            return const BinaEmptyState(
              icon: Icons.folder_off_outlined,
              title: 'پرونده یافت نشد',
              message: 'این پرونده در نشست فعلی موجود نیست.',
            );
          }
          final ep = match.episode;
          final rx = match.activePrescription;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              BinaSurface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    BinaEyeLabel(eyeCode: ep.eyeLaterality.value, fullPersianLabel: ep.eyeLabelFa),
                    const SizedBox(height: 10),
                    Text('پروتکل: ${ep.protocolType}', style: Theme.of(context).textTheme.titleMedium),
                    Text('نسخه فعال: ${ep.activePrescriptionVersion}'),
                    Text('وضعیت پرونده: ${ep.status}'),
                  ],
                ),
              ),
              if (rx != null) ...<Widget>[
                const SizedBox(height: 16),
                for (final item in rx.items) ...<Widget>[
                  BinaSurface(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(item.drugNameFa, style: Theme.of(context).textTheme.titleLarge),
                        Text('\u2066${item.genericName}\u2069 • ${item.bottleCapColorFa}'),
                        const SizedBox(height: 6),
                        Text(item.instructionsFa ?? 'طبق دستور چشم‌پزشک'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 10),
                ],
              ],
            ],
          );
        },
      ),
    );
  }
}

/// CARE-04 / CARE-05 `/care/dose/:doseId` & `/care/medication/:medicationId` (`06-Medication-Detail.png`).
class MedicationDetailScreen extends ConsumerWidget {
  const MedicationDetailScreen({
    super.key,
    required this.doseOrMedicationKey,
    this.previewMode = false,
  });

  final String doseOrMedicationKey;
  final bool previewMode;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (previewMode) {
      return _buildPreview(context);
    }

    final planAsync = ref.watch(carePlanControllerProvider);
    return CareSubpageScaffold(
      title: 'جزئیات دارو',
      includeFooterWave: true,
      child: planAsync.when(
        loading: () => const Center(child: Text('در حال بارگذاری جزئیات دارو...')),
        error: (_, _) => const BinaErrorState(message: 'دریافت جزئیات دارو میسر نشد.'),
        data: (snapshot) {
          final card = snapshot.findCardByRouteKey(doseOrMedicationKey) ??
              snapshot.todayPlan.scheduleItems.firstOrNull;
          if (card == null) {
            return const BinaEmptyState(
              icon: Icons.medication_outlined,
              title: 'نوبت دارویی یافت نشد',
              message: 'لطفاً به برنامه امروز برگردید.',
            );
          }

          final pending = snapshot.latestOutboxForCard(card);
          final eyeKey = '${card.episodeId}::${card.eyeLaterality.value}';
          final reminderOn =
              snapshot.reminderPermissionGranted && (snapshot.remindersEnabledByEye[eyeKey] ?? false);

          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              _buildHeroCard(
                context,
                drugName: card.drugNameFa,
                subtitle: '${card.eyeLabelFa} • ${card.bottleCapColorFa} • نسخه ${card.prescriptionVersion}',
                activeLabel: 'داروی فعال',
              ),
              const SizedBox(height: 12),
              BinaRichRow(
                title: 'روش مصرف',
                subtitle: '${card.scheduledTimeJalali} — ${card.instructionsFa}',
                wellKind: BinaWellKind.neutral,
                icon: Icons.schedule_rounded,
                showChevron: false,
              ),
              const SizedBox(height: 12),
              BinaSwitchRow(
                title: 'یادآوری مصرف (${card.eyeLabelFa})',
                subtitle: snapshot.reminderPermissionGranted
                    ? 'یادآور محلی بدون افشای نام دارو'
                    : 'مجوز یادآور سیستم فعال نیست',
                value: reminderOn,
                onChanged: (desired) async {
                  final ok = await ref.read(carePlanControllerProvider.notifier).toggleEyeReminder(
                        episodeId: card.episodeId,
                        eye: card.eyeLaterality,
                        desiredEnabled: desired,
                      );
                  if (!ok && desired && context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('مجوز اعلان سیستم برای فعال‌سازی یادآور لازم است.')),
                    );
                  }
                },
              ),
              const SizedBox(height: 12),
              BinaRichRow(
                title: 'دستور پزشک',
                subtitle: card.instructionsFa,
                wellKind: BinaWellKind.plan,
                icon: Icons.description_outlined,
                showChevron: false,
              ),
              const SizedBox(height: 12),
              const BinaExpandableRow(
                title: 'اطلاعات بیشتر',
                content:
                    'بین دو قطره متفاوت حداقل ۵ دقیقه فاصله بگذارید. از تماس نوک قطره‌چکان با چشم یا مژه‌ها خودداری کنید و هرگز بدون دستور پزشک دوز دارو را تغییر ندهید.',
              ),
              if (pending != null) ...<Widget>[
                const SizedBox(height: 12),
                BinaReceipt(
                  isServerConfirmed: pending.status == OutboxSyncStatus.acknowledged,
                  statusLabel: pending.status == OutboxSyncStatus.acknowledged
                      ? 'ثبت شده و ارسال شد'
                      : 'ثبت محلی؛ در انتظار ارسال',
                  detailText: 'نوبت ثبت‌شده برای ${card.eyeLabelFa} ذخیره شده است.',
                ),
              ],
              const SizedBox(height: 20),
              BinaGradientButton(
                label: 'ثبت مصرف',
                icon: Icons.check,
                onPressed: () => context.push('/care/dose/$doseOrMedicationKey/record'),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildHeroCard(
    BuildContext context, {
    required String drugName,
    required String subtitle,
    required String activeLabel,
  }) {
    return BinaSurface(
      variant: BinaSurfaceVariant.hero,
      child: Directionality(
        textDirection: TextDirection.ltr,
        child: Row(
          children: <Widget>[
            const BinaVectorArt.dropper(size: 88),
            const SizedBox(width: 14),
            Expanded(
              child: Directionality(
                textDirection: TextDirection.rtl,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(drugName, style: Theme.of(context).textTheme.headlineSmall),
                    const SizedBox(height: 4),
                    Text(subtitle, style: Theme.of(context).textTheme.bodyMedium),
                    const SizedBox(height: 10),
                    BinaStatusChip(kind: BinaStatusKind.success, text: activeLabel),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Isolated reference preview matching `06-Medication-Detail.png` (`v2.1 §9.0A V06`).
  Widget _buildPreview(BuildContext context) {
    return CareSubpageScaffold(
      title: 'جزئیات دارو',
      includeFooterWave: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          _buildHeroCard(
            context,
            drugName: 'لاتانوپروست',
            subtitle: 'قطره چشمی ۰٫۰۰۵٪',
            activeLabel: 'داروی فعال',
          ),
          const SizedBox(height: 12),
          const BinaRichRow(
            title: 'روش مصرف',
            subtitle: 'روزی ۱ بار، شب (۲۲:۰۰)',
            wellKind: BinaWellKind.neutral,
            icon: Icons.schedule_rounded,
            showChevron: false,
          ),
          const SizedBox(height: 12),
          BinaSwitchRow(
            title: 'یادآوری مصرف',
            value: true,
            onChanged: (_) {},
          ),
          const SizedBox(height: 12),
          const BinaRichRow(
            title: 'دستور پزشک',
            subtitle: 'هر شب، یک قطره در چشم، ۱ قطره.',
            wellKind: BinaWellKind.plan,
            icon: Icons.description_outlined,
            showChevron: false,
          ),
          const SizedBox(height: 12),
          const BinaExpandableRow(
            title: 'اطلاعات بیشتر',
            content: 'پیش‌نمایش طراحی صفحه جزئیات دارو.',
          ),
          const SizedBox(height: 20),
          BinaGradientButton(
            label: 'ثبت مصرف',
            icon: Icons.check,
            onPressed: () {},
          ),
        ],
      ),
    );
  }
}

/// CARE-06..08 `/care/dose/:doseId/record` — explicit 3 patient-recordable states + confirmation.
class DoseRecordScreen extends ConsumerStatefulWidget {
  const DoseRecordScreen({super.key, required this.doseKey});
  final String doseKey;

  @override
  ConsumerState<DoseRecordScreen> createState() => _DoseRecordScreenState();
}

class _DoseRecordScreenState extends ConsumerState<DoseRecordScreen> {
  AdherenceState _selected = AdherenceState.taken;
  String _selectedReason = 'فراموشی نوبت';
  bool _submitting = false;

  static const List<String> _missedReasons = <String>[
    'فراموشی نوبت',
    'سوزش یا ناراحتی موقت چشم',
    'بسته بودن یا گم شدن قطره',
    'سایر موارد',
  ];

  @override
  Widget build(BuildContext context) {
    final planAsync = ref.watch(carePlanControllerProvider);

    return CareSubpageScaffold(
      title: 'ثبت وضعیت مصرف',
      child: planAsync.when(
        loading: () => const Center(child: Text('در حال آماده‌سازی...')),
        error: (_, _) => const BinaErrorState(message: 'امکان بارگذاری نوبت وجود ندارد.'),
        data: (snapshot) {
          final card = snapshot.findCardByRouteKey(widget.doseKey) ??
              snapshot.todayPlan.scheduleItems.firstOrNull;
          if (card == null) {
            return const BinaEmptyState(
              icon: Icons.medication_outlined,
              title: 'نوبت نامعتبر',
              message: 'این نوبت در برنامه فعلی وجود ندارد.',
            );
          }

          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              BinaSurface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    BinaEyeLabel(eyeCode: card.eyeLaterality.value, fullPersianLabel: card.eyeLabelFa),
                    const SizedBox(height: 8),
                    Text(card.drugNameFa, style: Theme.of(context).textTheme.titleLarge),
                    Text(card.scheduledTimeJalali, style: Theme.of(context).textTheme.bodyMedium),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              BinaSurface(
                padding: const EdgeInsetsDirectional.symmetric(vertical: 8, horizontal: 4),
                child: RadioGroup<AdherenceState>(
                  groupValue: _selected,
                  onChanged: (val) {
                    if (val != null) setState(() => _selected = val);
                  },
                  child: const Column(
                    children: <Widget>[
                      RadioListTile<AdherenceState>(
                        value: AdherenceState.taken,
                        title: Text('مصرف شد'),
                        subtitle: Text('قطره مطابق دستور در چشم ریخته شد'),
                      ),
                      RadioListTile<AdherenceState>(
                        value: AdherenceState.missedWithReason,
                        title: Text('مصرف نشد'),
                        subtitle: Text('با ثبت علت (بدون جبران خودسرانه دوز)'),
                      ),
                      RadioListTile<AdherenceState>(
                        value: AdherenceState.unavailable,
                        title: Text('دارو در دسترس نبود'),
                        subtitle: Text('دارو تمام شده یا در دسترس نیست'),
                      ),
                    ],
                  ),
                ),
              ),
              if (_selected == AdherenceState.missedWithReason) ...<Widget>[
                const SizedBox(height: 12),
                BinaSurface(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text('علت عدم مصرف', style: Theme.of(context).textTheme.titleSmall),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: <Widget>[
                          for (final r in _missedReasons)
                            ChoiceChip(
                              label: Text(r),
                              selected: _selectedReason == r,
                              onSelected: (_) => setState(() => _selectedReason = r),
                            ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'توجه: در صورت جا افتادن یک نوبت، هرگز دوز بعدی را دو برابر نکنید و طبق دستور پزشک ادامه دهید.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 20),
              BinaGradientButton(
                label: 'تایید و ثبت وضعیت',
                icon: Icons.check_circle_outline_rounded,
                busy: _submitting,
                onPressed: () async {
                  setState(() => _submitting = true);
                  try {
                    final entry = await ref.read(carePlanControllerProvider.notifier).recordDoseAdherence(
                          card: card,
                          outcomeState: _selected,
                          reasonFa: _selected == AdherenceState.missedWithReason ? _selectedReason : null,
                        );
                    if (context.mounted) {
                      context.go('/care/receipt/${entry.idempotencyKey}', extra: entry);
                    }
                  } finally {
                    if (mounted) setState(() => _submitting = false);
                  }
                },
              ),
            ],
          );
        },
      ),
    );
  }
}

/// CARE-09 `/care/receipt/:eventId` — honest local save vs server ack receipt.
class DoseReceiptScreen extends StatelessWidget {
  const DoseReceiptScreen({
    super.key,
    required this.eventId,
    this.entry,
  });

  final String eventId;
  final OutboxEntry? entry;

  @override
  Widget build(BuildContext context) {
    final acknowledged = entry?.status == OutboxSyncStatus.acknowledged;
    final statusLabel = acknowledged ? 'ارسال شد' : 'ثبت شد؛ در انتظار ارسال';
    final eyeFa = entry?.eyeLaterality == 'OD'
        ? 'چشم راست'
        : (entry?.eyeLaterality == 'OS' ? 'چشم چپ' : 'پرونده فعال');

    return CareSubpageScaffold(
      title: 'رسید ثبت دارو',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          BinaReceipt(
            isServerConfirmed: acknowledged,
            statusLabel: statusLabel,
            detailText: acknowledged
                ? 'ثبت مصرف برای $eyeFa با موفقیت در پرونده کلینیک ثبت شد.'
                : 'این ثبت به‌صورت امن روی دستگاه ذخیره شده و به محض اتصال به اینترنت با شناسه یکتا ارسال خواهد شد.',
            timestampLabel: entry?.createdAtUtc.toLocal().toString().substring(0, 16),
          ),
          const SizedBox(height: 20),
          BinaGradientButton(
            label: 'بازگشت به برنامه امروز',
            onPressed: () => context.go('/today'),
          ),
        ],
      ),
    );
  }
}

/// CARE-10 `/care/history`
class AdherenceHistoryScreen extends ConsumerWidget {
  const AdherenceHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final gw = ref.watch(patientGatewayProvider);
    final planAsync = ref.watch(carePlanControllerProvider);

    return CareSubpageScaffold(
      title: 'تاریخچه مصرف داروها',
      child: (session == null || !planAsync.hasValue)
          ? const Center(child: Text('در حال بارگذاری...'))
          : Builder(
              builder: (context) {
                final eps = planAsync.requireValue.episodes;
                if (eps.isEmpty) {
                  return const BinaEmptyState(
                    icon: Icons.history_rounded,
                    title: 'تاریخچه‌ای ثبت نشده است',
                    message: 'هنوز سابقه‌ای برای نمایش وجود ندارد.',
                  );
                }
                final firstEp = eps.first.episode;
                return FutureBuilder<AdherenceEventListResponse>(
                  future: gw.listMedicationAdherence(session: session, episodeId: firstEp.episodeId),
                  builder: (context, snap) {
                    if (snap.connectionState == ConnectionState.waiting) {
                      return const Center(child: Text('در حال دریافت تاریخچه...'));
                    }
                    final items = snap.data?.items ?? const <AdherenceEventResponse>[];
                    if (items.isEmpty) {
                      return const BinaEmptyState(
                        icon: Icons.history_rounded,
                        title: 'موردی ثبت نشده است',
                        message: 'پس از ثبت اولین نوبت دارو، تاریخچه در اینجا نمایش داده می‌شود.',
                      );
                    }
                    return Column(
                      children: <Widget>[
                        for (final ev in items) ...<Widget>[
                          BinaSurface(
                            child: ListTile(
                              title: Text(_stateLabel(ev.state)),
                              subtitle: Text('چشم: ${firstEp.eyeLabelFa} • زمان: ${ev.recordedAt}'),
                            ),
                          ),
                          const SizedBox(height: 8),
                        ],
                      ],
                    );
                  },
                );
              },
            ),
    );
  }

  String _stateLabel(AdherenceState s) => switch (s) {
        AdherenceState.taken => 'مصرف شد',
        AdherenceState.missedWithReason => 'مصرف نشد',
        AdherenceState.unavailable => 'دارو در دسترس نبود',
        AdherenceState.noResponse => 'پاسخی دریافت نشد',
      };
}

/// CARE-11 `/care/instructions`
class CareInstructionsScreen extends ConsumerWidget {
  const CareInstructionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final planAsync = ref.watch(carePlanControllerProvider);
    return CareSubpageScaffold(
      title: 'برنامه درمان و دستور پزشک',
      child: planAsync.when(
        loading: () => const Center(child: Text('در حال بارگذاری...')),
        error: (_, _) => const BinaErrorState(message: 'دریافت برنامه درمان ممکن نشد.'),
        data: (snapshot) {
          if (snapshot.episodes.isEmpty) {
            return const BinaEmptyState(
              icon: Icons.assignment_outlined,
              title: 'برنامه درمانی فعالی یافت نشد',
              message: 'برای صدور یا بررسی نسخه با کلینیک تماس بگیرید.',
            );
          }
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              for (final epPair in snapshot.episodes) ...<Widget>[
                BinaRichRow(
                  title: 'برنامه مراقبت ${epPair.episode.eyeLabelFa}',
                  subtitle: 'نسخه ${epPair.episode.activePrescriptionVersion} • وضعیت: ${epPair.episode.status}',
                  wellKind: BinaWellKind.plan,
                  icon: Icons.visibility_outlined,
                  onTap: () => context.push('/care/episode/${epPair.episode.episodeId}'),
                ),
                const SizedBox(height: 12),
              ],
            ],
          );
        },
      ),
    );
  }
}

/// CARE-13 `/care/reminder/:episodeId/:eye/:version` — rejects superseded versions cleanly.
class DoseReminderEntryScreen extends ConsumerWidget {
  const DoseReminderEntryScreen({
    super.key,
    required this.episodeId,
    required this.eyeCode,
    required this.notifiedVersion,
  });

  final String episodeId;
  final String eyeCode;
  final int notifiedVersion;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final planAsync = ref.watch(carePlanControllerProvider);
    final eyeFa = eyeCode.toUpperCase() == 'OS' ? 'چشم چپ' : 'چشم راست';
    return CareSubpageScaffold(
      title: 'یادآور مصرف دارو ($eyeFa)',
      child: planAsync.when(
        loading: () => const BinaSurface(child: Text('در حال بررسی نسخه فعال...')),
        error: (_, _) => BinaErrorState(
          message: 'امکان بررسی یادآور وجود ندارد.',
          onOpenHelp: () => context.push('/help/urgent'),
        ),
        data: (snapshot) {
          PatientTodayDropCard? match;
          for (var i = 0; i < snapshot.todayPlan.scheduleItems.length; i += 1) {
            final item = snapshot.todayPlan.scheduleItems[i];
            if (item.episodeId == episodeId &&
                item.eyeLaterality.value == eyeCode.toUpperCase()) {
              match = item;
              break;
            }
          }

          if (match == null) {
            return BinaEmptyState(
              icon: Icons.notifications_off_outlined,
              title: 'این یادآور دیگر در برنامه فعال نیست',
              message: 'برنامه فعلی خود را از صفحه امروز بررسی کنید.',
              actionLabel: 'رفتن به برنامه امروز',
              onAction: () => context.go('/today'),
            );
          }

          if (match.prescriptionVersion != notifiedVersion) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                BinaBanner(
                  kind: BinaStatusKind.warning,
                  title: 'نسخه داروی $eyeFa بروزرسانی شده است',
                  body:
                      'این یادآور مربوط به نسخه قبلی (نسخه $notifiedVersion) است. هم‌اکنون نسخه ${match.prescriptionVersion} فعال است و از دوز قبلی صرف‌نظر شد.',
                ),
                const SizedBox(height: 16),
                BinaGradientButton(
                  label: 'مشاهده برنامه فعلی امروز',
                  onPressed: () => context.go('/today'),
                ),
              ],
            );
          }

          final idx = snapshot.todayPlan.scheduleItems.indexOf(match);
          final key = buildDoseRouteKey(match, idx);
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              BinaDoseCard(
                eyeLabelFa: '${match.eyeLabelFa} — نسخه ${match.prescriptionVersion}',
                drugNameFa: match.drugNameFa,
                bottleCapColorFa: match.bottleCapColorFa,
                scheduledTimeLabel: match.scheduledTimeJalali,
                instructionsFa: match.instructionsFa,
                statusText: match.taken ? 'مصرف شد' : 'در انتظار ثبت',
                statusKind: match.taken ? BinaStatusKind.success : BinaStatusKind.info,
                actionLabel: 'ادامه و ثبت مصرف',
                onOpen: () => context.go('/care/dose/$key/record'),
              ),
            ],
          );
        },
      ),
    );
  }
}
