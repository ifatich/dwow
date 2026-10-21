"use client";

import React from "react";

export interface DwowLogoProps {
  /**
   * Tipe tampilan:
   * - "horizontal" | "vertical" | undefined: Lockup resmi [DW Mark] + Platform (Digital Way of Working)
   * - "mark": Hanya ikon emblem dual-circle DW.
   */
  variant?: "mark" | "horizontal" | "vertical";
  /**
   * Ukuran komponen
   */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /**
   * Tema warna:
   * - "dark" / "obsidian": Hitam standar (Light canvas)
   * - "white": Putih inverted (Dark canvas)
   */
  theme?: "dark" | "obsidian" | "white" | "light";
  /**
   * Tampilkan subline "Digital Way of Working"
   */
  showSubline?: boolean;
  className?: string;
}

/**
 * Komponen Lambang Ikon Resmi D-WoW (Dual-Circle DW Emblem)
 */
export function DwowMark({
  size = "md",
  theme = "dark",
  className = "",
}: {
  size?: DwowLogoProps["size"];
  theme?: DwowLogoProps["theme"];
  className?: string;
}) {
  const isWhite = theme === "white";

  // Dimensi proporsional berdasarkan rasio aspek 638 x 365 (1.75:1)
  const sizeMap: Record<NonNullable<DwowLogoProps["size"]>, { h: number; w: number }> = {
    xs: { h: 18, w: 32 },
    sm: { h: 26, w: 45 },
    md: { h: 36, w: 63 },
    lg: { h: 48, w: 84 },
    xl: { h: 58, w: 101 },
  };

  const dim = sizeMap[size] || sizeMap.md;
  const imageSrc = isWhite ? "/dwow-logo-white.png" : "/dwow-logo.png";

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: `${dim.w}px`, height: `${dim.h}px` }}
      role="img"
      aria-label="D-WoW Logo Mark"
    >
      <img
        src={imageSrc}
        alt="D-WoW Dual-Circle Mark"
        width={dim.w}
        height={dim.h}
        className="h-full w-auto object-contain pointer-events-none select-none"
        loading="eager"
      />
    </div>
  );
}

/**
 * Komponen Resmi D-WoW Platform Logo Lockup:
 * [DW Mark] + Platform (Digital Way of Working)
 */
