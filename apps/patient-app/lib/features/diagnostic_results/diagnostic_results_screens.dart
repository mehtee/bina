import 'package:bina_api_dtos/bina_api_dtos.dart';
import 'package:bina_design_system/bina_design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/providers.dart';
import '../../core/data/patient_gateway.dart';
import '../../core/data/session_cache_repository.dart';
import '../../core/i18n/bina_i18n.dart';

@immutable
class DiagnosticResultsSnapshot {
  const DiagnosticResultsSnapshot({
    required this.summaries,
    required this.isFromOfflineCache,
    required this.cachedAtUtc,
  });

  final List<PatientDiagnosticSummary> summaries;
  final bool isFromOfflineCache;
  final DateTime cachedAtUtc;
}

class DiagnosticResultsController extends AsyncNotifier<DiagnosticResultsSnapshot> {
  @override
  Future<DiagnosticResultsSnapshot> build() async {
    final session = ref.watch(sessionProvider);
    if (session == null) {
      throw const PatientGatewayException(
        statusCode: 401,
        code: 'UNAUTHENTICATED',
        messageFa: 'برای مشاهده نتایج وارد شوید.',
      );
    }
    return _loadForSession(session);
  }

  Future<void> refresh() async {
    final session = ref.read(sessionProvider);
    if (session == null) return;
    state = await AsyncValue.guard(() => _loadForSession(session));
  }

  Future<DiagnosticResultsSnapshot> _loadForSession(AuthSessionContext session) async {
    final gw = ref.read(patientGatewayProvider);
    final cache = ref.read(sessionCacheRepositoryProvider);
    final partition = SessionCacheRepository.partitionFor(session);
    final outbox = ref.read(outboxQueueProvider);
    final reminders = ref.read(localReminderPortProvider);

    try {
      final list = await gw.listDiagnosticSummaries(session);
      final now = DateTime.now().toUtc();
      await cache.saveSignedSummaries(session, list, now);
      return DiagnosticResultsSnapshot(
        summaries: list.items,
        isFromOfflineCache: false,
        cachedAtUtc: now,
      );
    } on PatientGatewayException catch (err) {
      if (err.isUnauthorizedOrRevoked && session.actorType == 'caregiver') {
        await cache.purgeForSession(session);
        await outbox.purgePartition(partition);
        await reminders.cancelForPatient(tenantId: session.tenantId, patientId: session.patientId);
      }
      rethrow;
    } catch (_) {
      final cached = await cache.loadSignedSummaries(session);
      if (cached == null) rethrow;
      return DiagnosticResultsSnapshot(
        summaries: cached.data.items,
        isFromOfflineCache: true,
        cachedAtUtc: cached.cachedAtUtc,
      );
    }
  }
}

final diagnosticResultsControllerProvider =
    AsyncNotifierProvider<DiagnosticResultsController, DiagnosticResultsSnapshot>(
  DiagnosticResultsController.new,
);

