import 'package:bina_api_dtos/bina_api_dtos.dart';
import 'package:bina_design_system/bina_design_system.dart';
import 'package:bina_offline_store/bina_offline_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/providers.dart';
import '../../core/data/patient_gateway.dart';
import '../../core/i18n/bina_i18n.dart';
import 'care_plan_controller.dart';

/// CARE-01 `/today` & Reference V01 (`01-Today.png` — `v2.1 §9.0A & §9.2`).
class TodayScreen extends ConsumerWidget {
  const TodayScreen({
    super.key,
    this.previewMode = false,
  });

  final bool previewMode;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (previewMode) {
      return _buildReferencePreview(context);
    }

    final session = ref.watch(sessionProvider);
    final planAsync = ref.watch(carePlanControllerProvider);

    return BinaCanvas(
      artVariant: BinaCanvasArtVariant.today,
      child: planAsync.when(
        loading: () => ListView(
          padding: const EdgeInsetsDirectional.fromSTEB(16, 12, 16, 24),
          children: <Widget>[
            _TodayTopHeader(
              greetingFa: session?.actorType == 'caregiver' ? 'برنامه مراقبت بیمار' : 'برنامه مراقبت امروز',
              dateJalaliFa: 'در حال آماده‌سازی',
              isCaregiver: session?.actorType == 'caregiver',
              onOpenUrgent: () => context.push('/help/urgent'),
              onOpenNotifications: () => context.push('/account/notifications'),
              onOpenAccount: () => context.go('/account'),
            ),
            const SizedBox(height: 16),
            const BinaSurface(
              child: Text('در حال بارگذاری برنامه امروز...'),
            ),
          ],
        ),
        error: (err, _) {
          final isCaregiverRevoked = err is PatientGatewayException &&
              err.isUnauthorizedOrRevoked &&
              session?.actorType == 'caregiver';
          return ListView(
            padding: const EdgeInsetsDirectional.all(16),
            children: <Widget>[
              _TodayTopHeader(
                greetingFa: 'برنامه مراقبت',
                dateJalaliFa: isCaregiverRevoked ? 'دسترسی پایان یافته' : 'در انتظار همگام‌سازی',
                isCaregiver: session?.actorType == 'caregiver',
                onOpenUrgent: () => context.push('/help/urgent'),
                onOpenNotifications: () => context.push('/account/notifications'),
                onOpenAccount: () => context.go('/account'),
              ),
              const SizedBox(height: 16),
              if (isCaregiverRevoked)
                BinaBanner(
                  kind: BinaStatusKind.neutral,
                  title: 'دسترسی به این پرونده پایان یافته است',
                  body: 'دسترسی مراقب برای این بیمار لغو شده و داده‌های کش‌شده پاک شدند.',
                  actionLabel: 'مشاهده وضعیت دسترسی',
                  onAction: () async {
                    await ref.read(sessionProvider.notifier).handleCaregiverRevoked();
                    if (context.mounted) context.go('/caregiver/revoked');
                  },
                )
              else
                BinaErrorState(
                  message: 'امکان دریافت برنامه درمان فراهم نشد. در صورت نیاز فوری با اورژانس تماس بگیرید.',
                  onRetry: () => ref.read(carePlanControllerProvider.notifier).refreshPlan(),
                  onOpenHelp: () => context.push('/help/urgent'),
                ),
            ],
          );
        },
        data: (snapshot) => _buildProductionToday(context, ref, snapshot, session?.actorType == 'caregiver'),
      ),
    );
  }

  Widget _buildProductionToday(
    BuildContext context,
    WidgetRef ref,
    CarePlanSnapshot snapshot,
    bool isCaregiver,
  ) {
    final plan = snapshot.todayPlan;
    final odCards = <({int idx, PatientTodayDropCard card})>[];
    final osCards = <({int idx, PatientTodayDropCard card})>[];

    for (var i = 0; i < plan.scheduleItems.length; i += 1) {
      final item = plan.scheduleItems[i];
      if (item.eyeLaterality == EyeLaterality.oD) {
        odCards.add((idx: i, card: item));
      } else {
        osCards.add((idx: i, card: item));
      }
    }

    var recordedCount = 0;
    for (final c in plan.scheduleItems) {
      final local = snapshot.latestOutboxForCard(c);
      if (c.taken || local != null) recordedCount += 1;
    }

    return ListView(
      padding: const EdgeInsetsDirectional.fromSTEB(16, 12, 16, 24),
      children: <Widget>[
        _TodayTopHeader(
          greetingFa: isCaregiver ? 'برنامه مراقبت بیمار' : 'برنامه مراقبت امروز',
          dateJalaliFa: 'امروز ${plan.todayJalali}',
          isCaregiver: isCaregiver,
          onOpenUrgent: () => context.push('/help/urgent'),
          onOpenNotifications: () => context.push('/account/notifications'),
          onOpenAccount: () => context.go('/account'),
        ),
        const SizedBox(height: 8),
        const Directionality(
          textDirection: TextDirection.ltr,
          child: Align(
            alignment: Alignment.centerLeft,
            child: BinaBrandMark(full: true, height: 32),
          ),
        ),
        if (snapshot.isFromOfflineCache) ...<Widget>[
          const SizedBox(height: 10),
          BinaOfflineBanner(
            lastUpdatedLabel: snapshot.todayPlan.todayJalali,
            onRetry: () => ref.read(carePlanControllerProvider.notifier).refreshPlan(),
          ),
        ],
        if (snapshot.pendingOutboxCount > 0) ...<Widget>[
          const SizedBox(height: 10),
          BinaSyncBanner(
            pendingCount: snapshot.pendingOutboxCount,
            onOpenSync: () => context.push('/account/sync'),
          ),
        ],
        for (final eye in snapshot.updatedEyes) ...<Widget>[
          const SizedBox(height: 10),
          BinaBanner(
            kind: BinaStatusKind.info,
            title: 'بروزرسانی نسخه ${eye == EyeLaterality.oD ? 'چشم راست' : 'چشم چپ'}',
            body:
                'پزشک نسخه ${eye == EyeLaterality.oD ? 'چشم راست' : 'چشم چپ'} را بروزرسانی کرده است. برنامه چشم دیگر بدون تغییر باقی مانده است.',
          ),
        ],
        const SizedBox(height: 12),
        BinaHero(
          title: snapshot.clinic.nameFa,
          status: plan.scheduleItems.isEmpty ? 'بدون نوبت فعال' : 'برنامه فعال امروز',
          statusIcon: plan.scheduleItems.isEmpty ? null : Icons.check,
          subtitle: plan.clinicStaffedHoursFa,
        ),
        const SizedBox(height: 12),
        BinaCareProgress(
          recordedCount: recordedCount,
          totalCount: plan.scheduleItems.length,
          label: 'پیگیری نوبت‌های امروز',
        ),
        const SizedBox(height: 20),
        if (plan.scheduleItems.isEmpty)
          BinaEmptyState(
            icon: Icons.event_available_outlined,
            title: 'امروز نوبت قطره‌ای ثبت نشده است',
            message: 'در صورت پرسش درباره داروها یا بروز علائم هشدار با کلینیک تماس بگیرید.',
            actionLabel: 'کمک فوری و تماس',
            onAction: () => context.push('/help/urgent'),
          ),
        if (odCards.isNotEmpty) ...<Widget>[
          const Padding(
            padding: EdgeInsetsDirectional.only(bottom: 10),
            child: Row(
              children: <Widget>[
                BinaEyeLabel(eyeCode: 'OD', fullPersianLabel: 'چشم راست (OD)'),
              ],
            ),
          ),
          for (final item in odCards) ...<Widget>[
            _buildDoseCard(context, snapshot, item.card, item.idx),
            const SizedBox(height: 12),
          ],
        ],
        if (osCards.isNotEmpty) ...<Widget>[
          const SizedBox(height: 8),
          const Padding(
            padding: EdgeInsetsDirectional.only(bottom: 10),
            child: Row(
              children: <Widget>[
                BinaEyeLabel(eyeCode: 'OS', fullPersianLabel: 'چشم چپ (OS)'),
              ],
            ),
          ),
          for (final item in osCards) ...<Widget>[
            _buildDoseCard(context, snapshot, item.card, item.idx),
            const SizedBox(height: 12),
          ],
        ],
      ],
    );
  }

  Widget _buildDoseCard(
    BuildContext context,
    CarePlanSnapshot snapshot,
    PatientTodayDropCard card,
    int idx,
  ) {
    final pendingEntry = snapshot.latestOutboxForCard(card);
    final (String statusText, BinaStatusKind statusKind) = switch (pendingEntry?.status) {
      OutboxSyncStatus.acknowledged => ('ارسال شد', BinaStatusKind.success),
      OutboxSyncStatus.pendingUpload ||
      OutboxSyncStatus.sending ||
      OutboxSyncStatus.retryableFailure => ('در انتظار ارسال', BinaStatusKind.warning),
      OutboxSyncStatus.conflictOrRejected => ('نیاز به بررسی', BinaStatusKind.error),
      OutboxSyncStatus.unauthorizedOrRevoked => ('دسترسی لغو شده', BinaStatusKind.error),
      null || OutboxSyncStatus.draft =>
        card.taken ? ('مصرف شد', BinaStatusKind.success) : ('در انتظار ثبت', BinaStatusKind.info),
    };

    return BinaDoseCard(
      eyeLabelFa: '${card.eyeLabelFa} — نسخه ${BinaI18nCatalog.toPersianDigits('${card.prescriptionVersion}')}',
      drugNameFa: card.drugNameFa,
      bottleCapColorFa: card.bottleCapColorFa,
      scheduledTimeLabel: card.scheduledTimeJalali,
      instructionsFa: card.instructionsFa,
      statusText: statusText,
      statusKind: statusKind,
      onOpen: () => context.push('/care/dose/${buildDoseRouteKey(card, idx)}'),
    );
  }

  /// Isolated reference preview reproducing `01-Today.png` (`v2.1 §9.0A V01`).
  Widget _buildReferencePreview(BuildContext context) {
    final p = context.binaPalette;
    return BinaCanvas(
      artVariant: BinaCanvasArtVariant.today,
      child: ListView(
        padding: const EdgeInsetsDirectional.fromSTEB(16, 12, 16, 24),
        children: <Widget>[
          _TodayTopHeader(
            greetingFa: 'سلام، مهدی عزیز',
            dateJalaliFa: 'امروز ۳ آذر ۱۴۰۵',
            isCaregiver: false,
            onOpenUrgent: () {},
            onOpenNotifications: () {},
            onOpenAccount: () {},
            showNotificationDot: true,
          ),
          const SizedBox(height: 6),
          const Directionality(
            textDirection: TextDirection.ltr,
            child: Align(
              alignment: Alignment.centerLeft,
              child: BinaBrandMark(full: true, height: 34),
            ),
          ),
          const SizedBox(height: 10),
          BinaHero(
            title: 'وضعیت امروز',
            status: 'پایدار',
            statusIcon: Icons.check,
            statusColor: p.success,
            subtitle: 'مقادیر در محدوده هدف هستند.',
          ),
          const SizedBox(height: 12),
          Row(
            children: <Widget>[
              Expanded(
                child: BinaMetricTile(
                  label: 'فشار چشم (IOP)',
                  value: '۱۸٫۰',
                  unit: 'mmHg',
                  leadingStatus: Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(color: p.successIcon, shape: BoxShape.circle),
                    child: const Icon(Icons.check, size: 15, color: Colors.white),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: BinaMetricTile(
                  label: 'میدان بینایی (VF)',
                  value: '',
                  leadingStatus: Container(
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(color: p.successIcon, shape: BoxShape.circle),
                    child: const Icon(Icons.check, size: 15, color: Colors.white),
                  ),
                  trailingVisual: const BinaSparkline(
                    samples: <double>[17.2, 18.0, 17.8, 18.4, 18.0],
                    semanticLabel: 'نمودار نمونه میدان بینایی',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text('برنامه امروز', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 12),
          BinaTaskRow(
            title: 'مصرف قطره',
            subtitle: 'طبق برنامه درمان',
            timeLabel: '۱۴:۰۰',
            wellKind: BinaWellKind.medication,
            icon: Icons.water_drop_outlined,
            onTap: () {},
          ),
          const SizedBox(height: 12),
          BinaTaskRow(
            title: 'آزمون میدان بینایی (VR)',
            subtitle: 'ارزیابی دوره‌ای میدان دید',
            timeLabel: '۱۷:۰۰',
            wellKind: BinaWellKind.education,
            icon: Icons.visibility_outlined,
            mintTimePill: true,
            onTap: () {},
          ),
        ],
      ),
    );
  }
}

class _TodayTopHeader extends StatelessWidget {
  const _TodayTopHeader({
    required this.greetingFa,
    required this.dateJalaliFa,
    required this.isCaregiver,
    required this.onOpenUrgent,
    required this.onOpenNotifications,
    required this.onOpenAccount,
    this.showNotificationDot = false,
  });

  final String greetingFa;
  final String dateJalaliFa;
  final bool isCaregiver;
  final VoidCallback onOpenUrgent;
  final VoidCallback onOpenNotifications;
  final VoidCallback onOpenAccount;
  final bool showNotificationDot;

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    return Row(
      children: <Widget>[
        InkWell(
          onTap: onOpenAccount,
          borderRadius: BorderRadius.circular(24),
          child: BinaAvatar(size: 48, initials: isCaregiver ? 'ه' : 'ب'),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(greetingFa, style: Theme.of(context).textTheme.titleLarge),
              Text(
                dateJalaliFa,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(color: p.onSurfaceVariant),
              ),
            ],
          ),
        ),
        Semantics(
          button: true,
          label: 'کمک فوری',
          child: TextButton.icon(
            onPressed: onOpenUrgent,
            style: TextButton.styleFrom(
              foregroundColor: p.urgentAction,
              textStyle: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: p.urgentAction,
                    decoration: TextDecoration.none,
                  ),
            ),
            icon: const Icon(Icons.phone_in_talk_rounded, size: 18),
            label: const Text('کمک فوری'),
          ),
        ),
        const SizedBox(width: 4),
        SizedBox(
          width: 48,
          height: 48,
          child: IconButton(
            onPressed: onOpenNotifications,
            tooltip: 'اعلان‌ها',
            icon: Stack(
              clipBehavior: Clip.none,
              children: <Widget>[
                const Icon(Icons.notifications_none_rounded, size: 24),
                if (showNotificationDot)
                  Positioned(
                    top: -2,
                    left: -2,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(color: p.urgentAction, shape: BoxShape.circle),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