export function DwowLogo({
  variant = "horizontal",
  size = "md",
  theme = "dark",
  showSubline = true,
  className = "",
}: DwowLogoProps) {
  const isWhite = theme === "white";
  const imageSrc = isWhite ? "/dwow-logo-white.png" : "/dwow-logo.png";

  // Varian Mark Only
  if (variant === "mark") {
    return <DwowMark size={size} theme={theme} className={className} />;
  }

  // Ukuran XL (Standar Halaman Login & Splash Sesuai Spesifikasi Pengguna)
  if (size === "xl") {
    return (
      <div
        className={`inline-flex items-center justify-center mb-3 ${className}`}
        style={{ gap: "8px" }}
      >
        <div
          className="inline-flex items-center justify-center shrink-0"
          role="img"
          aria-label="D-WoW Logo Mark"
          style={{ width: "101px", height: "58px" }}
        >
          <img
            alt="D-WoW Dual-Circle Mark"
            width={101}
            height={58}
            className="h-full w-auto object-contain pointer-events-none select-none"
            loading="eager"
            src={imageSrc}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "0px",
          }}
        >
          <span
            className={`tracking-[-0.4px] leading-tight ${
              isWhite ? "text-white" : "text-neutral-900"
            }`}
            style={{
              fontSize: "28px",
              fontWeight: 900,
              fontFamily: "system-ui, -apple-system, sans-serif",
              lineHeight: "32px",
            }}
          >
            Platform
          </span>

          {showSubline && (
            <p
              className="tracking-normal"
              style={{
                marginTop: "0px",
                fontSize: "12px",
                fontWeight: 600,
                color: isWhite ? "rgba(255, 255, 255, 0.65)" : "var(--color-neutral-400, #9ca3af)",
              }}
            >
              Digital Way of Working
            </p>
          )}
        </div>
      </div>
    );
  }

  // Ukuran LG
  if (size === "lg") {
    return (
      <div className={`inline-flex items-center justify-center gap-2 ${className}`}>
        <div
          className="inline-flex items-center justify-center shrink-0"
          role="img"
          aria-label="D-WoW Logo Mark"
          style={{ width: "84px", height: "48px" }}
        >
          <img
            alt="D-WoW Dual-Circle Mark"
            width={84}
            height={48}
            className="h-full w-auto object-contain pointer-events-none select-none"
            loading="eager"
            src={imageSrc}
          />
        </div>
        <div className="flex flex-col items-start gap-0">
          <span
            className={`tracking-[-0.3px] ${
              isWhite ? "text-white" : "text-neutral-900"
            }`}
            style={{
              fontSize: "24px",
              fontWeight: 900,
              fontFamily: "system-ui, -apple-system, sans-serif",
              lineHeight: "28px",
            }}
          >
            Platform
          </span>
          {showSubline && (
            <p
              style={{
                marginTop: "0px",
                fontSize: "11px",
                fontWeight: 600,
                color: isWhite ? "rgba(255, 255, 255, 0.65)" : "#9ca3af",
              }}
            >
              Digital Way of Working
            </p>
          )}
        </div>
      </div>
    );
  }

  // Ukuran SM (Standar Navbar Header)
  if (size === "sm") {
    return (
      <div className={`inline-flex items-center justify-center gap-1.5 ${className}`}>
        <div
          className="inline-flex items-center justify-center shrink-0"
          role="img"
          aria-label="D-WoW Logo Mark"
          style={{ width: "45px", height: "26px" }}
        >
          <img
            alt="D-WoW Dual-Circle Mark"
            width={45}
            height={26}
            className="h-full w-auto object-contain pointer-events-none select-none"
            loading="eager"
            src={imageSrc}
          />
        </div>
        <div className="flex flex-col items-start gap-0">
          <span
            className={`tracking-[-0.2px] ${
              isWhite ? "text-white" : "text-neutral-900"
            }`}
            style={{
              fontSize: "16px",
              fontWeight: 900,
              fontFamily: "system-ui, -apple-system, sans-serif",
              lineHeight: "18px",
            }}
          >
            Platform
          </span>
          {showSubline && (
            <p
              style={{
                marginTop: "0px",
                fontSize: "9px",
                fontWeight: 600,
                color: isWhite ? "rgba(255, 255, 255, 0.65)" : "#9ca3af",
              }}
            >
              Digital Way of Working
            </p>
          )}
        </div>
      </div>
    );
  }

  // Ukuran MD (Default)
  return (
    <div className={`inline-flex items-center justify-center gap-2 ${className}`}>
      <div
        className="inline-flex items-center justify-center shrink-0"
        role="img"
        aria-label="D-WoW Logo Mark"
        style={{ width: "63px", height: "36px" }}
      >
        <img
          alt="D-WoW Dual-Circle Mark"
          width={63}
          height={36}
          className="h-full w-auto object-contain pointer-events-none select-none"
          loading="eager"
          src={imageSrc}
        />
      </div>
      <div className="flex flex-col items-start gap-0">
        <span
          className={`tracking-[-0.3px] ${
            isWhite ? "text-white" : "text-neutral-900"
          }`}
          style={{
            fontSize: "20px",
            fontWeight: 900,
            fontFamily: "system-ui, -apple-system, sans-serif",
            lineHeight: "22px",
          }}
        >
          Platform
        </span>
        {showSubline && (
          <p
            style={{
              marginTop: "0px",
              fontSize: "10px",
              fontWeight: 600,
              color: isWhite ? "rgba(255, 255, 255, 0.65)" : "#9ca3af",
            }}
          >
            Digital Way of Working
          </p>
        )}
      </div>
    </div>
  );
}

export default DwowLogo;
