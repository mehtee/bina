import 'package:bina_design_system/bina_design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../app/router.dart';
import '../account/account_screens.dart';
import '../care_plan/care_screens.dart';
import '../care_plan/today_screen.dart';
import '../diagnostic_results/diagnostic_results_screens.dart';
import '../vision_testing/vision_testing_screens.dart';

enum ReferenceScreenId {
  v01Today('V01', '01-Today.png', 'امروز', 0),
  v02Care('V02', '02-Care.png', 'مراقبت', 1),
  v03Tests('V03', '03-Tests.png', 'آزمون‌ها', 2),
  v04Results('V04', '04-Results.png', 'نتایج', 3),
  v05CombinedReport('V05', '05-Combined-Report.png', 'گزارش ترکیبی', null),
  v06MedicationDetail('V06', '06-Medication-Detail.png', 'جزئیات دارو', null),
  v07VfDetail('V07', '07-VF-Detail.png', 'جزئیات میدان بینایی [G]', null),
  v08IopDetail('V08', '08-IOP-Detail.png', 'جزئیات فشار چشم [G]', null),
  v09MyAccount('V09', '09-My-Account.png', 'حساب من', 4);

  const ReferenceScreenId(this.code, this.referenceFile, this.labelFa, this.dockIndex);
  final String code;
  final String referenceFile;
  final String labelFa;
  final int? dockIndex;
}

/// Builds the real isolated reference screen widget for any [ReferenceScreenId] (`V01`..`V09`).
Widget buildReferencePreviewScreen(ReferenceScreenId id) {
  final navItems = const <BinaDestinationId>[
    BinaDestinationId.today,
    BinaDestinationId.care,
    BinaDestinationId.tests,
    BinaDestinationId.results,
    BinaDestinationId.account,
  ].map((d) => d.toNavItem()).toList(growable: false);

  Widget wrapRootDock(Widget body, int selectedIdx) => Scaffold(
        body: SafeArea(child: body),
        bottomNavigationBar: BinaFloatingDock(
          items: navItems,
          selectedIndex: selectedIdx,
          onSelected: (_) {},
        ),
      );

  return switch (id) {
    ReferenceScreenId.v01Today => wrapRootDock(const TodayScreen(previewMode: true), 0),
    ReferenceScreenId.v02Care => wrapRootDock(const CareHubScreen(previewMode: true), 1),
    ReferenceScreenId.v03Tests => wrapRootDock(const TestsHubScreen(previewMode: true), 2),
    ReferenceScreenId.v04Results => wrapRootDock(const ResultsScreen(previewMode: true), 3),
    ReferenceScreenId.v05CombinedReport =>
      const SignedReportDetailScreen(signedReportId: 'preview', previewMode: true),
    ReferenceScreenId.v06MedicationDetail =>
      const MedicationDetailScreen(doseOrMedicationKey: 'preview', previewMode: true),
    ReferenceScreenId.v07VfDetail => const VfDetailPreviewScreen(),
    ReferenceScreenId.v08IopDetail => const IopDetailPreviewScreen(),
    ReferenceScreenId.v09MyAccount => wrapRootDock(const AccountScreen(previewMode: true), 4),
  };
}

/// Isolated visual preview harness wiring all 9 real screens (`V01`–`V09`) across
/// `412×824` / `360×800`, Light/Dark/High Contrast, and `1.0x/1.5x/2.0x` (`v2.1 §14`).
/// Strictly disabled in release builds and isolated from all live API writes.
class PreviewHarnessScreen extends ConsumerStatefulWidget {
  const PreviewHarnessScreen({super.key});

  @override
  ConsumerState<PreviewHarnessScreen> createState() => _PreviewHarnessScreenState();
}

class _PreviewHarnessScreenState extends ConsumerState<PreviewHarnessScreen> {
  ReferenceScreenId _selected = ReferenceScreenId.v01Today;
  double _textScale = 1.0;
  Brightness _brightness = Brightness.light;
  bool _highContrast = false;
  bool _compactWidth = false;

  @override
  Widget build(BuildContext context) {
    final viewportSize = _compactWidth ? const Size(360, 800) : const Size(412, 824);

    return Scaffold(
      appBar: AppBar(
        title: const Text('پیش‌نمایش ایزوله V01–V09'),
      ),
      body: Column(
        children: <Widget>[
          Padding(
            padding: const EdgeInsetsDirectional.symmetric(horizontal: 12, vertical: 6),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              alignment: WrapAlignment.center,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: <Widget>[
                DropdownButton<ReferenceScreenId>(
                  value: _selected,
                  onChanged: (val) {
                    if (val != null) setState(() => _selected = val);
                  },
                  items: <DropdownMenuItem<ReferenceScreenId>>[
                    for (final id in ReferenceScreenId.values)
                      DropdownMenuItem<ReferenceScreenId>(
                        value: id,
                        child: Text('${id.code} — ${id.labelFa}'),
                      ),
                  ],
                ),
                SegmentedButton<Brightness>(
                  segments: const <ButtonSegment<Brightness>>[
                    ButtonSegment(value: Brightness.light, label: Text('روشن')),
                    ButtonSegment(value: Brightness.dark, label: Text('تیره')),
                  ],
                  selected: <Brightness>{_brightness},
                  onSelectionChanged: (set) => setState(() => _brightness = set.first),
                ),
                FilterChip(
                  label: const Text('کنتراست بالا'),
                  selected: _highContrast,
                  onSelected: (v) => setState(() => _highContrast = v),
                ),
                FilterChip(
                  label: Text(_compactWidth ? '۳۶۰×۸۰۰' : '۴۱۲×۸۲۴'),
                  selected: _compactWidth,
                  onSelected: (v) => setState(() => _compactWidth = v),
                ),
                SegmentedButton<double>(
                  segments: const <ButtonSegment<double>>[
                    ButtonSegment(value: 1.0, label: Text('1.0x')),
                    ButtonSegment(value: 1.5, label: Text('1.5x')),
                    ButtonSegment(value: 2.0, label: Text('2.0x')),
                  ],
                  selected: <double>{_textScale},
                  onSelectionChanged: (set) => setState(() => _textScale = set.first),
                ),
              ],
            ),
          ),
          Text(
            'مرجع: ${_selected.referenceFile} (پیش‌نمایش ایزوله بدون نوشتن در سرور)',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const Divider(),
          Expanded(
            child: Center(
              child: FittedBox(
                fit: BoxFit.contain,
                child: SizedBox(
                  width: viewportSize.width,
                  height: viewportSize.height,
                  child: Theme(
                    data: buildBinaTheme(_brightness, highContrast: _highContrast),
                    child: MediaQuery(
                      data: MediaQuery.of(context).copyWith(
                        size: viewportSize,
                        textScaler: TextScaler.linear(_textScale),
                      ),
                      child: Directionality(
                        textDirection: TextDirection.rtl,
                        child: ClipRect(
                          child: buildReferencePreviewScreen(_selected),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
