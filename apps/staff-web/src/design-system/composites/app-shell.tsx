import React, { useEffect, useState } from "react";
import {
  Activity,
  BellRing,
  Building2,
  CalendarCheck,
  ChartNoAxesCombined,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  PanelRightClose,
  PanelRightOpen,
  Plug,
  ScanEye,
  Search,
  Server,
  Settings,
  ShieldAlert,
  Sun,
  Users,
} from "lucide-react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { apiRequest, warmUpTransport } from "~/core/api/client";
import type { WorkspaceSearchResponse } from "~/core/api/contracts";
import { isMockMode } from "~/core/api/modes";
import { useAuth, useCapabilities } from "~/core/auth/auth-context";
import {
  DEMO_BANNER_TEXT_FA,
  formatPersianDigits,
  formatEyeLabelFa,
} from "~/core/i18n/fa-ir";
import { useTheme } from "~/core/theme/theme-provider";
import { ModalDialog } from "~/design-system/composites/data-table";
import { Button } from "~/design-system/primitives/badges-and-buttons";
import { BrandLockup, FooterWaveArtwork } from "~/design-system/primitives/brand-artwork";
import { AlertBanner } from "~/design-system/primitives/state-surfaces";

interface NavDestination {
  readonly group: "work" | "care" | "records" | "admin" | "account";
  readonly to: string;
  readonly labelFa: string;
  readonly icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  readonly requiredCap?: string;
}

const NAV_DESTINATIONS: readonly NavDestination[] = [
  { group: "work", to: "/overview", labelFa: "داشبورد", icon: LayoutDashboard },
  { group: "work", to: "/patients", labelFa: "بیماران", icon: Users, requiredCap: "patient:read" },
  { group: "work", to: "/diagnostics", labelFa: "میز کار تشخیصی AI", icon: ScanEye },
  { group: "work", to: "/monitoring", labelFa: "پایش خانگی", icon: Activity },
  { group: "care", to: "/care", labelFa: "مراقبت و درمان", icon: HeartPulse },
  { group: "care", to: "/triage", labelFa: "تریاژ و هشدارها", icon: BellRing, requiredCap: "triage:manage" },
  { group: "care", to: "/follow-ups", labelFa: "پیگیری‌ها و ارجاعات", icon: CalendarCheck },
  { group: "records", to: "/reports", labelFa: "گزارش‌های پزشکی", icon: FileText, requiredCap: "report:read" },
  { group: "records", to: "/analytics", labelFa: "آمار و عملکرد", icon: ChartNoAxesCombined, requiredCap: "analytics:read" },
  { group: "admin", to: "/admin", labelFa: "مدیریت کلینیک", icon: Building2, requiredCap: "admin:manage" },
  { group: "admin", to: "/integrations", labelFa: "دستگاه‌ها و اتصالات", icon: Plug, requiredCap: "integrations:manage" },
  { group: "admin", to: "/ops", labelFa: "عملیات سیستم", icon: Server, requiredCap: "ops:read" },
  { group: "account", to: "/settings", labelFa: "تنظیمات", icon: Settings },
];

const ROLE_LABELS_FA: Record<string, string> = {
  ophthalmologist: "چشم‌پزشک",
  optometrist: "اپتومتریست",
  technician: "تکنسین تصویربرداری",
  coordinator: "هماهنگ‌کننده مراقبت",
  admin: "مدیر کلینیک",
};

