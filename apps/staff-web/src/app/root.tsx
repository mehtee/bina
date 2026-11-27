import type React from "react";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { AuthProvider } from "~/core/auth/auth-context";
import { getStaffBrand } from "~/core/config/brand";
import { ThemeProvider } from "~/core/theme/theme-provider";
import "~/design-system/tokens/global.css";

export function Layout({ children }: { children: React.ReactNode }) {
  const brand = getStaffBrand();
  return (
    <html lang="fa-IR" dir="rtl" data-theme="light" data-density="compact" data-sidebar="light">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{brand.clinicalSubtitleFa}</title>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function HydrateFallback() {
  const brand = getStaffBrand();
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "var(--canvas)",
        color: "var(--on-surface)",
      }}
    >
      <div className="bina-panel-raised" style={{ padding: 24, textAlign: "center", maxWidth: 360 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem" }}>{brand.clinicalSubtitleFa}</p>
        <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: "0.875rem" }}>
          در حال بارگذاری محیط کاری کلینیک…
        </p>
      </div>
    </main>
  );
}

export default function Root() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </ThemeProvider>
  );
}

export function ErrorBoundary({ error }: { error: unknown }) {
  let title = "خطای غیرمنتظره در برنامه";
  let detail = "لطفاً صفحه را بازنشانی کنید یا با پشتیبانی فنی کلینیک تماس بگیرید.";

  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? "صفحه مورد نظر یافت نشد" : `خطای ${error.status}`;
    detail = typeof error.data === "string" ? error.data : error.statusText || detail;
  } else if (error instanceof Error) {
    detail = error.message || detail;
  }

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "var(--canvas)",
        color: "var(--on-surface)",
      }}
    >
      <section className="bina-panel-raised" style={{ padding: 24, maxWidth: 460, display: "grid", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: "1.125rem", color: "var(--error)" }}>{title}</h1>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--on-surface-variant)" }}>{detail}</p>
        <div>
          <a href="/overview" className="bina-button" data-variant="primary">
            بازگشت به داشبورد
          </a>
        </div>
      </section>
    </main>
  );
}
