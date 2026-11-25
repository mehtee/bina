import 'package:bina_api_dtos/bina_api_dtos.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../app/providers.dart';
import '../../core/data/patient_gateway.dart';
import '../../core/i18n/bina_i18n.dart';

@immutable
class AuthFlowState {
  const AuthFlowState({
    this.isCaregiverMode = false,
    this.phoneE164 = '',
    this.maskedPhone = '',
    this.challengeId = '',
    this.expiresInSeconds = 180,
    this.otpCode = '',
    this.consentAccepted = false,
    this.consentVersion = 'fa-IR-v1.0',
    this.busy = false,
    this.errorMessageFa,
  });

  final bool isCaregiverMode;
  final String phoneE164;
  final String maskedPhone;
  final String challengeId;
  final int expiresInSeconds;
  final String otpCode;
  final bool consentAccepted;
  final String consentVersion;
  final bool busy;
  final String? errorMessageFa;

  AuthFlowState copyWith({
    bool? isCaregiverMode,
    String? phoneE164,
    String? maskedPhone,
    String? challengeId,
    int? expiresInSeconds,
    String? otpCode,
    bool? consentAccepted,
    String? consentVersion,
    bool? busy,
    String? errorMessageFa,
    bool clearError = false,
  }) {
    return AuthFlowState(
      isCaregiverMode: isCaregiverMode ?? this.isCaregiverMode,
      phoneE164: phoneE164 ?? this.phoneE164,
      maskedPhone: maskedPhone ?? this.maskedPhone,
      challengeId: challengeId ?? this.challengeId,
      expiresInSeconds: expiresInSeconds ?? this.expiresInSeconds,
      otpCode: otpCode ?? this.otpCode,
      consentAccepted: consentAccepted ?? this.consentAccepted,
      consentVersion: consentVersion ?? this.consentVersion,
      busy: busy ?? this.busy,
      errorMessageFa: clearError ? null : (errorMessageFa ?? this.errorMessageFa),
    );
  }
}

class AuthController extends Notifier<AuthFlowState> {
  @override
  AuthFlowState build() => const AuthFlowState();

  void setCaregiverMode(bool enabled) {
    state = state.copyWith(isCaregiverMode: enabled, clearError: true);
  }

  void setConsentAccepted(bool accepted) {
    state = state.copyWith(consentAccepted: accepted, clearError: true);
  }

  void clearError() {
    state = state.copyWith(clearError: true);
  }

  Future<bool> requestOtp(String rawPhoneInput) async {
    final e164 = BinaI18nCatalog.normalizeIranMobileE164(rawPhoneInput);
    if (e164 == null) {
      state = state.copyWith(
        errorMessageFa: 'لطفاً شماره موبایل معتبر ایران (مانند ۰۹۱۲۳۴۵۶۷۸۹) وارد کنید.',
      );
      return false;
    }

    final config = ref.read(appConfigProvider);
    final gw = ref.read(patientGatewayProvider);
    state = state.copyWith(busy: true, clearError: true);
    try {
      final res = await gw.requestPatientOtp(
        PatientOtpRequest(
          phoneNumber: e164,
          clinicId: config.defaultClinicId,
          tenantId: config.defaultTenantId,
        ),
      );
      state = state.copyWith(
        busy: false,
        phoneE164: e164,
        maskedPhone: res.maskedPhone,
        challengeId: res.challengeId,
        expiresInSeconds: res.expiresInSeconds,
      );
      return true;
    } on PatientGatewayException catch (err) {
      state = state.copyWith(busy: false, errorMessageFa: err.messageFa);
      return false;
    } catch (_) {
      state = state.copyWith(
        busy: false,
        errorMessageFa: 'امکان ارسال کد تایید وجود ندارد. اتصال اینترنت را بررسی کنید.',
      );
      return false;
    }
  }

  /// Stores entered OTP; caregivers immediately verify grant, while patients
  /// proceed to explicit un-prechecked Persian consent review (`AUTH-06`).
  Future<String?> submitOtp(String rawOtp) async {
    final normalizedOtp = BinaI18nCatalog.normalizeDigitsToAscii(rawOtp).trim();
    if (normalizedOtp.length < 4) {
      state = state.copyWith(errorMessageFa: 'لطفاً کد تایید ارسال‌شده را کامل وارد کنید.');
      return null;
    }
    state = state.copyWith(otpCode: normalizedOtp, clearError: true);

    if (!state.isCaregiverMode) {
      return '/auth/consent';
    }

    final config = ref.read(appConfigProvider);
    final gw = ref.read(patientGatewayProvider);
    state = state.copyWith(busy: true);
    try {
      final res = await gw.verifyCaregiverOtp(
        CaregiverOtpVerifyRequest(
          challengeId: state.challengeId,
          otpCode: normalizedOtp,
          tenantId: config.defaultTenantId,
        ),
      );
      final session = AuthSessionContext(
        accessToken: res.accessToken,
        tenantId: res.tenantId,
        clinicId: res.clinicId,
        patientId: res.patientId,
        actorType: 'caregiver',
        grantId: res.grantId,
      );
      ref.read(sessionProvider.notifier).setSession(session);
      state = state.copyWith(busy: false);
      return res.patients.length > 1 ? '/caregiver/patients' : '/today';
    } on PatientGatewayException catch (err) {
      state = state.copyWith(busy: false, errorMessageFa: err.messageFa);
      return null;
    } catch (_) {
      state = state.copyWith(
        busy: false,
        errorMessageFa: 'تایید کد همراه با خطا مواجه شد.',
      );
      return null;
    }
  }

  Future<bool> completePatientConsentAndVerify() async {
    if (!state.consentAccepted) {
      state = state.copyWith(
        errorMessageFa: 'برای ادامه، مطالعه و پذیرش رضایت‌نامه فارسی الزامی است.',
      );
      return false;
    }

    final config = ref.read(appConfigProvider);
    final gw = ref.read(patientGatewayProvider);
    state = state.copyWith(busy: true, clearError: true);
    try {
      final res = await gw.verifyPatientOtp(
        PatientOtpVerifyRequest(
          challengeId: state.challengeId,
          otpCode: state.otpCode,
          consentAccepted: true,
          consentVersion: state.consentVersion,
          phoneNumber: state.phoneE164,
          tenantId: config.defaultTenantId,
        ),
      );
      final session = AuthSessionContext(
        accessToken: res.accessToken,
        tenantId: res.tenantId,
        clinicId: res.clinicId ?? config.defaultClinicId,
        patientId: res.patientId,
        actorType: 'patient',
      );
      ref.read(sessionProvider.notifier).setSession(session);
      try {
        final clinic = await gw.getCurrentClinic(session: session);
        await ref.read(sessionCacheRepositoryProvider).saveClinic(session, clinic);
      } catch (_) {
        // Non-fatal during initial login.
      }
      state = state.copyWith(busy: false);
      return true;
    } on PatientGatewayException catch (err) {
      state = state.copyWith(busy: false, errorMessageFa: err.messageFa);
      return false;
    } catch (_) {
      state = state.copyWith(
        busy: false,
        errorMessageFa: 'امکان ثبت تایید ورود وجود ندارد. دوباره تلاش کنید.',
      );
      return false;
    }
  }
}

final authControllerProvider = NotifierProvider<AuthController, AuthFlowState>(AuthController.new);
