import logoFullDark from "~/assets/design/runtime/logo_full_dark.png";
import logoFullLight from "~/assets/design/runtime/logo_full_light.png";
import logoMarkDark from "~/assets/design/runtime/logo_mark_dark.png";
import logoMarkLight from "~/assets/design/runtime/logo_mark_light.png";
import irisDark from "~/assets/design/runtime/iris_dark.webp";
import irisLight from "~/assets/design/runtime/iris_light.webp";
import waveFooterDark from "~/assets/design/runtime/wave_footer_dark.webp";
import waveFooterLight from "~/assets/design/runtime/wave_footer_light.webp";
import waveHeaderDark from "~/assets/design/runtime/wave_header_dark.webp";
import waveHeaderLight from "~/assets/design/runtime/wave_header_light.webp";
import { getStaffBrand } from "~/core/config/brand";
import { useTheme } from "~/core/theme/theme-provider";

export function BrandLockup({
  collapsed = false,
  forceDarkLogo = false,
  width,
}: {
  collapsed?: boolean;
  forceDarkLogo?: boolean;
  width?: number;
}) {
  const { resolvedTheme } = useTheme();
  const brand = getStaffBrand();
  const useDark = forceDarkLogo || resolvedTheme === "dark";

  if (collapsed) {
    return (
      <img
        src={useDark ? logoMarkDark : logoMarkLight}
        alt={brand.appNameFa}
        width={32}
        height={32}
        style={{ width: 32, height: 32, objectFit: "contain", display: "block" }}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <img
        src={useDark ? logoFullDark : logoFullLight}
        alt={brand.appNameFa}
        style={{
          width: width ?? 140,
          height: 36,
          objectFit: "contain",
          objectPosition: "right center",
          display: "block",
        }}
      />
      <span
        style={{
          fontSize: "0.7rem",
          color: forceDarkLogo ? "var(--nav-deep-muted)" : "var(--muted)",
          lineHeight: 1.3,
        }}
      >
        {brand.clinicalSubtitleFa}
      </span>
    </div>
  );
}

export function HeaderWaveArtwork() {
  const { resolvedTheme } = useTheme();
  return (
    <img
      src={resolvedTheme === "dark" ? waveHeaderDark : waveHeaderLight}
      alt=""
      aria-hidden="true"
      className="bina-brand-art"
      style={{
        position: "absolute",
        insetBlockStart: 0,
        insetInlineStart: 0,
        maxWidth: 520,
        height: 84,
        objectFit: "cover",
        opacity: resolvedTheme === "dark" ? 0.25 : 0.45,
        maskImage: "linear-gradient(to left, rgba(0,0,0,0.85), rgba(0,0,0,0.05) 85%)",
        WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,0.85), rgba(0,0,0,0.05) 85%)",
      }}
    />
  );
}

export function FooterWaveArtwork({
  compact = false,
  forceDark = false,
}: {
  compact?: boolean;
  forceDark?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const useDark = forceDark || resolvedTheme === "dark";
  return (
    <img
      src={useDark ? waveFooterDark : waveFooterLight}
      alt=""
      aria-hidden="true"
      className="bina-brand-art"
      style={{
        width: "100%",
        height: compact ? 72 : 140,
        objectFit: "cover",
        opacity: useDark ? 0.55 : 0.65,
        borderRadius: compact ? 8 : 0,
        display: "block",
      }}
    />
  );
}

export function IrisHeroArtwork({ size = 380 }: { size?: number }) {
  const { resolvedTheme } = useTheme();
  const brand = getStaffBrand();
  return (
    <img
      src={resolvedTheme === "dark" ? irisDark : irisLight}
      alt=""
      aria-hidden="true"
      className="bina-brand-art"
      data-brand-name={brand.appNameEn}
      style={{
        width: "100%",
        maxWidth: size,
        maxHeight: size,
        objectFit: "contain",
        display: "block",
      }}
    />
  );
}