/// Shared subpage frame for `/results/*` detail routes (`v2.1 §9.0A V10 & §9.7`).
class _ResultsSubpageScaffold extends StatelessWidget {
  const _ResultsSubpageScaffold({
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

BinaStatusKind _urgencyKind(UrgencyTier tier) => switch (tier) {
      UrgencyTier.routine => BinaStatusKind.success,
      UrgencyTier.followup36m => BinaStatusKind.info,
      UrgencyTier.urgent => BinaStatusKind.error,
    };

/// RES-01 `/results` & Reference V04 (`04-Results.png` — `v2.1 §9.0A & §9.7`).
class ResultsScreen extends ConsumerStatefulWidget {
  const ResultsScreen({
    super.key,
    this.previewMode = false,
  });

  final bool previewMode;

  @override
  ConsumerState<ResultsScreen> createState() => _ResultsScreenState();
}

class _ResultsScreenState extends ConsumerState<ResultsScreen> {
  String _previewSegment = 'all';
  String _eyeFilter = 'all';

  @override
  Widget build(BuildContext context) {
    if (widget.previewMode) {
      return _buildReferencePreview(context);
    }

    final session = ref.watch(sessionProvider);
    final resultsAsync = ref.watch(diagnosticResultsControllerProvider);

    return BinaCanvas(
      artVariant: BinaCanvasArtVariant.headerOnly,
      child: resultsAsync.when(
        loading: () => ListView(
          padding: const EdgeInsetsDirectional.all(16),
          children: const <Widget>[
            BinaSurface(child: Text('در حال بارگذاری خلاصه نتایج تأییدشده...')),
          ],
        ),
        error: (err, _) {
          final isCaregiverRevoked = err is PatientGatewayException &&
              err.isUnauthorizedOrRevoked &&
              session?.actorType == 'caregiver';
          return ListView(
            padding: const EdgeInsetsDirectional.all(16),
            children: <Widget>[
              if (isCaregiverRevoked)
                BinaBanner(
                  kind: BinaStatusKind.neutral,
                  title: 'دسترسی به نتایج پایان یافته است',
                  body: 'دسترسی مراقب برای این پرونده لغو شده است.',
                  actionLabel: 'وضعیت دسترسی',
                  onAction: () async {
                    await ref.read(sessionProvider.notifier).handleCaregiverRevoked();
                    if (context.mounted) context.go('/caregiver/revoked');
                  },
                )
              else
                BinaErrorState(
                  message: 'بارگذاری نتایج تأییدشده انجام نشد.',
                  onRetry: () => ref.read(diagnosticResultsControllerProvider.notifier).refresh(),
                  onOpenHelp: () => context.push('/help/urgent'),
                ),
            ],
          );
        },
        data: (snapshot) => _buildProductionResults(context, ref, snapshot),
      ),
    );
  }

  Widget _buildProductionResults(
    BuildContext context,
    WidgetRef ref,
    DiagnosticResultsSnapshot snapshot,
  ) {
    final p = context.binaPalette;
    final filtered = snapshot.summaries.where((s) {
      if (_eyeFilter == 'OD') return s.eyeLabelFa.contains('راست');
      if (_eyeFilter == 'OS') return s.eyeLabelFa.contains('چپ');
      return true;
    }).toList(growable: false);

    final urgentSummaries =
        snapshot.summaries.where((s) => s.urgencyTier == UrgencyTier.urgent).toList(growable: false);

    return ListView(
      padding: const EdgeInsetsDirectional.fromSTEB(16, 12, 16, 24),
      children: <Widget>[
        Row(
          children: <Widget>[
            Expanded(child: Text('نتایج', style: Theme.of(context).textTheme.headlineMedium)),
            TextButton.icon(
              onPressed: () => context.push('/help/urgent'),
              icon: Icon(Icons.phone_in_talk_rounded, color: p.urgentAction),
              label: Text('کمک فوری', style: TextStyle(color: p.urgentAction)),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (snapshot.isFromOfflineCache) ...<Widget>[
          BinaOfflineBanner(
            onRetry: () => ref.read(diagnosticResultsControllerProvider.notifier).refresh(),
          ),
          const SizedBox(height: 12),
        ],
        if (urgentSummaries.isNotEmpty) ...<Widget>[
          BinaUrgentActionCard(
            title: 'نتیجه نیازمند پیگیری فوری',
            body: urgentSummaries.first.patientGuidanceFa,
            ctaLabel: 'مشاهده خلاصه فوری و تماس با کلینیک',
            onCallPressed: () => context.push('/results/${urgentSummaries.first.studyId}'),
          ),
          const SizedBox(height: 14),
        ],
        if (snapshot.summaries.isEmpty) ...<Widget>[
          BinaEmptyState(
            icon: Icons.assignment_turned_in_outlined,
            title: 'هنوز گزارش تأییدشده‌ای در دسترس نیست',
            message:
                'نتایج تصویربرداری تنها پس از بررسی و تایید نهایی چشم‌پزشک در این بخش نمایش داده می‌شوند.',
            actionLabel: 'بروزرسانی',
            onAction: () => ref.read(diagnosticResultsControllerProvider.notifier).refresh(),
          ),
          const SizedBox(height: 12),
          BinaSecondaryButton(
            label: 'تماس با کلینیک / کمک فوری',
            icon: Icons.phone_in_talk_rounded,
            onPressed: () => context.push('/help/urgent'),
          ),
        ] else ...<Widget>[
          BinaSegments<String>(
            choices: const <String, String>{
              'all': 'همه',
              'OD': 'چشم راست',
              'OS': 'چشم چپ',
            },
            selected: _eyeFilter,
            onChanged: (val) => setState(() => _eyeFilter = val),
          ),
          const SizedBox(height: 16),
          Text('گزارش‌های تأییدشده پزشک', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 12),
          if (filtered.isEmpty)
            const BinaEmptyState(
              icon: Icons.filter_list_off_outlined,
              title: 'گزارشی برای این چشم ثبت نشده است',
              message: 'می‌توانید فیلتر بالا را روی «همه» قرار دهید.',
            )
          else
            for (final summary in filtered) ...<Widget>[
              BinaSurface(
                onTap: () => context.push('/results/${summary.studyId}'),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    Row(
                      children: <Widget>[
                        const BinaIconWell(
                          kind: BinaWellKind.plan,
                          icon: Icons.description_outlined,
                          size: 44,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              Text(summary.eyeLabelFa, style: Theme.of(context).textTheme.titleMedium),
                              Text(
                                'تایید پزشک: ${BinaI18nCatalog.isolateLtr(summary.signedAtJalali)}',
                                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: p.onSurfaceVariant),
                              ),
                            ],
                          ),
                        ),
                        BinaStatusChip(
                          kind: _urgencyKind(summary.urgencyTier),
                          text: summary.urgencyLabelFa,
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(summary.patientGuidanceFa, style: Theme.of(context).textTheme.bodyMedium),
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],
        ],
      ],
    );
  }

  /// Isolated V04 reference layout (`04-Results.png`).
  Widget _buildReferencePreview(BuildContext context) {
    final p = context.binaPalette;
    return BinaCanvas(
      artVariant: BinaCanvasArtVariant.headerOnly,
      child: ListView(
        padding: const EdgeInsetsDirectional.fromSTEB(16, 12, 16, 24),
        children: <Widget>[
          Text('نتایج', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 12),
          BinaSegments<String>(
            choices: const <String, String>{
              'all': 'همه',
              'iop': 'فشار چشم',
              'vf': 'میدان بینایی',
            },
            selected: _previewSegment,
            onChanged: (v) => setState(() => _previewSegment = v),
          ),
          const SizedBox(height: 16),
          BinaSurface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Text('خلاصه وضعیت (۳۰ روز اخیر)', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 12),
                LayoutBuilder(
                  builder: (context, constraints) {
                    final stackTiles =
                        constraints.maxWidth < 340 || MediaQuery.textScalerOf(context).scale(16) >= 24;
                    const t1 = BinaMetricTile(
                      label: 'فشار چشم (IOP)',
                      value: '۱۸٫۰',
                      unit: 'mmHg',
                      footer: 'میانگین دوره',
                      trailingVisual: BinaSparkline(
                        samples: <double>[18.8, 18.2, 17.9, 18.4, 18.0],
                        semanticLabel: 'روند فشار چشم',
                      ),
                    );
                    const t2 = BinaMetricTile(
                      label: 'میدان بینایی (VF)',
                      value: 'پایدار',
                      mintAccent: true,
                      footer: 'ارزیابی دوره‌ای',
                      trailingVisual: BinaSparkline(
                        samples: <double>[91, 92, 91.5, 92, 92],
                        semanticLabel: 'روند میدان بینایی',
                      ),
                    );
                    if (stackTiles) {
                      return const Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: <Widget>[t1, SizedBox(height: 12), t2],
                      );
                    }
                    return const Row(
                      children: <Widget>[
                        Expanded(child: t1),
                        SizedBox(width: 12),
                        Expanded(child: t2),
                      ],
                    );
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Text('آخرین گزارش‌ها', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 12),
          BinaRichRow(
            title: 'گزارش ترکیبی',
            subtitle: 'IOP + VF — ۱۴۰۵/۰۸/۲۹',
            wellKind: BinaWellKind.plan,
            icon: Icons.description_outlined,
            minHeight: 84,
            onTap: () {},
          ),
          const SizedBox(height: 12),
          BinaRichRow(
            title: 'گزارش میدان بینایی (VF)',
            subtitle: 'ارزیابی ۲۴-۲ — ۱۴۰۵/۰۸/۱۵',
            wellKind: BinaWellKind.test,
            icon: Icons.grid_view_rounded,
            minHeight: 84,
            trailing: Icon(Icons.chevron_right_rounded, color: p.onSurfaceVariant),
            showChevron: false,
            onTap: () {},
          ),
        ],
      ),
    );
  }
}

/// RES-02, RES-04, RES-05 `/results/:signedReportId` & V05 (`05-Combined-Report.png`).
class SignedReportDetailScreen extends ConsumerStatefulWidget {
  const SignedReportDetailScreen({
    super.key,
    required this.signedReportId,
    this.previewMode = false,
  });

  final String signedReportId;
  final bool previewMode;

  @override
  ConsumerState<SignedReportDetailScreen> createState() => _SignedReportDetailScreenState();
}

class _SignedReportDetailScreenState extends ConsumerState<SignedReportDetailScreen> {
  String _previewTab = 'summary';

  @override
  Widget build(BuildContext context) {
    if (widget.previewMode) {
      return _buildReferencePreview(context);
    }

    final resultsAsync = ref.watch(diagnosticResultsControllerProvider);
    return _ResultsSubpageScaffold(
      title: 'خلاصه تأییدشده پزشک',
      child: resultsAsync.when(
        loading: () => const BinaSurface(child: Text('در حال بارگذاری جزئیات گزارش...')),
        error: (_, _) => BinaErrorState(
          message: 'امکان دریافت جزئیات گزارش فراهم نشد.',
          onRetry: () => ref.read(diagnosticResultsControllerProvider.notifier).refresh(),
          onOpenHelp: () => context.push('/help/urgent'),
        ),
        data: (snapshot) {
          PatientDiagnosticSummary? summary;
          for (final item in snapshot.summaries) {
            if (item.studyId == widget.signedReportId) {
              summary = item;
              break;
            }
          }

          // RES-05 unavailable / replaced / unapproved guard
          if (summary == null) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                BinaEmptyState(
                  icon: Icons.assignment_late_outlined,
                  title: 'گزارش درخواستی در دسترس نیست یا بروزرسانی شده است',
                  message: 'تنها گزارش‌های تأییدشده و معتبر توسط چشم‌پزشک در دسترس بیمار قرار می‌گیرند.',
                  actionLabel: 'بروزرسانی نتایج',
                  onAction: () => ref.read(diagnosticResultsControllerProvider.notifier).refresh(),
                ),
                const SizedBox(height: 12),
                BinaSecondaryButton(
                  label: 'تماس با کلینیک / کمک فوری',
                  icon: Icons.phone_in_talk_rounded,
                  onPressed: () => context.push('/help/urgent'),
                ),
              ],
            );
          }

          final s = summary;
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              // RES-04 urgent non-dismissible action card first
              if (s.urgencyTier == UrgencyTier.urgent) ...<Widget>[
                BinaUrgentActionCard(
                  title: 'اقدام فوری مورد نیاز',
                  body: s.nextStepFa,
                  ctaLabel: 'کمک فوری و تماس با کلینیک',
                  onCallPressed: () => context.push('/help/urgent'),
                ),
                const SizedBox(height: 16),
              ],
              BinaSurface(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: <Widget>[
                        BinaEyeLabel(
                          eyeCode: s.eyeLabelFa.contains('چپ') ? 'OS' : 'OD',
                          fullPersianLabel: s.eyeLabelFa,
                        ),
                        BinaStatusChip(
                          kind: _urgencyKind(s.urgencyTier),
                          text: s.urgencyLabelFa,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text('تاریخ تایید پزشک: ${BinaI18nCatalog.isolateLtr(s.signedAtJalali)}'),
                    const Divider(height: 24),
                    Text('توصیه تاییدشده پزشک', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    Text(
                      s.patientGuidanceFa,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(height: 1.7),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              BinaBanner(
                kind: BinaStatusKind.info,
                title: 'پیگیری بعدی',
                body: s.nextStepFa,
              ),
              const SizedBox(height: 16),
              BinaGradientButton(
                label: 'جزئیات پیگیری و ویزیت بعدی',
                icon: Icons.event_note_outlined,
                onPressed: () => context.push('/results/${s.studyId}/follow-up'),
              ),
            ],
          );
        },
      ),
    );
  }

  /// Isolated V05 preview matching `05-Combined-Report.png`.
  Widget _buildReferencePreview(BuildContext context) {
    final p = context.binaPalette;
    return _ResultsSubpageScaffold(
      title: 'گزارش ترکیبی',
      includeFooterWave: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          BinaSegments<String>(
            choices: const <String, String>{
              'summary': 'خلاصه',
              'iop': 'فشار چشم',
              'vf': 'میدان بینایی',
            },
            selected: _previewTab,
            onChanged: (v) => setState(() => _previewTab = v),
          ),
          const SizedBox(height: 16),
          BinaHero(
            title: 'وضعیت کلی',
            status: 'پایدار',
            statusIcon: Icons.check,
            statusColor: p.success,
            subtitle: 'جمع‌بندی وضعیت در تاریخ ۱۴۰۵/۰۸/۲۹',
            artOnPhysicalLeft: false,
            minHeight: 204,
          ),
          const SizedBox(height: 20),
          Text('مقایسه با دوره قبل', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 12),
          LayoutBuilder(
            builder: (context, constraints) {
              final stackTiles =
                  constraints.maxWidth < 340 || MediaQuery.textScalerOf(context).scale(16) >= 24;
              const t1 = BinaMetricTile(
                label: 'میدان بینایی (MD)',
                value: '−۳٫۲',
                unit: 'dB',
                footer: 'تغییر: ±۰٫۱',
              );
              const t2 = BinaMetricTile(
                label: 'فشار چشم (IOP)',
                value: '۱۸٫۰',
                unit: 'mmHg',
                footer: 'تغییر: −۰٫۵',
              );
              if (stackTiles) {
                return const Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[t1, SizedBox(height: 12), t2],
                );
              }
              return const Row(
                children: <Widget>[
                  Expanded(child: t1),
                  SizedBox(width: 12),
                  Expanded(child: t2),
                ],
              );
            },
          ),
          const SizedBox(height: 24),
          BinaGradientButton(
            label: 'دانلود گزارش (PDF)',
            icon: Icons.download_rounded,
            onPressed: () {},
          ),
        ],
      ),
    );
  }
}

/// RES-03 `/results/:signedReportId/follow-up`: Distinguishes recommendation from booked date.
class ReportFollowUpScreen extends ConsumerWidget {
  const ReportFollowUpScreen({
    super.key,
    required this.signedReportId,
  });

  final String signedReportId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snapshot = ref.watch(diagnosticResultsControllerProvider).asData?.value;
    PatientDiagnosticSummary? summary;
    if (snapshot != null) {
      for (final item in snapshot.summaries) {
        if (item.studyId == signedReportId) {
          summary = item;
          break;
        }
      }
    }

    if (summary == null) {
      return _ResultsSubpageScaffold(
        title: 'پیگیری بعدی',
        child: BinaEmptyState(
          icon: Icons.event_busy_outlined,
          title: 'اطلاعات پیگیری یافت نشد',
          message: 'برای هماهنگی نوبت یا دریافت راهنمایی با پذیرش کلینیک تماس بگیرید.',
          actionLabel: 'کمک فوری و تماس',
          onAction: () => context.push('/help/urgent'),
        ),
      );
    }

    return _ResultsSubpageScaffold(
      title: 'برنامه پیگیری بعدی',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          BinaSurface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                BinaEyeLabel(
                  eyeCode: summary.eyeLabelFa.contains('چپ') ? 'OS' : 'OD',
                  fullPersianLabel: summary.eyeLabelFa,
                ),
                const SizedBox(height: 10),
                Text('توصیه پیگیری پزشک:', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 6),
                Text(summary.nextStepFa, style: Theme.of(context).textTheme.bodyLarge),
                const Divider(height: 24),
                Text(
                  'این مورد یک توصیه زمان‌بندی پزشک است و به‌طور خودکار نوبت تقویمی رزرو نشده است. برای تعیین روز و ساعت دقیق مراجعه با پذیرش کلینیک هماهنگ کنید.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: context.binaPalette.onSurfaceVariant,
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          BinaSecondaryButton(
            label: 'تماس با کلینیک / کمک فوری',
            icon: Icons.phone_in_talk_rounded,
            onPressed: () => context.push('/help/urgent'),
          ),
        ],
      ),
    );
  }
}

/// Strictly Preview-Only gated reference V07 (`07-VF-Detail.png` — `v2.1 §9.0A [G]`).
/// Never mounted in live patient production routes.
class VfDetailPreviewScreen extends StatefulWidget {
  const VfDetailPreviewScreen({super.key});

  @override
  State<VfDetailPreviewScreen> createState() => _VfDetailPreviewScreenState();
}

class _VfDetailPreviewScreenState extends State<VfDetailPreviewScreen> {
  String _tab = 'map';

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    return _ResultsSubpageScaffold(
      title: 'جزئیات میدان بینایی (VF)',
      includeFooterWave: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          BinaSegments<String>(
            choices: const <String, String>{
              'map': 'نقشه میدان',
              'trend': 'روند تغییرات',
            },
            selected: _tab,
            onChanged: (v) => setState(() => _tab = v),
          ),
          const SizedBox(height: 16),
          BinaSurface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Container(
                  constraints: const BoxConstraints(minHeight: 180),
                  padding: const EdgeInsetsDirectional.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(color: p.outlineVariant),
                  ),
                  alignment: Alignment.center,
                  child: const Directionality(
                    textDirection: TextDirection.ltr,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: <Widget>[
                        Icon(Icons.grid_on_rounded, size: 72, color: Color(0xFF334155)),
                        SizedBox(height: 8),
                        Text(
                          'نقشه مرجع مصنوعی ۲۴-۲ (فقط پیش‌نمایش)',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Color(0xFF334155)),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                const Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: <Widget>[
                    BinaStatusChip(kind: BinaStatusKind.neutral, text: 'مدل: ۲۴-۲'),
                    BinaStatusChip(kind: BinaStatusKind.info, text: 'MD −3.2 dB'),
                    BinaStatusChip(kind: BinaStatusKind.info, text: 'PSD 2.1 dB'),
                    BinaStatusChip(kind: BinaStatusKind.success, text: 'VFI 92% — پایدار'),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const BinaRichRow(
            title: 'نمای پیش‌نمایش تفسیری',
            subtitle: 'این صفحه صرفاً مرجع بصری (گیت‌شده) است و برای بیمار واقعی نمایش داده نمی‌شود.',
            wellKind: BinaWellKind.test,
            icon: Icons.analytics_outlined,
          ),
        ],
      ),
    );
  }
}

/// Strictly Preview-Only gated reference V08 (`08-IOP-Detail.png` — `v2.1 §9.0A [G]`).
/// Never mounted in live patient production routes.
class IopDetailPreviewScreen extends StatefulWidget {
  const IopDetailPreviewScreen({super.key});

  @override
  State<IopDetailPreviewScreen> createState() => _IopDetailPreviewScreenState();
}

class _IopDetailPreviewScreenState extends State<IopDetailPreviewScreen> {
  String _range = '30d';

  @override
  Widget build(BuildContext context) {
    return _ResultsSubpageScaffold(
      title: 'جزئیات فشار چشم (IOP)',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          BinaSegments<String>(
            choices: const <String, String>{
              '7d': '۷ روز',
              '30d': '۳۰ روز',
              '90d': '۹۰ روز',
            },
            selected: _range,
            onChanged: (v) => setState(() => _range = v),
          ),
          const SizedBox(height: 16),
          const BinaSurface(
            variant: BinaSurfaceVariant.chart,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Text('روند نمونه ۳۰ روزه (پیش‌نمایش گیت‌شده)'),
                SizedBox(height: 14),
                BinaSparkline(
                  samples: <double>[18.5, 19.2, 17.8, 18.0, 17.6, 18.0],
                  semanticLabel: 'نمودار فشار چشم پیش‌نمایش',
                  width: 300,
                  height: 96,
                ),
                SizedBox(height: 8),
                Text('\u206618.0 mmHg\u2069'),
              ],
            ),
          ),
          const SizedBox(height: 14),
          LayoutBuilder(
            builder: (context, constraints) {
              final stackStats =
                  constraints.maxWidth < 340 || MediaQuery.textScalerOf(context).scale(16) >= 24;
              const s1 = BinaStatTile(
                label: 'میانگین',
                value: '۱۸٫۰',
                unit: 'mmHg',
                icon: Icons.show_chart_rounded,
              );
              const s2 = BinaStatTile(
                label: 'بیشترین',
                value: '۱۹٫۲',
                unit: 'mmHg',
                icon: Icons.arrow_upward_rounded,
              );
              const s3 = BinaStatTile(
                label: 'کمترین',
                value: '۱۷٫۶',
                unit: 'mmHg',
                icon: Icons.arrow_downward_rounded,
              );
              if (stackStats) {
                return const Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[s1, SizedBox(height: 8), s2, SizedBox(height: 8), s3],
                );
              }
              return const Row(
                children: <Widget>[
                  Expanded(child: s1),
                  SizedBox(width: 8),
                  Expanded(child: s2),
                  SizedBox(width: 8),
                  Expanded(child: s3),
                ],
              );
            },
          ),
          const SizedBox(height: 16),
          const Align(
            alignment: Alignment.centerRight,
            child: BinaIrisArtwork(width: 150, height: 120, fadeTowardPhysicalRight: false),
          ),
        ],
      ),
    );
  }
}
