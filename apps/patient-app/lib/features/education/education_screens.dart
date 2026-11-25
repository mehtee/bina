import 'dart:async';
import 'package:bina_design_system/bina_design_system.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/i18n/bina_i18n.dart';
import '../care_plan/care_screens.dart';

@immutable
class EducationTopic {
  const EducationTopic({
    required this.id,
    required this.titleFa,
    required this.summaryFa,
    required this.categoryFa,
    required this.audioDurationFa,
    required this.stepsFa,
    required this.paragraphsFa,
    required this.cautionFa,
  });

  final String id;
  final String titleFa;
  final String summaryFa;
  final String categoryFa;
  final String audioDurationFa;
  final List<String> stepsFa;
  final List<String> paragraphsFa;
  final String cautionFa;
}

/// Curated clinical-team R1 post-cataract education catalog (`v2.1 §9.3`).
class EducationCatalog {
  const EducationCatalog._();

  static List<EducationTopic> allTopics() => <EducationTopic>[
        const EducationTopic(
          id: 'drop-technique',
          titleFa: 'روش صحیح چکاندن قطره چشمی',
          summaryFa: 'مراحل گام‌به‌گام استفاده ایمن از قطره‌های چشم راست و چشم چپ بدون تماس نوک قطره با چشم',
          categoryFa: 'قطره‌های چشمی',
          audioDurationFa: '۱ دقیقه و ۳۰ ثانیه',
          stepsFa: <String>[
            'پیش از لمس بطری قطره، دست‌های خود را با آب و صابون بشویید و خشک کنید.',
            'رنگ درِ بطری را با نسخه چشم راست یا چشم چپ مطابقت دهید تا داروها جابه‌جا نشوند.',
            'سر را به آرامی به عقب خم کنید و پلک پایین را به‌نرمی پایین بکشید تا یک جیب کوچک ایجاد شود.',
            'بدون تماس نوک قطره‌چکان با مژه یا چشم، یک قطره داخل پلک پایین بچکانید.',
            'اگر دو قطره برای یک چشم تجویز شده است، حتماً حداقل ۵ دقیقه بین آن‌ها فاصله بگذارید.',
          ],
          paragraphsFa: <String>[
            'تمیز نگه داشتن نوک بطری قطره از مهم‌ترین اصول پیشگیری از عفونت پس از جراحی آب‌مروارید است. بلافاصله پس از مصرف، درِ بطری را ببندید و هر بطری را صرفاً برای چشمی که تجویز شده استفاده کنید.',
            'پس از چکاندن قطره می‌توانید چشم را برای حدود یک دقیقه به آرامی بسته نگه دارید و از مالش یا فشار روی پلک خودداری کنید.',
          ],
          cautionFa:
              'اگر به‌اشتباه قطره چشم راست در چشم چپ چکانده شد یا سوزش غیرعادی ادامه داشت، بدون تغییر خودسرانه دارو با کلینیک تماس بگیرید.',
        ),
        const EducationTopic(
          id: 'red-flags',
          titleFa: 'علائم هشدار پس از جراحی چشم',
          summaryFa: 'شناخت علائمی که نیاز به تماس فوری و مراجعه به اورژانس چشم دارند',
          categoryFa: 'علائم هشدار',
          audioDurationFa: '۱ دقیقه',
          stepsFa: <String>[
            'درد شدید یا رو به افزایش چشم که با استراحت بهتر نمی‌شود.',
            'کاهش ناگهانی بینایی یا تار شدن شدید دید نسبت به روز قبل.',
            'ترشح چرکی یا زردرنگ، افزایش قرمزی شدید یا تورم غیرعادی پلک.',
            'دیدن جرقه‌های نوری، نقاط شناور جدید یا پرده سیاه در بخشی از میدان دید.',
          ],
          paragraphsFa: <String>[
            'بیشتر بیماران پس از جراحی دچار احساس خفیف جسم خارجی یا آبریزش خفیف می‌شوند، اما بروز هر یک از چهار نشانه بالا نیازمند ارزیابی فوری است و نباید تا نوبت بعدی معاینه به تعویق بیفتد.',
          ],
          cautionFa:
              'در صورت بروز هر یک از این نشانه‌ها، منتظر پاسخ پیام نمانید و بلافاصله از دکمه کمک فوری با کلینیک یا اورژانس چشم تماس بگیرید.',
        ),
        const EducationTopic(
          id: 'hygiene-shield',
          titleFa: 'محافظ چشم و بهداشت روزانه در هفته اول',
          summaryFa: 'اصول استفاده از محافظ شفاف در خواب و پرهیز از فشار یا آب آلوده',
          categoryFa: 'مراقبت روزانه',
          audioDurationFa: '۱ دقیقه و ۱۵ ثانیه',
          stepsFa: <String>[
            'در هفته اول هنگام خواب حتماً محافظ پلاستیکی چشم را با چسب ملایم روی چشم جراحی‌شده قرار دهید.',
            'از مالیدن چشم، خم شدن طولانی‌مدت سر به پایین و بلند کردن اجسام سنگین پرهیز کنید.',
            'هنگام شست‌وشوی صورت یا استحمام مراقب باشید آب و کف صابون مستقیم وارد چشم نشود.',
          ],
          paragraphsFa: <String>[
            'محافظ چشم مانع از تماس ناخواسته دست یا بالش با چشم در زمان استراحت می‌شود. استفاده از عینک آفتابی استاندارد در فضای باز نیز به کاهش حساسیت به نور کمک می‌کند.',
          ],
          cautionFa: 'تمامی فعالیت‌های ورزشی سنگین و شنا را تنها پس از تایید پزشک در ویزیت پیگیری از سر بگیرید.',
        ),
        EducationTopic(
          id: 'caregiver-guide',
          titleFa: 'راهنمای همراه بیمار در منزل',
          summaryFa: 'نحوه همراهی ایمن برای تفکیک قطره‌های چشم راست و چپ و یادآوری نوبت‌ها',
          categoryFa: 'راهنمای همراه',
          audioDurationFa: '۱ دقیقه',
          stepsFa: <String>[
            'قبل از چکاندن هر قطره، نام دارو و چشم راست یا چشم چپ را با صدای واضح بررسی کنید.',
            'ثبت مصرف را تنها پس از چکاندن واقعی قطره انجام دهید.',
            'در صورت استفاده از دستگاه بدون اینترنت، شماره تماس اورژانس کلینیک همیشه در بخش کمک فوری در دسترس است.',
          ],
          paragraphsFa: <String>[
            BinaBrand.format(
              'همراه گرامی، دسترسی شما در {appName} بر اساس مجوز بیمار تنظیم می‌شود و هر زمان که سوال یا نشانه هشدار مشاهده کردید می‌توانید فوراً با کلینیک تماس بگیرید.',
            ),
          ],
          cautionFa: 'همراه مجاز به تغییر دوز دارو یا قطع خودسرانه قطره‌های تجویز‌شده نیست.',
        ),
      ];