export function AppShell() {
  const { session, logout } = useAuth();
  const { can } = useCapabilities();
  const {
    resolvedTheme,
    setThemePreference,
    sidebarVariant,
    density,
    sidebarCollapsed,
    setSidebarCollapsed,
  } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResult, setSearchResult] = useState<WorkspaceSearchResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchBusy, setSearchBusy] = useState(false);

  // Warm up transport & charts during idle time so route switches are instantaneous
  useEffect(() => {
    warmUpTransport();
    const timer = window.setTimeout(() => {
      void import("~/design-system/charts/clinical-charts");
    }, 300);
    return () => window.clearTimeout(timer);
  }, []);

  // Keyboard Ctrl/Cmd+K for global search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Debounced search query (abort superseded + zero persistent PHI search history)
  useEffect(() => {
    if (!searchOpen || !session?.accessToken) return;
    const q = searchTerm.trim();
    if (q.length < 2) {
      setSearchResult(null);
      setSearchError(null);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearchBusy(true);
      setSearchError(null);
      void apiRequest<WorkspaceSearchResponse>(`/v1/overview/search?q=${encodeURIComponent(q)}`, {
        token: session.accessToken,
        signal: controller.signal,
      })
        .then((res) => {
          setSearchResult(res);
          setSearchBusy(false);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSearchError("جستجو با خطا مواجه شد.");
            setSearchBusy(false);
          }
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchOpen, searchTerm, session?.accessToken]);

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const visibleNav = NAV_DESTINATIONS.filter((item) => !item.requiredCap || can(item.requiredCap));
  const workCareRecords = visibleNav.filter(
    (d) => d.group === "work" || d.group === "care" || d.group === "records"
  );
  const adminAccount = visibleNav.filter((d) => d.group === "admin" || d.group === "account");

  const isActivePath = (prefix: string) => {
    const isPatientMonitoring = /^\/patients\/[^/]+\/monitoring(\/|$)/.test(location.pathname);
    if (isPatientMonitoring) {
      return prefix === "/monitoring";
    }
    return location.pathname === prefix || location.pathname.startsWith(`${prefix}/`);
  };

  const handleCloseSearch = () => {
    setSearchOpen(false);
    setSearchTerm("");
    setSearchResult(null);
  };

  return (
    <div
      className="bina-shell"
      data-collapsed={sidebarCollapsed ? "true" : "false"}
      data-density={density}
    >
      <a className="bina-skip-link" href="#bina-main-content">
        رفتن به محتوای اصلی
      </a>

      {/* Right-hand RTL Persistent Sidebar */}
      <aside
        className="bina-sidebar"
        data-variant={sidebarVariant}
        aria-label="منوی اصلی میز کار"
      >
        <div
          style={{
            minBlockSize: 60,
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: sidebarCollapsed ? "center" : "space-between",
            borderBlockEnd:
              sidebarVariant === "deep"
                ? "1px solid rgba(255,255,255,0.12)"
                : "1px solid var(--panel-divider)",
          }}
        >
          <BrandLockup
            collapsed={sidebarCollapsed}
            forceDarkLogo={sidebarVariant === "deep"}
          />
        </div>

        <nav style={{ flex: 1, overflowY: "auto", paddingBlock: 6 }} aria-label="بخش‌های سامانه">
          {!sidebarCollapsed && <p className="bina-nav-group-label">عملیات بالینی</p>}
          {workCareRecords.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                prefetch="render"
                className="bina-nav-item"
                aria-current={active ? "page" : undefined}
                title={sidebarCollapsed ? item.labelFa : undefined}
              >
                <Icon size={18} aria-hidden={true} />
                {!sidebarCollapsed && <span>{item.labelFa}</span>}
              </Link>
            );
          })}

          {!sidebarCollapsed && (
            <p className="bina-nav-group-label" style={{ marginTop: 8 }}>
              مدیریت کلینیک
            </p>
          )}
          {adminAccount.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                prefetch="render"
                className="bina-nav-item"
                aria-current={active ? "page" : undefined}
                title={sidebarCollapsed ? item.labelFa : undefined}
              >
                <Icon size={18} aria-hidden={true} />
                {!sidebarCollapsed && <span>{item.labelFa}</span>}
              </Link>
            );
          })}
        </nav>

        <div style={{ borderBlockStart: "1px solid var(--panel-divider)", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
          <button
            type="button"
            className="bina-nav-item"
            style={{ width: "100%", border: "none", background: "transparent", cursor: "pointer", margin: 0 }}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? "باز کردن منوی کناری" : undefined}
          >
            {sidebarCollapsed ? <PanelRightOpen size={18} aria-hidden={true} /> : <PanelRightClose size={18} aria-hidden={true} />}
            {!sidebarCollapsed && <span>جمع کردن منو</span>}
          </button>
          {!sidebarCollapsed && <FooterWaveArtwork compact forceDark={sidebarVariant === "deep"} />}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="bina-main">
        {isMockMode() && (
          <div
            role="status"
            style={{
              background: "var(--warning-bg)",
              color: "var(--warning)",
              borderBlockEnd: "1px solid var(--warning)",
              padding: "6px 14px",
              fontSize: "0.75rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span>{DEMO_BANNER_TEXT_FA}</span>
            <span>داده واقعی بیمار در این حالت بارگذاری نمی‌شود</span>
          </div>
        )}

        <header className="bina-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
            <Button
              variant="ghost"
              className="bina-mobile-menu-btn"
              aria-label="منوی ناوبری"
              onClick={() => setMobileMenuOpen((v) => !v)}
              style={{ display: "none" }}
            >
              <Menu size={18} />
            </Button>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              style={{
                minBlockSize: 36,
                maxWidth: 420,
                flex: 1,
                borderRadius: "var(--radius-input)",
                border: "1px solid var(--outline-variant)",
                background: "var(--surface-soft)",
                color: "var(--on-surface-variant)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingInline: 10,
                cursor: "pointer",
                font: "inherit",
                fontSize: "0.8125rem",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Search size={15} aria-hidden="true" />
                <span>جستجوی سریع (بیمار، مطالعه، گزارش...)</span>
              </span>
              <kbd
                dir="ltr"
                style={{
                  fontSize: "0.7rem",
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: "var(--surface-raised)",
                  border: "1px solid var(--outline-variant)",
                }}
              >
                Ctrl + K
              </kbd>
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Link
              to="/select-clinic"
              className="bina-button"
              data-variant="secondary"
              style={{ minBlockSize: 34, fontSize: "0.75rem" }}
            >
              <Building2 size={15} aria-hidden="true" />
              <span>{session.clinic?.nameFa ?? "انتخاب کلینیک"}</span>
            </Link>

            {session.clinic?.todayJalali && (
              <span className="bina-badge" data-tone="neutral">
                {session.clinic.todayJalali}
              </span>
            )}

            <Button
              variant="ghost"
              aria-label={resolvedTheme === "dark" ? "تغییر به تم روشن" : "تغییر به تم تیره"}
              onClick={() => setThemePreference(resolvedTheme === "dark" ? "light" : "dark")}
              style={{ minInlineSize: 36, paddingInline: 8 }}
            >
              {resolvedTheme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </Button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                paddingInlineStart: 8,
                borderInlineStart: "1px solid var(--panel-divider)",
              }}
            >
              <div style={{ textAlign: "end", lineHeight: 1.25 }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                  {ROLE_LABELS_FA[session.role] ?? session.role}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                  {session.stepUpVerified ? "تایید مجدد فعال" : "MFA تاییدشده"}
                </div>
              </div>
              <Button
                variant="ghost"
                aria-label="خروج از سامانه"
                onClick={() => {
                  logout();
                  void navigate("/login");
                }}
                style={{ minInlineSize: 36, paddingInline: 8 }}
              >
                <LogOut size={17} />
              </Button>
            </div>
          </div>
        </header>

        {session.clinic && !session.clinic.currentlyStaffed && (
          <div style={{ paddingInline: "var(--page-gutter)", paddingBlockStart: 8 }}>
            <AlertBanner
              tone="warning"
              title="کلینیک در ساعات غیرپاسخ‌گویی است"
              description={`ساعات کاری: ${session.clinic.staffedHoursFa} — خط اورژانس آفلاین: ${session.clinic.emergencyPhone}`}
            />
          </div>
        )}

        <main id="bina-main-content" className="bina-page" tabIndex={-1}>
          {mobileMenuOpen && (
            <nav className="bina-panel-raised" aria-label="منوی فشرده">
              {visibleNav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="bina-nav-item"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.labelFa}
                </Link>
              ))}
            </nav>
          )}
          <div key={location.pathname} className="bina-page-enter" style={{ display: "flex", flexDirection: "column", gap: "var(--grid-gap)" }}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Search Command Palette (A04) */}
      <ModalDialog
        open={searchOpen}
        title="جست‌وجوی سراسری در کلینیک"
        onClose={handleCloseSearch}
        width={620}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label htmlFor="global-search-input" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
            نام بیمار، کد مطالعه یا عنوان گزارش
          </label>
          <input
            id="global-search-input"
            className="bina-input"
            autoFocus
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="حداقل ۲ کاراکتر وارد کنید..."
          />
          {searchBusy && <div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>در حال جستجو...</div>}
          {searchError && <div style={{ fontSize: "0.8125rem", color: "var(--error)" }}>{searchError}</div>}
          {searchResult && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <h3 className="bina-panel-h3">
                  بیماران ({formatPersianDigits(searchResult.patients.length)})
                </h3>
                {searchResult.patients.length === 0 ? (
                  <p style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>موردی یافت نشد.</p>
                ) : (
                  searchResult.patients.map((p) => {
                    const pid = String(p.patientId ?? "");
                    return (
                      <Link
                        key={pid}
                        to={`/patients/${pid}`}
                        onClick={handleCloseSearch}
                        className="bina-nav-item"
                      >
                        <span>{String(p.fullNameFa ?? pid)}</span>
                        <bdi dir="ltr" style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
                          {String(p.phoneMasked ?? "")}
                        </bdi>
                      </Link>
                    );
                  })
                )}
              </div>

              <div>
                <h3 className="bina-panel-h3">
                  مطالعات تشخیصی ({formatPersianDigits(searchResult.studies.length)})
                </h3>
                {searchResult.studies.map((s) => {
                  const sid = String(s.studyId ?? "");
                  return (
                    <Link
                      key={sid}
                      to={`/diagnostics/${sid}`}
                      onClick={handleCloseSearch}
                      className="bina-nav-item"
                    >
                      <span>{String(s.patientNameFa ?? sid)}</span>
                      <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>
                        {formatEyeLabelFa(String(s.eyeLaterality ?? "OD"))}
                        {s.createdAtJalali ? ` — ${String(s.createdAtJalali)}` : ""}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ModalDialog>
    </div>
  );
}

export function RequireCapability({
  capability,
  children,
}: {
  capability: string;
  children: React.ReactNode;
}) {
  const { can } = useCapabilities();
  if (!can(capability)) {
    return (
      <div className="bina-panel-raised" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--error)" }}>
          <ShieldAlert size={20} />
          <h2 className="bina-section-h2">دسترسی به این بخش مجاز نیست</h2>
        </div>
        <p style={{ margin: 0, color: "var(--on-surface-variant)", fontSize: "0.875rem" }}>
          نقش کاربری فعلی شما فاقد مجوز لازم (<bdi dir="ltr">{capability}</bdi>) برای این صفحه است.
        </p>
        <div>
          <Link to="/overview" className="bina-button" data-variant="secondary">
            بازگشت به داشبورد
          </Link>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
