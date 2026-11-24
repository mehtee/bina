import 'package:bina_design_system/bina_design_system.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../app/providers.dart';

enum ReferenceScreenId {
  v01Today('V01', '01-Today.png', 'امروز'),
  v02Care('V02', '02-Care.png', 'مراقبت'),
  v03Tests('V03', '03-Tests.png', 'آزمون‌ها'),
  v04Results('V04', '04-Results.png', 'نتایج'),
  v05CombinedReport('V05', '05-Combined-Report.png', 'گزارش ترکیبی'),
  v06MedicationDetail('V06', '06-Medication-Detail.png', 'جزئیات دارو'),
  v07VfDetail('V07', '07-VF-Detail.png', 'جزئیات میدان بینایی [G]'),
  v08IopDetail('V08', '08-IOP-Detail.png', 'جزئیات فشار چشم [G]'),
  v09MyAccount('V09', '09-My-Account.png', 'حساب من');

  const ReferenceScreenId(this.code, this.referenceFile, this.labelFa);
  final String code;
  final String referenceFile;
  final String labelFa;
}

/// Isolated `412×824` logical viewport visual preview harness (`Spec v2.1 §14 Step 2`).
/// Strictly disabled in release builds and isolated from all live API writes.
class PreviewHarnessScreen extends ConsumerStatefulWidget {
  const PreviewHarnessScreen({super.key});

  @override
  ConsumerState<PreviewHarnessScreen> createState() => _PreviewHarnessScreenState();
}

class _PreviewHarnessScreenState extends ConsumerState<PreviewHarnessScreen> {
  ReferenceScreenId _selected = ReferenceScreenId.v01Today;
  double _textScale = 1.0;

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final themeMode = ref.watch(themeModeProvider);
    final iris = BinaArtResolver.resolve(BinaArtId.iris, brightness);
    final waveHeader = BinaArtResolver.resolve(BinaArtId.waveHeader, brightness);
    final waveFooter = BinaArtResolver.resolve(BinaArtId.waveFooter, brightness);

    return Scaffold(
      appBar: AppBar(
        title: const Text('پیش‌نمایش ایزوله V01–V09 (۴۱۲×۸۲۴)'),
      ),
      body: Column(
        children: <Widget>[
          Wrap(
            spacing: 8,
            runSpacing: 8,
            alignment: WrapAlignment.center,
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
              SegmentedButton<ThemeMode>(
                segments: const <ButtonSegment<ThemeMode>>[
                  ButtonSegment(value: ThemeMode.light, label: Text('روشن')),
                  ButtonSegment(value: ThemeMode.dark, label: Text('تیره')),
                ],
                selected: <ThemeMode>{themeMode == ThemeMode.dark ? ThemeMode.dark : ThemeMode.light},
                onSelectionChanged: (set) {
                  ref.read(themeModeProvider.notifier).setMode(set.first);
                },
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
          const Divider(),
          Expanded(
            child: Center(
              child: FittedBox(
                fit: BoxFit.contain,
                child: SizedBox(
                  width: 412,
                  height: 824,
                  child: MediaQuery(
                    data: MediaQuery.of(context).copyWith(
                      textScaler: TextScaler.linear(_textScale),
                    ),
                    child: Material(
                      elevation: 2,
                      color: brightness == Brightness.dark
                          ? const Color(0xFF091B20)
                          : const Color(0xFFECF8F9),
                      child: Stack(
                        children: <Widget>[
                          Positioned(
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 120,
                            child: Opacity(
                              opacity: waveHeader.defaultOpacity,
                              child: Image.asset(
                                waveHeader.assetPath,
                                fit: BoxFit.fitWidth,
                                alignment: Alignment.topLeft,
                                excludeFromSemantics: true,
                              ),
                            ),
                          ),
                          Positioned(
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: 120,
                            child: Opacity(
                              opacity: waveFooter.defaultOpacity,
                              child: Image.asset(
                                waveFooter.assetPath,
                                fit: BoxFit.fitWidth,
                                alignment: Alignment.bottomCenter,
                                excludeFromSemantics: true,
                              ),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsetsDirectional.all(20),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: <Widget>[
                                Text(
                                  '${_selected.code} — ${_selected.labelFa}',
                                  style: Theme.of(context).textTheme.headlineSmall,
                                ),
                                const SizedBox(height: 8),
                                Text('مرجع: ${_selected.referenceFile} (داده مصنوعی ایزوله)'),
                                const SizedBox(height: 16),
                                SizedBox(
                                  height: 170,
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(24),
                                    child: Image.asset(
                                      iris.assetPath,
                                      fit: BoxFit.cover,
                                      excludeFromSemantics: true,
                                    ),
                                  ),
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
            ),
          ),
        ],
      ),
    );
  }
}
