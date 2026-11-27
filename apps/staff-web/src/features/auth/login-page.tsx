import React, { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Navigate, useNavigate } from "react-router";
import { useAuth } from "~/core/auth/auth-context";
import { isMockMode } from "~/core/api/modes";
import { getStaffBrand } from "~/core/config/brand";
import { toFriendlyError } from "~/core/errors/error-mapper";
import {
  SYNTHETIC_CONSTANTS,
  SYNTHETIC_DEMO_ACCOUNTS,
} from "~/core/fixtures/staff-web-fixtures";
import { DEMO_BANNER_TEXT_FA } from "~/core/i18n/fa-ir";
import { useTheme } from "~/core/theme/theme-provider";
import { Button } from "~/design-system/primitives/badges-and-buttons";
import {
  BrandLockup,
  FooterWaveArtwork,
  IrisHeroArtwork,
} from "~/design-system/primitives/brand-artwork";
import { AlertBanner } from "~/design-system/primitives/state-surfaces";

export function LoginPage() {
  const { session, loginWithOidc, loading, sessionExpiredNotice, clearExpiredNotice } = useAuth();
  const { resolvedTheme, setThemePreference } = useTheme();
  const navigate = useNavigate();
  const brand = getStaffBrand();

  const [oidcToken, setOidcToken] = useState(
    isMockMode() ? SYNTHETIC_DEMO_ACCOUNTS[0].oidcToken : ""
  );
  const [clinicId, setClinicId] = useState<string>(SYNTHETIC_CONSTANTS.CLINIC_A1);
  const [mfaCode, setMfaCode] = useState("");
  const [errorFa, setErrorFa] = useState<string | null>(null);

  if (session) {
    return <Navigate to="/overview" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorFa(null);
    clearExpiredNotice();
    try {
      await loginWithOidc({
        oidcToken: oidcToken.trim(),
        clinicId: clinicId.trim(),
        mfaCode: mfaCode.trim() || undefined,
      });
      void navigate("/overview", { replace: true });
    } catch (err) {
      setErrorFa(toFriendlyError(err).messageFa);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "grid",
        gridTemplateColumns: "minmax(0, 44fr) minmax(0, 56fr)",
        background: "linear-gradient(150deg, var(--canvas-top) 0%, var(--canvas) 40%, var(--canvas-bottom) 100%)",
      }}
    >
      {/* Right column (inline-start in RTL): Staff OIDC Login Form */}
      <section
        aria-label="ورود کادر درمان"
        style={{
          background: "var(--surface-raised)",
          borderInlineEnd: "1px solid var(--outline-variant)",
          padding: "32px 28px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <BrandLockup width={150} />
          <Button
            variant="ghost"
            onClick={() => setThemePreference(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {resolvedTheme === "dark" ? "تم روشن" : "تم تیره"}
          </Button>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          style={{ width: "100%", maxWidth: 380, marginInline: "auto", display: "flex", flexDirection: "column", gap: 14 }}
        >
          {isMockMode() && (
            <AlertBanner
              tone="warning"
              title={DEMO_BANNER_TEXT_FA}
              description="انتخاب نقش آزمایشی فقط در محیط نمایشی فعال است."
            />
          )}

          {sessionExpiredNotice && (
            <AlertBanner
              tone="warning"
              title="نشست کاربری منقضی شد"
              description="به دلایل امنیتی اطلاعات پاک شد؛ لطفاً دوباره وارد شوید."
            />
          )}

          {errorFa && <AlertBanner tone="error" title="خطا در ورود" description={errorFa} />}

          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", lineHeight: "2.25rem", fontWeight: 700 }}>
              ورود کارکنان و پزشکان {brand.appNameFa}
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: "0.875rem", color: "var(--on-surface-variant)" }}>
              احراز هویت امن از طریق توکن سازمانی OIDC و کنترل دسترسی کلینیک
            </p>
          </div>

          {isMockMode() && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--muted)" }}>
                انتخاب سریع نقش آزمایشی:
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {SYNTHETIC_DEMO_ACCOUNTS.map((acc) => (
                  <Button
                    key={acc.userId}
                    variant={oidcToken === acc.oidcToken ? "primary" : "secondary"}
                    onClick={() => setOidcToken(acc.oidcToken)}
                    style={{ fontSize: "0.75rem", minBlockSize: 34 }}
                  >
                    {acc.nameFa}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="login-oidc" style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: 4 }}>
              شناسه / توکن احراز هویت OIDC
            </label>
            <input
              id="login-oidc"
              dir="ltr"
              className="bina-input"
              required
              value={oidcToken}
              onChange={(e) => setOidcToken(e.target.value)}
              placeholder="dev-oidc:<staff-user-uuid>"
            />
          </div>

          <div>
            <label htmlFor="login-clinic" style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: 4 }}>
              شناسه کلینیک (Clinic UUID)
            </label>
            <input
              id="login-clinic"
              dir="ltr"
              className="bina-input"
              required
              value={clinicId}
              onChange={(e) => setClinicId(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="login-mfa" style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: 4 }}>
              کد تایید دومرحله‌ای MFA (در صورت نیاز ارائه‌دهنده)
            </label>
            <input
              id="login-mfa"
              dir="ltr"
              className="bina-input"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              placeholder="اختیاری در محیط توسعه"
            />
          </div>

          <Button type="submit" variant="gradient" loading={loading} icon={<ShieldCheck size={17} />} style={{ minBlockSize: 42 }}>
            ورود کارکنان
          </Button>
        </form>

        <div style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "center" }}>
          میز کار یکپارچه چشم‌پزشکی • پشتیبانی فارسی RTL و تقویم جلالی • بدون ذخیره PHI در مرورگر
        </div>
      </section>

      {/* Left column: Brand Illustration Panel (A01 + A03) */}
      <aside
        aria-hidden="true"
        style={{
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: 32,
          background: "linear-gradient(155deg, var(--surface-raised) 0%, var(--surface-mint) 50%, var(--surface-aqua) 100%)",
        }}
      >
        <div />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
          <IrisHeroArtwork size={380} />
          <div style={{ fontWeight: 700, fontSize: "1.125rem", color: "var(--primary)" }}>
            مراقبت بالینی دقیق پس از جراحی و پایش تشخیصی چندوجهی
          </div>
          <div style={{ fontSize: "0.875rem", color: "var(--on-surface-variant)", maxWidth: 440 }}>
            جداسازی کامل چشم راست و چپ، تایید اجباری چشم‌پزشک (HITL)، و حفاظت از کف فوریت قطعی
          </div>
        </div>
        <div style={{ width: "100%", marginBottom: -32, marginInline: -32 }}>
          <FooterWaveArtwork />
        </div>
      </aside>
    </div>
  );
}
