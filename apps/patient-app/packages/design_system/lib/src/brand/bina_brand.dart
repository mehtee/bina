/// Centralized product display name configuration (`ADR-035`).
///
/// Never hardcode `بینا` or `Bina AI` in UI strings, ARB catalogs, or widgets.
/// Override via `--dart-define=APP_BRAND_NAME_FA=...` at build time.
abstract final class BinaBrand {
  static const String defaultNameFa = 'بینا';
  static const String defaultNameEn = 'Bina AI';

  static const String appNameFa = String.fromEnvironment(
    'APP_BRAND_NAME_FA',
    defaultValue: defaultNameFa,
  );

  static const String appNameEn = String.fromEnvironment(
    'APP_BRAND_NAME_EN',
    defaultValue: defaultNameEn,
  );

  /// Replaces `{appName}` in localized templates with [appNameFa].
  static String format(String template, {String? overrideBrandFa}) {
    final brand = (overrideBrandFa != null && overrideBrandFa.trim().isNotEmpty)
        ? overrideBrandFa
        : appNameFa;
    return template.replaceAll('{appName}', brand);
  }
}
