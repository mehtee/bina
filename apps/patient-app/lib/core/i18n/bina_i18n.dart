import 'dart:convert';

import 'package:bina_api_dtos/bina_api_dtos.dart';
import 'package:bina_design_system/bina_design_system.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Pure Persian (`fa-IR`) formatting, digit normalization, bidi isolation, and
/// centralized i18n catalog reader (`ADR-035`, `v2.1 §11.2`).
@immutable
class BinaI18nCatalog {
  const BinaI18nCatalog._(this._sections);

  final Map<String, Map<String, String>> _sections;

  static Future<BinaI18nCatalog> loadFromAsset({
    AssetBundle? bundle,
    String assetPath = 'assets/contracts/fa-IR.json',
  }) async {
    final targetBundle = bundle ?? rootBundle;
    final raw = await targetBundle.loadString(assetPath);
    return fromJsonString(raw);
  }

  static BinaI18nCatalog fromJsonString(String rawJson) {
    final decoded = jsonDecode(rawJson) as Map<String, Object?>;
    final sections = <String, Map<String, String>>{};
    for (final entry in decoded.entries) {
      final val = entry.value;
      if (val is Map<String, Object?>) {
        sections[entry.key] = val.map((k, v) => MapEntry(k, v.toString()));
      }
    }
    return BinaI18nCatalog._(sections);
  }

  String text(String section, String key, {Map<String, String> params = const {}}) {
    final raw = _sections[section]?[key] ?? '$section.$key';
    var resolved = BinaBrand.format(raw);
    for (final entry in params.entries) {
      resolved = resolved.replaceAll('{${entry.key}}', entry.value);
    }
    return resolved;
  }

  String lateralityLabel(EyeLaterality eye) {
    return switch (eye) {
      EyeLaterality.oD => text('common', 'eyeOd'),
      EyeLaterality.oS => text('common', 'eyeOs'),
    };
  }

  String urgencyLabel(UrgencyTier tier) => text('urgency', tier.value);

  static const Map<int, String> _asciiToFa = <int, String>{
    0x30: '۰',
    0x31: '۱',
    0x32: '۲',
    0x33: '۳',
    0x34: '۴',
    0x35: '۵',
    0x36: '۶',
    0x37: '۷',
    0x38: '۸',
    0x39: '۹',
  };

  /// Converts ASCII (`0-9`) digits to Persian digits (`۰-۹`).
  static String toPersianDigits(String input) {
    final buf = StringBuffer();
    for (final rune in input.runes) {
      buf.write(_asciiToFa[rune] ?? String.fromCharCode(rune));
    }
    return buf.toString();
  }

  /// Normalizes Persian (`۰-۹`) and Arabic-Indic (`٠-٩`) digits to ASCII (`0-9`).
  static String normalizeDigitsToAscii(String input) {
    final buf = StringBuffer();
    for (final rune in input.runes) {
      if (rune >= 0x06F0 && rune <= 0x06F9) {
        buf.writeCharCode(0x30 + (rune - 0x06F0));
      } else if (rune >= 0x0660 && rune <= 0x0669) {
        buf.writeCharCode(0x30 + (rune - 0x0660));
      } else {
        buf.writeCharCode(rune);
      }
    }
    return buf.toString();
  }

  /// Wraps Latin units/codes (`+98...`, `mmHg`, `logMAR`, timestamps) in Unicode
  /// LTR isolate (`U+2066 ... U+2069`) inside RTL sentences (`v2.1 §11.2`).
  static String isolateLtr(String value) => '\u2066$value\u2069';

  /// Normalizes Iranian mobile input (`09...`, `+989...`, `989...`, Persian digits)
  /// to canonical `+989XXXXXXXXX` or returns `null` if invalid.
  static String? normalizeIranMobileE164(String raw) {
    final digits = normalizeDigitsToAscii(raw).replaceAll(RegExp(r'[\s\-().]'), '');
    if (RegExp(r'^\+989\d{9}$').hasMatch(digits)) return digits;
    if (RegExp(r'^989\d{9}$').hasMatch(digits)) return '+$digits';
    if (RegExp(r'^09\d{9}$').hasMatch(digits)) return '+98${digits.substring(1)}';
    if (RegExp(r'^9\d{9}$').hasMatch(digits)) return '+98$digits';
    return null;
  }
}
