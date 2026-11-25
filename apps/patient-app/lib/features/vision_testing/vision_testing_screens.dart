import 'package:bina_api_dtos/bina_api_dtos.dart';
import 'package:bina_clinical_renderer/bina_clinical_renderer.dart';
import 'package:bina_design_system/bina_design_system.dart';
import 'package:bina_device_sensors/bina_device_sensors.dart';
import 'package:bina_offline_store/bina_offline_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../app/providers.dart';
import '../../core/i18n/bina_i18n.dart';
import 'vision_testing_controller.dart';

/// Shared non-clinical chrome scaffold for pre-test & post-test R2 screens (`v2.1 §9.6`).
class _TestsSubpageScaffold extends StatelessWidget {
  const _TestsSubpageScaffold({
    required this.title,
    required this.child,
    this.showBack = true,
    this.suppressArt = false,
  });

  final String title;
  final Widget child;
  final bool showBack;
  final bool suppressArt;

  @override
  Widget build(BuildContext context) {
    return BinaCanvas(
      artVariant: suppressArt ? BinaCanvasArtVariant.none : BinaCanvasArtVariant.headerOnly,
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

/// TEST-01 `/tests` & V03 Reference Preview (`03-Tests.png`).
/// Production renders ONLY qualified Landolt C and Amsler per `ADR-038`.
class TestsHubScreen extends ConsumerStatefulWidget {
  const TestsHubScreen({
    super.key,
    this.previewMode = false,
  });

  final bool previewMode;

  @override
  ConsumerState<TestsHubScreen> createState() => _TestsHubScreenState();
}

class _TestsHubScreenState extends ConsumerState<TestsHubScreen> {
  String _previewEye = 'OD';

  @override
  Widget build(BuildContext context) {
    if (widget.previewMode) {
      return _buildReferencePreview(context);
    }

    final p = context.binaPalette;
    return BinaCanvas(
      artVariant: BinaCanvasArtVariant.tests,
      child: ListView(
        padding: const EdgeInsetsDirectional.fromSTEB(16, 12, 16, 24),
        children: <Widget>[
          Row(
            children: <Widget>[
              Expanded(child: Text('آزمون‌ها', style: Theme.of(context).textTheme.headlineMedium)),
              TextButton.icon(
                onPressed: () => context.push('/help/urgent'),
                icon: Icon(Icons.phone_in_talk_rounded, color: p.urgentAction),
                label: Text('کمک فوری', style: TextStyle(color: p.urgentAction)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const BinaBanner(
            kind: BinaStatusKind.info,
            title: 'پایش بینایی خانگی کالیبره‌شده',
            body:
                'آزمون‌های مجاز فقط با کالیبراسیون صفحه و تایید سنسورهای فاصله و نور آغاز می‌شوند و جایگزین معاینه کلینیک نیستند.',
          ),
          const SizedBox(height: 16),
          BinaRichRow(
            title: 'آزمون حدت بینایی (لندولت C)',
            subtitle: 'ارزیابی دقیق تیزبینی مطابق استاندارد ISO 8596 و تایید چشم مشخص',
            wellKind: BinaWellKind.test,
            icon: Icons.visibility_outlined,
            minHeight: 88,
            wellSize: 52,
            onTap: () {
              ref.read(visionTestingControllerProvider.notifier).startAssignment(VisionTestKind.landoltC);
              context.push('/tests/landolt_c/eligibility');
            },
          ),
          const SizedBox(height: 12),
          BinaRichRow(
            title: 'آزمون شبکه آمسلر (Amsler)',
            subtitle: 'بررسی اعوجاج یا نقاط تاریک در مرکز میدان بینایی',
            wellKind: BinaWellKind.plan,
            icon: Icons.grid_on_rounded,
            minHeight: 88,
            wellSize: 52,
            onTap: () {
              ref.read(visionTestingControllerProvider.notifier).startAssignment(VisionTestKind.amsler);
              context.push('/tests/amsler/eligibility');
            },
          ),
          const SizedBox(height: 16),
          BinaRichRow(
            title: 'تاریخچه آزمون‌های ثبت‌شده',
            subtitle: 'مشاهده سوابق آزمون‌های خانگی به تفکیک چشم راست و چشم چپ',
            wellKind: BinaWellKind.neutral,
            icon: Icons.history_rounded,
            minHeight: 72,
            onTap: () => context.push('/tests/history'),
          ),
        ],
      ),
    );
  }

  /// Isolated V03 preview reproducing `03-Tests.png` (`v2.1 §9.0A V03`).
  Widget _buildReferencePreview(BuildContext context) {
    return BinaCanvas(
      artVariant: BinaCanvasArtVariant.headerOnly,
      child: ListView(
        padding: const EdgeInsetsDirectional.fromSTEB(16, 12, 16, 24),
        children: <Widget>[
          Text('آزمون‌ها', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 12),
          BinaSegments<String>(
            choices: const <String, String>{
              'OD': 'چشم راست (OD)',
              'OS': 'چشم چپ (OS)',
            },
            selected: _previewEye,
            onChanged: (v) => setState(() => _previewEye = v),
          ),
          const SizedBox(height: 16),
          const Row(
            children: <Widget>[
              Expanded(
                child: BinaMetricTile(
                  label: 'فشار چشم (IOP)',
                  value: 'اندازه‌گیری',
                  footer: 'خانگی (مرجع بصری)',
                  leadingStatus: BinaIconWell(
                    kind: BinaWellKind.test,
                    icon: Icons.speed_rounded,
                    size: 44,
                  ),
                ),
              ),
              SizedBox(width: 12),
              Expanded(
                child: BinaMetricTile(
                  label: 'میدان بینایی (VF)',
                  value: 'آزمون',
                  mintAccent: true,
                  footer: 'خانگی (مرجع بصری)',
                  leadingStatus: BinaIconWell(
                    kind: BinaWellKind.plan,
                    icon: Icons.grid_view_rounded,
                    size: 44,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text('آزمون‌های برنامه‌ریزی‌شده', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 12),
          BinaTaskRow(
            title: 'اندازه‌گیری IOP خانگی',
            subtitle: 'امروز • ۱۸:۰۰',
            timeLabel: '۱۸:۰۰',
            wellKind: BinaWellKind.test,
            icon: Icons.calendar_today_outlined,
            onTap: () {},
          ),
          const SizedBox(height: 12),
          BinaTaskRow(
            title: 'آزمون میدان بینایی (VR)',
            subtitle: 'فردا • ۱۴:۰۰',
            timeLabel: '۱۴:۰۰',
            wellKind: BinaWellKind.education,
            icon: Icons.visibility_outlined,
            mintTimePill: true,
            onTap: () {},
          ),
          const SizedBox(height: 16),
          const Align(
            alignment: Alignment.centerLeft,
            child: BinaIrisArtwork(width: 140, height: 96),
          ),
        ],
      ),
    );
  }
}

/// TEST-02 `/tests/:assignmentId/eligibility`: Blocks unsupported devices cleanly.
class TestEligibilityScreen extends ConsumerStatefulWidget {
  const TestEligibilityScreen({
    super.key,
    required this.assignmentId,
  });

  final String assignmentId;

  @override
  ConsumerState<TestEligibilityScreen> createState() => _TestEligibilityScreenState();
}

class _TestEligibilityScreenState extends ConsumerState<TestEligibilityScreen> {
  DeviceEligibilityResult? _result;
  bool _checking = true;

  @override
  void initState() {
    super.initState();
    _check();
  }

  Future<void> _check() async {
    final res = await ref.read(deviceQualificationPortProvider).checkEligibility();
    if (!mounted) return;
    ref.read(visionTestingControllerProvider.notifier).recordEligibility(res);
    setState(() {
      _result = res;
      _checking = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final kind = VisionTestKind.fromAssignmentId(widget.assignmentId);
    return _TestsSubpageScaffold(
      title: 'بررسی صلاحیت دستگاه',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text(kind.titleFa, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 14),
          if (_checking)
            const BinaSurface(child: Text('در حال بررسی سازگاری دستگاه و سنسورهای لازم...'))
          else if (_result == null || !_result!.eligible) ...<Widget>[
            BinaBanner(
              kind: BinaStatusKind.error,
              title: 'این دستگاه برای انجام این آزمون تأیید نشده است',
              body:
                  'محیط فعلی (${BinaI18nCatalog.isolateLtr(_result?.reasonCode ?? 'UNSUPPORTED')}) فاقد سنسورهای تاییدشده فاصله، نور یا پایداری برای آزمون بالینی است. شروع آزمون بالینی در این دستگاه مسدود شده است.',
            ),
            const SizedBox(height: 16),
            BinaSecondaryButton(
              label: 'تماس با کلینیک و انجام آزمون حضوری',
              icon: Icons.phone_in_talk_rounded,
              onPressed: () => context.push('/help/urgent'),
            ),
          ] else ...<Widget>[
            const BinaBanner(
              kind: BinaStatusKind.success,
              title: 'دستگاه آماده مراحل پیش‌آزمون است',
              body: 'در مراحل بعد چشم مورد نظر، کالیبراسیون صفحه و سنسورهای محیط بررسی می‌شوند.',
            ),
            const SizedBox(height: 16),
            BinaGradientButton(
              label: 'ادامه و انتخاب چشم',
              onPressed: () => context.push('/tests/${widget.assignmentId}/eye'),
            ),
          ],
        ],
      ),
    );
  }
}

/// TEST-03 `/tests/:assignmentId/eye`: Explicit eye selection with NO default.
class TestEyeConfirmScreen extends ConsumerWidget {
  const TestEyeConfirmScreen({
    super.key,
    required this.assignmentId,
  });

  final String assignmentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedEye = ref.watch(visionTestingControllerProvider.select((s) => s.selectedEye));
    final notifier = ref.read(visionTestingControllerProvider.notifier);

    return _TestsSubpageScaffold(
      title: 'انتخاب چشم برای آزمون',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text(
            'مشخص کنید این آزمون برای کدام چشم انجام می‌شود و چشم دیگر را بدون فشار بپوشانید.',
            style: Theme.of(context).textTheme.bodyLarge,
          ),
          const SizedBox(height: 16),
          RadioGroup<EyeLaterality?>(
            groupValue: selectedEye,
            onChanged: (val) {
              if (val != null) notifier.confirmEye(val);
            },
            child: Column(
              children: <Widget>[
                BinaSurface(
                  onTap: () => notifier.confirmEye(EyeLaterality.oD),
                  child: const RadioListTile<EyeLaterality?>(
                    value: EyeLaterality.oD,
                    title: Text('چشم راست (OD)'),
                    subtitle: Text('چشم چپ را به‌آرامی بپوشانید'),
                  ),
                ),
                const SizedBox(height: 12),
                BinaSurface(
                  onTap: () => notifier.confirmEye(EyeLaterality.oS),
                  child: const RadioListTile<EyeLaterality?>(
                    value: EyeLaterality.oS,
                    title: Text('چشم چپ (OS)'),
                    subtitle: Text('چشم راست را به‌آرامی بپوشانید'),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          BinaGradientButton(
            label: 'تایید چشم و ادامه',
            onPressed: selectedEye == null
                ? null
                : () {
                    notifier.markInstructionsRead();
                    context.push('/tests/$assignmentId/instructions');
                  },
          ),
        ],
      ),
    );
  }
}

/// TEST-04 `/tests/:assignmentId/instructions`
class TestInstructionsScreen extends ConsumerWidget {
  const TestInstructionsScreen({
    super.key,
    required this.assignmentId,
  });

  final String assignmentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionState = ref.watch(visionTestingControllerProvider);
    final eye = sessionState.selectedEye;
    if (eye == null) {
      return _TestsSubpageScaffold(
        title: 'راهنمای آزمون',
        child: BinaEmptyState(
          icon: Icons.visibility_outlined,
          title: 'چشم مورد نظر انتخاب نشده است',
          message: 'برای شروع راهنما ابتدا چشم راست یا چشم چپ را تایید کنید.',
          actionLabel: 'انتخاب چشم',
          onAction: () => context.go('/tests/$assignmentId/eye'),
        ),
      );
    }

    final eyeFa = eye == EyeLaterality.oD ? 'چشم راست (OD)' : 'چشم چپ (OS)';
    return _TestsSubpageScaffold(
      title: 'راهنمای پیش از آزمون',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          BinaEyeLabel(eyeCode: eye.value, fullPersianLabel: eyeFa),
          const SizedBox(height: 12),
          BinaSurface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Text('شرایط استاندارد انجام آزمون', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 10),
                const Text('۱. در نور یکنواخت اتاق و دور از بازتاب مستقیم پنجره بنشینید.'),
                const SizedBox(height: 8),
                const Text('۲. در صورت تجویز عینک برای دید دور یا مطالعه طبق دستور پزشک، عینک خود را بزنید.'),
                const SizedBox(height: 8),
                Text('۳. تنها $eyeFa را باز بگذارید و چشم دیگر را بدون فشار روی پلک بپوشانید.'),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const BinaBanner(
            kind: BinaStatusKind.info,
            title: 'ثبات ظاهر صفحه آزمون',
            body:
                'هنگام شروع آزمون واقعی، صفحه محرک بالینی با رنگ و اندازه ثابت استاندارد نمایش داده می‌شود و تحت تاثیر پوسته تیره یا بزرگ‌نمایی متن قرار نمی‌گیرد.',
          ),
          const SizedBox(height: 16),
          BinaGradientButton(
            label: 'ادامه به کالیبراسیون صفحه',
            onPressed: () => context.push('/tests/$assignmentId/calibration'),
          ),
        ],
      ),
    );
  }
}

/// TEST-05 `/tests/:assignmentId/calibration`
class TestCalibrationScreen extends ConsumerStatefulWidget {
  const TestCalibrationScreen({
    super.key,
    required this.assignmentId,
  });

  final String assignmentId;

  @override
  ConsumerState<TestCalibrationScreen> createState() => _TestCalibrationScreenState();
}

class _TestCalibrationScreenState extends ConsumerState<TestCalibrationScreen> {
  double _cardWidthPx = 280.0;
  bool _saving = false;
  String? _errorFa;

  Future<void> _saveCalibration(WidgetRef ref) async {
    setState(() {
      _saving = true;
      _errorFa = null;
    });
    try {
      final dpr = MediaQuery.devicePixelRatioOf(context);
      await ref.read(visionTestingControllerProvider.notifier).registerCalibration(
            cardWidthLogicalPx: _cardWidthPx,
            devicePixelRatio: dpr,
          );
      if (!mounted) return;
      context.push('/tests/${widget.assignmentId}/practice');
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _errorFa = 'ثبت کالیبراسیون انجام نشد. لطفاً دوباره تلاش کنید.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.binaPalette;
    return _TestsSubpageScaffold(
      title: 'کالیبراسیون فیزیکی صفحه',
      child: Consumer(
        builder: (context, ref, _) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            BinaSurface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  Text('تطبیق با عرض کارت بانکی استاندارد', style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 8),
                  const Text(
                    'کارت بانکی خود (عرض ۸۵٫۶ میلی‌متر) را روی کادر زیر بگذارید و لغزنده را طوری تنظیم کنید که عرض کادر دقیقاً هم‌اندازه کارت شود.',
                  ),
                  const SizedBox(height: 16),
                  Center(
                    child: Container(
                      width: _cardWidthPx,
                      height: _cardWidthPx * 0.63,
                      decoration: BoxDecoration(
                        color: p.surfaceMint,
                        border: Border.all(color: p.primary, width: 2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        'کادر کالیبراسیون (۸۵٫۶ mm)',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.labelMedium?.copyWith(color: p.primary),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Slider(
                    value: _cardWidthPx,
                    min: 180,
                    max: 340,
                    onChanged: (v) => setState(() => _cardWidthPx = v),
                  ),
                ],
              ),
            ),
            if (_errorFa != null) ...<Widget>[
              const SizedBox(height: 12),
              BinaBanner(kind: BinaStatusKind.error, title: 'خطا', body: _errorFa!),
            ],
            const SizedBox(height: 16),
            BinaGradientButton(
              label: 'تایید کالیبراسیون و رفتن به تمرین',
              busy: _saving,
              onPressed: _saving ? null : () => _saveCalibration(ref),
            ),
          ],
        ),
      ),
    );
  }
}

/// TEST-06 `/tests/:assignmentId/practice`: Isolated un-scored practice session.
class TestPracticeScreen extends ConsumerStatefulWidget {
  const TestPracticeScreen({
    super.key,
    required this.assignmentId,
  });

  final String assignmentId;

  @override
  ConsumerState<TestPracticeScreen> createState() => _TestPracticeScreenState();
}

class _TestPracticeScreenState extends ConsumerState<TestPracticeScreen> {
  int _practiceOrientation = 0;
  String? _practiceMessageFa;
  final List<AmslerDistortionMark> _practiceMarks = <AmslerDistortionMark>[];

  @override
  Widget build(BuildContext context) {
    final kind = VisionTestKind.fromAssignmentId(widget.assignmentId);
    final testState = ref.watch(visionTestingControllerProvider);
    final geometry = LandoltCGeometry.fromProtocol(
      angularMinutes: LandoltCGeometry.angularMinutesForLogMar(0.6),
      viewingDistanceMm: testState.viewingDistanceCm * 10.0,
      pixelsPerMm: testState.pixelsPerMm,
      devicePixelRatio: MediaQuery.devicePixelRatioOf(context),
    );

    return _TestsSubpageScaffold(
      title: 'تمرین آزمایشی پیش از آزمون',
      suppressArt: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          const BinaBanner(
            kind: BinaStatusKind.info,
            title: 'تمرین آزمایشی (در پرونده ثبت نمی‌شود)',
            body:
                'این مرحله صرفاً برای آشنایی با نحوه پاسخ‌دهی است و هیچ داده‌ای به‌عنوان نتیجه بالینی ذخیره نمی‌شود.',
          ),
          const SizedBox(height: 16),
          Center(
            child: IsolatedClinicalSurface(
              backgroundColor: const Color(0xFFFFFFFF),
              child: kind == VisionTestKind.landoltC
                  ? SizedBox(
                      width: 180,
                      height: 180,
                      child: CustomPaint(
                        painter: LandoltCPainter(
                          geometry: geometry,
                          orientationIndex: _practiceOrientation,
                        ),
                      ),
                    )
                  : GestureDetector(
                      onTapUp: (details) {
                        setState(() {
                          _practiceMarks.add(
                            AmslerDistortionMark(
                              xNorm: (details.localPosition.dx / 220.0).clamp(0.0, 1.0),
                              yNorm: (details.localPosition.dy / 220.0).clamp(0.0, 1.0),
                            ),
                          );
                          _practiceMessageFa = 'نقطه تمرین ثبت شد (غیربالینی).';
                        });
                      },
                      child: SizedBox(
                        width: 220,
                        height: 220,
                        child: CustomPaint(
                          painter: AmslerGridPainter(marks: _practiceMarks),
                        ),
                      ),
                    ),
            ),
          ),
          if (kind == VisionTestKind.landoltC) ...<Widget>[
            const SizedBox(height: 14),
            _LandoltDirectionPad(
              onSelectOrientation: (idx) {
                setState(() {
                  _practiceMessageFa = idx == _practiceOrientation
                      ? 'پاسخ تمرینی صحیح بود؛ جهت بعدی آماده است.'
                      : 'در تمرین تفاوتی ندارد؛ جهت واقعی شکاف گزینه دیگری بود.';
                  _practiceOrientation = (_practiceOrientation + 2) % 8;
                });
              },
            ),
          ],
          if (_practiceMessageFa != null) ...<Widget>[
            const SizedBox(height: 12),
            BinaSurface(child: Text(_practiceMessageFa!)),
          ],
          const SizedBox(height: 16),
          BinaGradientButton(
            label: 'اتمام تمرین و بررسی محیط آزمون',
            onPressed: () {
              ref.read(visionTestingControllerProvider.notifier).completePractice();
              context.push('/tests/${widget.assignmentId}/preflight');
            },
          ),
        ],
      ),
    );
  }
}

/// TEST-07 & TEST-08 `/tests/:assignmentId/preflight`: Honest sensor & privacy check.
class TestPreflightScreen extends ConsumerStatefulWidget {
  const TestPreflightScreen({
    super.key,
    required this.assignmentId,
  });

  final String assignmentId;

  @override
  ConsumerState<TestPreflightScreen> createState() => _TestPreflightScreenState();
}

class _TestPreflightScreenState extends ConsumerState<TestPreflightScreen> {
  late final SensorPreflightPort _sensorPort;
  SensorObservation? _obs;
  bool _sampling = false;

  @override
  void initState() {
    super.initState();
    _sensorPort = ref.read(sensorPortProvider);
    _sample();
  }

  @override
  void dispose() {
    _sensorPort.stopAndDispose();
    super.dispose();
  }

  Future<void> _sample() async {
    setState(() => _sampling = true);
    final result = await _sensorPort.sampleOnce();
    if (!mounted) return;
    ref.read(visionTestingControllerProvider.notifier).recordPreflightObservation(result);
    setState(() {
      _obs = result;
      _sampling = false;
    });
  }

  (String, BinaStatusKind, IconData) _statusUi(SensorQualityStatus status) => switch (status) {
        SensorQualityStatus.checking => ('در حال بررسی', BinaStatusKind.info, Icons.hourglass_bottom_rounded),
        SensorQualityStatus.passed => ('تایید شد', BinaStatusKind.success, Icons.check_circle_outline_rounded),
        SensorQualityStatus.needsCorrection => ('نیاز به اصلاح', BinaStatusKind.warning, Icons.tune_rounded),
        SensorQualityStatus.unavailable =>
          ('در دسترس نیست (اندازه‌گیری نشد)', BinaStatusKind.error, Icons.sensors_off_rounded),
        SensorQualityStatus.notEligible => ('غیرمجاز', BinaStatusKind.error, Icons.block_rounded),
      };

  @override
  Widget build(BuildContext context) {
    final kind = VisionTestKind.fromAssignmentId(widget.assignmentId);
    final canStart = _obs != null && _obs!.allPassed;

    return _TestsSubpageScaffold(
      title: 'بررسی محیط و سنسورهای آزمون',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          const BinaBanner(
            kind: BinaStatusKind.info,
            title: 'حریم خصوصی دوربین و سنسورها',
            body:
                'بررسی فاصله و نور به‌صورت لحظه‌ای در همین دستگاه انجام می‌شود و هیچ ویدیو یا تصویر چهره‌ای ذخیره یا ارسال نمی‌شود.',
          ),
          const SizedBox(height: 14),
          if (_sampling || _obs == null)
            const BinaSurface(child: Text('در حال نمونه‌برداری سنسورهای محیط...'))
          else ...<Widget>[
            _SensorRow(
              title: 'فاصله دید تا صفحه',
              statusInfo: _statusUi(_obs!.viewingDistanceStatus),
              detail: _obs!.viewingDistanceCm != null
                  ? '${BinaI18nCatalog.toPersianDigits(_obs!.viewingDistanceCm!.toStringAsFixed(0))} سانتی‌متر'
                  : 'سنسور فاصله در دسترس نیست',
            ),
            const SizedBox(height: 10),
            _SensorRow(
              title: 'نور محیط و نبود بازتاب',
              statusInfo: _statusUi(_obs!.ambientLightStatus),
              detail: _obs!.ambientLux != null
                  ? '${BinaI18nCatalog.toPersianDigits(_obs!.ambientLux!.toStringAsFixed(0))} لوکس'
                  : 'سنسور نور در دسترس نیست',
            ),
            const SizedBox(height: 10),
            _SensorRow(
              title: 'ثبات و زاویه دستگاه',
              statusInfo: _statusUi(_obs!.stabilityStatus),
              detail: _obs!.deviceTiltDeg != null
                  ? 'زاویه ${BinaI18nCatalog.toPersianDigits(_obs!.deviceTiltDeg!.toStringAsFixed(0))} درجه'
                  : 'سنسور زاویه در دسترس نیست',
            ),
          ],
          const SizedBox(height: 14),
          BinaSecondaryButton(
            label: 'بررسی مجدد سنسورها',
            icon: Icons.refresh_rounded,
            onPressed: _sampling ? null : _sample,
          ),
          const SizedBox(height: 12),
          BinaGradientButton(
            label: 'شروع آزمون',
            onPressed: canStart
                ? () {
                    final started = ref.read(visionTestingControllerProvider.notifier).startActiveTrials();
                    if (!started) return;
                    final route = kind == VisionTestKind.landoltC
                        ? '/tests/${widget.assignmentId}/run/landolt'
                        : '/tests/${widget.assignmentId}/run/amsler';
                    context.go(route);
                  }
                : null,
          ),
        ],
      ),
    );
  }
}

class _SensorRow extends StatelessWidget {
  const _SensorRow({
    required this.title,
    required this.statusInfo,
    required this.detail,
  });

  final String title;
  final (String, BinaStatusKind, IconData) statusInfo;
  final String detail;

  @override
  Widget build(BuildContext context) {
    return BinaSurface(
      child: Row(
        children: <Widget>[
          Icon(statusInfo.$3, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(title, style: Theme.of(context).textTheme.titleMedium),
                Text(detail, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
          BinaStatusChip(kind: statusInfo.$2, text: statusInfo.$1, icon: statusInfo.$3),
        ],
      ),
    );
  }
}

/// TEST-09 & TEST-11 `/tests/:assignmentId/run/landolt`:
/// Zero decorative art, lifecycle invalidation, and strictly isolated [IsolatedClinicalSurface].
class LandoltSessionScreen extends ConsumerStatefulWidget {
  const LandoltSessionScreen({
    super.key,
    required this.assignmentId,
  });

  final String assignmentId;

  @override
  ConsumerState<LandoltSessionScreen> createState() => _LandoltSessionScreenState();
}

class _LandoltSessionScreenState extends ConsumerState<LandoltSessionScreen> with WidgetsBindingObserver {
  late final SensorPreflightPort _sensorPort;
  late BestPestStaircase _staircase;
  late DateTime _trialStartedAt;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _sensorPort = ref.read(sensorPortProvider);
    _staircase = BestPestStaircase.initial(maxTrials: 8, minTrialsBeforeStop: 6);
    _trialStartedAt = DateTime.now().toUtc();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _sensorPort.stopAndDispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if ((state == AppLifecycleState.paused ||
            state == AppLifecycleState.inactive ||
            state == AppLifecycleState.hidden) &&
        !_staircase.isComplete &&
        !_submitting) {
      _sensorPort.stopAndDispose();
      ref
          .read(visionTestingControllerProvider.notifier)
          .markInterrupted('خروج از صفحه یا رفتن برنامه به پس‌زمینه موجب ابطال نشست شد.');
    }
  }

  Future<void> _onRespond(int orientationIndex) async {
    if (_submitting || _staircase.isComplete) return;
    final elapsedMs = DateTime.now().toUtc().difference(_trialStartedAt).inMilliseconds;
    final next = _staircase.recordResponse(
      orientationResponded: orientationIndex,
      responseTimeMs: elapsedMs,
    );
    setState(() {
      _staircase = next;
      _trialStartedAt = DateTime.now().toUtc();
    });

    if (next.isComplete) {
      setState(() => _submitting = true);
      await ref.read(visionTestingControllerProvider.notifier).submitCompletedTest(
            vaLogmar: next.estimatedLogMar,
          );
      if (mounted) {
        context.go('/tests/${widget.assignmentId}/receipt');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final testState = ref.watch(visionTestingControllerProvider);
    if (testState.interruptedByLifecycle || !testState.canStartClinicalSession) {
      return _InterruptedSessionView(
        assignmentId: widget.assignmentId,
        reasonFa: testState.interruptionReasonFa ?? 'پیش‌نیازهای نشست بالینی برقرار نیست.',
      );
    }

    final angularMinutes = LandoltCGeometry.angularMinutesForLogMar(_staircase.currentLogMar);
    final geometry = LandoltCGeometry.fromProtocol(
      angularMinutes: angularMinutes,
      viewingDistanceMm: testState.viewingDistanceCm * 10.0,
      pixelsPerMm: testState.pixelsPerMm,
      devicePixelRatio: MediaQuery.devicePixelRatioOf(context),
    );

    return BinaCanvas(
      artVariant: BinaCanvasArtVariant.none,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: BinaAppBar(
          title: 'آزمون لندولت C (${BinaI18nCatalog.toPersianDigits('${_staircase.trials.length + 1}')} از ${BinaI18nCatalog.toPersianDigits('${_staircase.maxTrials}')})',
          isRootTab: false,
          onBack: () {
            ref
                .read(visionTestingControllerProvider.notifier)
                .markInterrupted('آزمون پیش از تکمیل توسط کاربر متوقف شد.');
            context.go('/tests/${widget.assignmentId}/receipt');
          },
          onUrgentHelp: () => context.push('/help/urgent'),
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsetsDirectional.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                // Strictly isolated stimulus canvas separated from external controls (`v2.1 §10.3`).
                Center(
                  child: IsolatedClinicalSurface(
                    backgroundColor: const Color(0xFFFFFFFF),
                    child: SizedBox(
                      width: 220,
                      height: 220,
                      child: CustomPaint(
                        painter: LandoltCPainter(
                          geometry: geometry,
                          orientationIndex: _staircase.currentOrientation,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Text(
                  'جهت شکاف علامت C را انتخاب کنید:',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 12),
                _LandoltDirectionPad(onSelectOrientation: _onRespond),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _LandoltDirectionPad extends StatelessWidget {
  const _LandoltDirectionPad({required this.onSelectOrientation});

  final ValueChanged<int> onSelectOrientation;

  Widget _dirButton(int index, IconData icon, String semanticFa) {
    return Semantics(
      button: true,
      label: semanticFa,
      child: SizedBox(
        width: 56,
        height: 56,
        child: OutlinedButton(
          key: Key('landolt_dir_$index'),
          style: OutlinedButton.styleFrom(padding: EdgeInsets.zero),
          onPressed: () => onSelectOrientation(index),
          child: Icon(icon, size: 24),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Physical directions (`v2.1 §10.3`): locked LTR so RTL never mirrors right/left choices.
    return Directionality(
      textDirection: TextDirection.ltr,
      child: Column(
        children: <Widget>[
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              _dirButton(3, Icons.north_west_rounded, 'جهت بالا و چپ'),
              const SizedBox(width: 8),
              _dirButton(2, Icons.north_rounded, 'جهت بالا'),
              const SizedBox(width: 8),
              _dirButton(1, Icons.north_east_rounded, 'جهت بالا و راست'),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              _dirButton(4, Icons.west_rounded, 'جهت چپ'),
              const SizedBox(width: 8),
              const SizedBox(width: 56, height: 56),
              const SizedBox(width: 8),
              _dirButton(0, Icons.east_rounded, 'جهت راست'),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              _dirButton(5, Icons.south_west_rounded, 'جهت پایین و چپ'),
              const SizedBox(width: 8),
              _dirButton(6, Icons.south_rounded, 'جهت پایین'),
              const SizedBox(width: 8),
              _dirButton(7, Icons.south_east_rounded, 'جهت پایین و راست'),
            ],
          ),
        ],
      ),
    );
  }
}

/// TEST-10 & TEST-11 `/tests/:assignmentId/run/amsler`:
/// Isolated raw normalized coordinate capture + lifecycle pause invalidation.
class AmslerSessionScreen extends ConsumerStatefulWidget {
  const AmslerSessionScreen({
    super.key,
    required this.assignmentId,
  });

  final String assignmentId;

  @override
  ConsumerState<AmslerSessionScreen> createState() => _AmslerSessionScreenState();
}

class _AmslerSessionScreenState extends ConsumerState<AmslerSessionScreen> with WidgetsBindingObserver {
  late final SensorPreflightPort _sensorPort;
  final List<AmslerDistortionMark> _marks = <AmslerDistortionMark>[];
  bool _centralScotoma = false;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _sensorPort = ref.read(sensorPortProvider);
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _sensorPort.stopAndDispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if ((state == AppLifecycleState.paused ||
            state == AppLifecycleState.inactive ||
            state == AppLifecycleState.hidden) &&
        !_submitting) {
      _sensorPort.stopAndDispose();
      ref
          .read(visionTestingControllerProvider.notifier)
          .markInterrupted('خروج از صفحه در حین آزمون شبکه آمسلر موجب ابطال نشست شد.');
    }
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    final distortionScore = (_marks.length * 0.15).clamp(0.0, 1.0);
    await ref.read(visionTestingControllerProvider.notifier).submitCompletedTest(
          amslerDistortionScore: distortionScore,
          amslerCentralScotoma: _centralScotoma,
        );
    if (mounted) {
      context.go('/tests/${widget.assignmentId}/receipt');
    }
  }

  @override
  Widget build(BuildContext context) {
    final testState = ref.watch(visionTestingControllerProvider);
    if (testState.interruptedByLifecycle || !testState.canStartClinicalSession) {
      return _InterruptedSessionView(
        assignmentId: widget.assignmentId,
        reasonFa: testState.interruptionReasonFa ?? 'پیش‌نیازهای نشست بالینی برقرار نیست.',
      );
    }

    const gridSize = 240.0;
    return BinaCanvas(
      artVariant: BinaCanvasArtVariant.none,
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: BinaAppBar(
          title: 'آزمون شبکه آمسلر',
          isRootTab: false,
          onBack: () {
            ref
                .read(visionTestingControllerProvider.notifier)
                .markInterrupted('آزمون پیش از ثبت نهایی توسط کاربر متوقف شد.');
            context.go('/tests/${widget.assignmentId}/receipt');
          },
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsetsDirectional.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                const Text(
                  'به نقطه سیاه وسط نگاه کنید و هر ناحیه‌ای که موج‌دار یا تار است لمس کنید:',
                ),
                const SizedBox(height: 12),
                Center(
                  child: IsolatedClinicalSurface(
                    backgroundColor: const Color(0xFFFFFFFF),
                    child: GestureDetector(
                      key: const Key('amsler_grid_canvas'),
                      onTapUp: (details) {
                        setState(() {
                          _marks.add(
                            AmslerDistortionMark(
                              xNorm: (details.localPosition.dx / gridSize).clamp(0.0, 1.0),
                              yNorm: (details.localPosition.dy / gridSize).clamp(0.0, 1.0),
                            ),
                          );
                        });
                      },
                      child: SizedBox(
                        width: gridSize,
                        height: gridSize,
                        child: CustomPaint(painter: AmslerGridPainter(marks: _marks)),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                SwitchListTile(
                  title: const Text('وجود لکه تیره یا نبود دید در مرکز شبکه'),
                  value: _centralScotoma,
                  onChanged: (v) => setState(() => _centralScotoma = v),
                ),
                const SizedBox(height: 8),
                if (_marks.isNotEmpty)
                  BinaSecondaryButton(
                    label: 'پاک کردن آخرین علامت',
                    onPressed: () => setState(() => _marks.removeLast()),
                  ),
                const SizedBox(height: 12),
                BinaGradientButton(
                  label: 'ثبت و پایان آزمون آمسلر',
                  busy: _submitting,
                  onPressed: _submitting ? null : _submit,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _InterruptedSessionView extends StatelessWidget {
  const _InterruptedSessionView({
    required this.assignmentId,
    required this.reasonFa,
  });

  final String assignmentId;
  final String reasonFa;

  @override
  Widget build(BuildContext context) {
    return _TestsSubpageScaffold(
      title: 'توقف آزمون',
      suppressArt: true,
      showBack: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          BinaBanner(
            kind: BinaStatusKind.error,
            title: 'کیفیت آزمون تأیید نشد — نشست نامعتبر شد',
            body: '$reasonFa به دلیل الزامات ایمنی بالینی، ادامه نشست متوقف‌شده مجاز نیست.',
          ),
          const SizedBox(height: 16),
          BinaGradientButton(
            label: 'شروع مجدد از بررسی سنسورها',
            onPressed: () => context.go('/tests/$assignmentId/preflight'),
          ),
          const SizedBox(height: 12),
          BinaSecondaryButton(
            label: 'بازگشت به فهرست آزمون‌ها',
            onPressed: () => context.go('/tests'),
          ),
        ],
      ),
    );
  }
}

/// TEST-12 & TEST-13 `/tests/:assignmentId/receipt`: Honest quality & transport receipt.
class TestQualityReceiptScreen extends ConsumerWidget {
  const TestQualityReceiptScreen({
    super.key,
    required this.assignmentId,
  });

  final String assignmentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final testState = ref.watch(visionTestingControllerProvider);
    final kind = testState.kind ?? VisionTestKind.fromAssignmentId(assignmentId);
    final eye = testState.selectedEye;
    final eyeFa = eye == null ? 'نامشخص' : (eye == EyeLaterality.oD ? 'چشم راست' : 'چشم چپ');
    final qualityOk = testState.qualityValid && !testState.interruptedByLifecycle;
    final entry = testState.outboxEntry;
    final sent = entry?.status == OutboxSyncStatus.acknowledged;

    return _TestsSubpageScaffold(
      title: 'رسید ثبت آزمون',
      showBack: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          BinaBanner(
            kind: qualityOk ? BinaStatusKind.success : BinaStatusKind.error,
            title: qualityOk ? 'کیفیت آزمون تایید شد' : 'کیفیت آزمون تأیید نشد',
            body: qualityOk
                ? '${kind.titleFa} برای $eyeFa با شرایط معتبر محیطی به‌پایان رسید.'
                : 'این آزمون به دلیل توقف یا شرایط نامناسب محیط معتبر نیست و به‌عنوان وضعیت عادی ثبت نمی‌شود.',
          ),
          if (entry != null) ...<Widget>[
            const SizedBox(height: 12),
            BinaReceipt(
              isServerConfirmed: sent,
              statusLabel: sent ? 'ارسال شد' : 'روی دستگاه ثبت شد؛ در انتظار ارسال',
              detailText: sent
                  ? 'داده‌های خام آزمون در پرونده $eyeFa برای بررسی تیم درمان ثبت شد.'
                  : 'ثبت به‌صورت ایمن در صف ارسال دستگاه ذخیره شد.',
            ),
          ],
          const SizedBox(height: 12),
          const BinaBanner(
            kind: BinaStatusKind.neutral,
            title: 'گام بعدی',
            body: 'نتیجه این آزمون خانگی برای بررسی توسط چشم‌پزشک ذخیره می‌شود و تشخیص پزشکی قطعی محسوب نمی‌شود.',
          ),
          const SizedBox(height: 16),
          BinaGradientButton(
            label: 'بازگشت به بخش آزمون‌ها',
            onPressed: () => context.go('/tests'),
          ),
        ],
      ),
    );
  }
}

/// TEST-15 `/tests/history`: Chronological eye-separated longitudinal logMAR/Amsler records.
class TestHistoryScreen extends ConsumerWidget {
  const TestHistoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trendsAsync = ref.watch(visionTrendsProvider);
    return _TestsSubpageScaffold(
      title: 'تاریخچه آزمون‌های بینایی',
      child: trendsAsync.when(
        loading: () => const BinaSurface(child: Text('در حال بارگذاری سوابق آزمون...')),
        error: (_, _) => BinaErrorState(
          message: 'امکان دریافت تاریخچه آزمون‌ها فراهم نشد.',
          onRetry: () => ref.invalidate(visionTrendsProvider),
        ),
        data: (trends) {
          if (trends.od.isEmpty && trends.os.isEmpty) {
            return const BinaEmptyState(
              icon: Icons.history_toggle_off_rounded,
              title: 'هنوز آزمونی ثبت نشده است',
              message: 'پس از تکمیل اولین آزمون معتبر، سوابق به تفکیک هر چشم اینجا نمایش داده می‌شوند.',
            );
          }

          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              if (trends.od.isNotEmpty) ...<Widget>[
                const BinaEyeLabel(eyeCode: 'OD', fullPersianLabel: 'چشم راست (OD)'),
                const SizedBox(height: 10),
                for (final pt in trends.od) ...<Widget>[
                  _TrendPointTile(point: pt),
                  const SizedBox(height: 8),
                ],
                const SizedBox(height: 16),
              ],
              if (trends.os.isNotEmpty) ...<Widget>[
                const BinaEyeLabel(eyeCode: 'OS', fullPersianLabel: 'چشم چپ (OS)'),
                const SizedBox(height: 10),
                for (final pt in trends.os) ...<Widget>[
                  _TrendPointTile(point: pt),
                  const SizedBox(height: 8),
                ],
              ],
            ],
          );
        },
      ),
    );
  }
}

class _TrendPointTile extends StatelessWidget {
  const _TrendPointTile({required this.point});
  final VisionTrendPoint point;

  @override
  Widget build(BuildContext context) {
    final valueText = point.vaLogmar != null
        ? BinaI18nCatalog.isolateLtr('${point.vaLogmar!.toStringAsFixed(2)} logMAR')
        : (point.amslerDistortionScore != null
            ? 'نمره اعوجاج آمسلر: ${BinaI18nCatalog.toPersianDigits(point.amslerDistortionScore!.toStringAsFixed(2))}'
            : 'ثبت‌شده');
    return BinaSurface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text(
            point.testType == 'amsler' ? 'آزمون شبکه آمسلر' : 'آزمون حدت بینایی (لندولت C)',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 4),
          Wrap(
            spacing: 8,
            runSpacing: 6,
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: <Widget>[
              Text(
                BinaI18nCatalog.isolateLtr(point.recordedAt.split('T').first),
                style: Theme.of(context).textTheme.bodySmall,
              ),
              BinaStatusChip(kind: BinaStatusKind.info, text: valueText),
            ],
          ),
        ],
      ),
    );
  }
}
