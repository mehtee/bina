import React, { useState } from "react";
import { KeyRound, Palette, RotateCcw, ShieldCheck } from "lucide-react";
import { useAuth } from "~/core/auth/auth-context";
import { toFriendlyError } from "~/core/errors/error-mapper";
import { formatRoleFa } from "~/core/i18n/fa-ir";
import {
  useTheme,
  type DensityPreset,
  type SidebarVariant,
  type ThemePreference,
} from "~/core/theme/theme-provider";
import { PageHeader } from "~/design-system/composites/kpi-and-cards";
import { Button, StatusBadge } from "~/design-system/primitives/badges-and-buttons";
import { AlertBanner } from "~/design-system/primitives/state-surfaces";

export function SettingsPage() {
  const { session, performStepUp, logout } = useAuth();
  const {
    themePreference,
    resolvedTheme,
    sidebarVariant,
    density,
    setThemePreference,
    setSidebarVariant,
    setDensity,
    resetPreferences,
  } = useTheme();

  const [stepUpCode, setStepUpCode] = useState("");
  const [stepUpMsg, setStepUpMsg] = useState<string | null>(null);
  const [stepUpErr, setStepUpErr] = useState<string | null>(null);
  const [stepUpBusy, setStepUpBusy] = useState(false);

  if (!session) return null;

  async function handleStepUp(e: React.FormEvent) {
    e.preventDefault();
    setStepUpBusy(true);
    setStepUpMsg(null);
    setStepUpErr(null);
    try {
      await performStepUp(stepUpCode);
      setStepUpMsg("تایید مجدد امنیتی (Step-Up) با موفقیت فعال شد.");
      setStepUpCode("");
    } catch (err) {
      setStepUpErr(toFriendlyError(err).messageFa);
    } finally {
      setStepUpBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <PageHeader
        title="تنظیمات کاربری، ظاهر و امنیت نشست (M05–M08, M11)"
        subtitle="فقط ترجیحات غیربالینی ظاهر در مرورگر ذخیره می‌شوند؛ توکن‌ها و داده‌های بیمار صرفاً در حافظه موقت نگهداری می‌شوند."
        showWave
      />

      <div className="bina-grid">
        {/* Appearance & Density M06 */}
        <section className="bina-panel-raised" style={{ gridColumn: "span 6", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="bina-section-h2" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Palette size={18} /> ظاهر و تراکم میز کار (M06)
            </h2>
            <Button variant="ghost" icon={<RotateCcw size={15} />} onClick={resetPreferences}>
              بازنشانی پیش‌فرض
            </Button>
          </div>

          <div>
            <div style={{ fontSize: "0.8125rem", fontWeight: 600, marginBottom: 6 }}>
              تم نمایش (فعال: {resolvedTheme === "dark" ? "تیره" : "روشن"} — بدون تغییر رنگ تصاویر پزشکی)
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {(
                [
                  ["light", "روشن (پیش‌فرض)"],
                  ["dark", "تیره"],
                  ["system", "همگام با سیستم"],
                ] as Array<[ThemePreference, string]>
              ).map(([val, lbl]) => (
                <Button
                  key={val}
                  variant={themePreference === val ? "primary" : "secondary"}
                  onClick={() => setThemePreference(val)}
                >
                  {lbl}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.8125rem", fontWeight: 600, marginBottom: 6 }}>
              رنگ نوار کناری (Sidebar Variant)
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {(
                [
                  ["ice", "سفید-یخی روشن (پیش‌فرض R07)"],
                  ["deep", "سبز-آبی تیره (R03/R06)"],
                ] as Array<[SidebarVariant, string]>
              ).map(([val, lbl]) => (
                <Button
                  key={val}
                  variant={sidebarVariant === val ? "primary" : "secondary"}
                  onClick={() => setSidebarVariant(val)}
                >
                  {lbl}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.8125rem", fontWeight: 600, marginBottom: 6 }}>
              تراکم جدول و کنترل‌ها
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {(
                [
                  ["compact", "فشرده دسکتاپ (۳۸px)"],
                  ["comfortable", "متعادل (۴۴px)"],
                  ["accessible", "دسترس‌پذیر (۵۶px)"],
                ] as Array<[DensityPreset, string]>
              ).map(([val, lbl]) => (
                <Button
                  key={val}
                  variant={density === val ? "primary" : "secondary"}
                  onClick={() => setDensity(val)}
                >
                  {lbl}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Account & Step-Up M03/M05/M08 */}
        <section className="bina-panel-raised" style={{ gridColumn: "span 6", display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 className="bina-section-h2" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ShieldCheck size={18} /> حساب کاربری، امنیت و تایید مجدد
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: "0.8125rem" }}>
            <div>نقش فعال: <strong>{formatRoleFa(session.role)}</strong></div>
            <div>کلینیک: <strong>{session.clinic?.nameFa}</strong></div>
            <div>
              وضعیت MFA:{" "}
              <StatusBadge tone={session.mfaVerified ? "success" : "warning"} label={session.mfaVerified ? "تاییدشده" : "ناقص"} />
            </div>
            <div>
              وضعیت Step-Up:{" "}
              <StatusBadge tone={session.stepUpVerified ? "success" : "neutral"} label={session.stepUpVerified ? "فعال" : "غیرفعال"} />
            </div>
          </div>

          {stepUpMsg && <AlertBanner tone="success" title={stepUpMsg} />}
          {stepUpErr && <AlertBanner tone="error" title="خطای تایید مجدد" description={stepUpErr} />}

          <form onSubmit={(e) => void handleStepUp(e)} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="step-up-code" style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, marginBottom: 4 }}>
                کد تایید مجدد برای مشاهده لاگ ممیزی یا خروجی PHI
              </label>
              <input
                id="step-up-code"
                dir="ltr"
                className="bina-input"
                value={stepUpCode}
                onChange={(e) => setStepUpCode(e.target.value)}
                placeholder="حداقل ۶ رقم (نمونه توسعه: 654321)"
              />
            </div>
            <Button type="submit" variant="primary" loading={stepUpBusy} icon={<KeyRound size={15} />}>
              فعال‌سازی Step-Up
            </Button>
          </form>

          <div style={{ borderBlockStart: "1px solid var(--panel-divider)", paddingBlockStart: 10, fontSize: "0.8125rem", color: "var(--on-surface-variant)" }}>
            <strong>راهنمای میانبرهای صفحه‌کلید (M11):</strong>{" "}
            <bdi dir="ltr">Ctrl/Cmd + K</bdi> جستجوی سراسری • <bdi dir="ltr">Esc</bdi> بستن پنجره • کلیدهای <bdi dir="ltr">+ / - / 0</bdi> در بوم تصویر تشخیصی.
          </div>

          <div>
            <Button variant="secondary" onClick={logout}>
              خروج امن و پاکسازی نشست
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