  static EducationTopic? findById(String id) {
    for (final t in allTopics()) {
      if (t.id == id) return t;
    }
    return null;
  }
}

/// EDU-01 `/care/education`
class EducationListScreen extends StatefulWidget {
  const EducationListScreen({super.key});

  @override
  State<EducationListScreen> createState() => _EducationListScreenState();
}

class _EducationListScreenState extends State<EducationListScreen> {
  String _selectedCategory = 'همه';

  @override
  Widget build(BuildContext context) {
    final topics = EducationCatalog.allTopics();
    final categories = <String>['همه', ...topics.map((t) => t.categoryFa).toSet()];
    final filtered = _selectedCategory == 'همه'
        ? topics
        : topics.where((t) => t.categoryFa == _selectedCategory).toList(growable: false);

    return CareSubpageScaffold(
      title: 'آموزش و راهنما',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text(
            'مطالب آموزشی تاییدشده کلینیک برای مراقبت چشمی',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: context.binaPalette.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: <Widget>[
              for (final cat in categories)
                ChoiceChip(
                  label: Text(cat),
                  selected: _selectedCategory == cat,
                  onSelected: (_) => setState(() => _selectedCategory = cat),
                ),
            ],
          ),
          const SizedBox(height: 16),
          for (final topic in filtered) ...<Widget>[
            BinaRichRow(
              title: topic.titleFa,
              subtitle: topic.summaryFa,
              wellKind: topic.id == 'red-flags' ? BinaWellKind.urgent : BinaWellKind.education,
              icon: topic.id == 'red-flags' ? Icons.warning_amber_rounded : Icons.menu_book_outlined,
              trailing: BinaStatusChip(kind: BinaStatusKind.neutral, text: topic.categoryFa),
              onTap: () => context.push('/care/education/${topic.id}'),
            ),
            const SizedBox(height: 12),
          ],
        ],
      ),
    );
  }
}

/// EDU-02 `/care/education/:topicId` & EDU-04 unavailable state (`v2.1 §9.3`).
class EducationDetailScreen extends StatefulWidget {
  const EducationDetailScreen({
    super.key,
    required this.topicId,
  });

  final String topicId;

  @override
  State<EducationDetailScreen> createState() => _EducationDetailScreenState();
}

class _EducationDetailScreenState extends State<EducationDetailScreen> {
  // Never autoplays audio (`v2.1 §9.3`).
  bool _playing = false;
  int _elapsedSeconds = 0;
  Timer? _audioTimer;

  @override
  void dispose() {
    _audioTimer?.cancel();
    super.dispose();
  }

  void _toggleAudio() {
    if (_playing) {
      _audioTimer?.cancel();
      setState(() => _playing = false);
      return;
    }
    setState(() => _playing = true);
    _audioTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      if (_elapsedSeconds >= 60) {
        _audioTimer?.cancel();
        setState(() {
          _playing = false;
          _elapsedSeconds = 0;
        });
      } else {
        setState(() => _elapsedSeconds += 1);
      }
    });
  }

  String _formatElapsed(int seconds) {
    final m = (seconds ~/ 60).toString().padLeft(2, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return BinaI18nCatalog.toPersianDigits('$m:$s');
  }

  @override
  Widget build(BuildContext context) {
    final topic = EducationCatalog.findById(widget.topicId);
    if (topic == null) {
      return CareSubpageScaffold(
        title: 'مطلب آموزشی',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            BinaEmptyState(
              icon: Icons.menu_book_outlined,
              title: 'مطلب آموزشی در دسترس نیست',
              message: 'این راهنما در نسخه فعلی موجود نیست یا بروزرسانی شده است.',
              actionLabel: 'بازگشت به فهرست آموزش‌ها',
              onAction: () => context.go('/care/education'),
            ),
            const SizedBox(height: 12),
            BinaSecondaryButton(
              label: 'کمک فوری و تماس با کلینیک',
              icon: Icons.phone_in_talk_rounded,
              onPressed: () => context.push('/help/urgent'),
            ),
          ],
        ),
      );
    }

    final p = context.binaPalette;
    // Reading body >= 18sp per `v2.1 §9.3`.
    final readingStyle = Theme.of(context).textTheme.bodyLarge?.copyWith(
          fontSize: 18,
          height: 1.75,
          color: p.onSurface,
        );

    return CareSubpageScaffold(
      title: topic.titleFa,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          BinaStatusChip(kind: BinaStatusKind.info, text: topic.categoryFa),
          const SizedBox(height: 12),
          Text(topic.summaryFa, style: readingStyle?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 16),
          BinaAudioPlayer(
            title: _playing
                ? '${topic.titleFa} (${_formatElapsed(_elapsedSeconds)} / ${topic.audioDurationFa})'
                : 'نسخه صوتی: ${topic.titleFa} (${topic.audioDurationFa})',
            playing: _playing,
            onTogglePlay: _toggleAudio,
          ),
          const SizedBox(height: 16),
          // Core instructions ALWAYS visible — never hidden behind collapsed accordions (`v2.1 §9.3`).
          BinaSurface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Text('مراحل کلیدی', style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 12),
                for (var i = 0; i < topic.stepsFa.length; i += 1) ...<Widget>[
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      const BinaIconWell(
                        kind: BinaWellKind.education,
                        icon: Icons.check_rounded,
                        size: 36,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(topic.stepsFa[i], style: readingStyle),
                      ),
                    ],
                  ),
                  if (i + 1 < topic.stepsFa.length) const SizedBox(height: 12),
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),
          BinaSurface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                for (var i = 0; i < topic.paragraphsFa.length; i += 1) ...<Widget>[
                  Text(topic.paragraphsFa[i], style: readingStyle),
                  if (i + 1 < topic.paragraphsFa.length) const SizedBox(height: 12),
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),
          BinaBanner(
            kind: BinaStatusKind.warning,
            title: 'نکته ایمنی',
            body: topic.cautionFa,
            actionLabel: 'کمک فوری و تماس با کلینیک',
            onAction: () => context.push('/help/urgent'),
          ),
          const SizedBox(height: 16),
          BinaSecondaryButton(
            label: 'بازگشت به فهرست آموزش‌ها',
            icon: Icons.arrow_forward_rounded,
            onPressed: () => context.pop(),
          ),
        ],
      ),
    );
  }
}
