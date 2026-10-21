"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface MarkdownViewerProps {
  content: string;
  className?: string;
  compact?: boolean;
}

/**
 * Normalizes Markdown content:
 * - Fixes base64 data URLs that may have been split or wrapped with newlines/whitespace.
 * - Ensures image syntax !\[alt\](url) is properly structured.
 */
function normalizeMarkdown(raw: string): string {
  if (!raw) return "";

  // Normalize image markdown across potential newlines and remove whitespace from data URLs
  return raw.replace(/!\[([\s\S]*?)\]\s*\(([\s\S]*?)\)/g, (_, alt, src) => {
    const trimmedSrc = src.trim();
    const cleanSrc = trimmedSrc.startsWith("data:")
      ? trimmedSrc.replace(/\s+/g, "")
      : trimmedSrc.replace(/^["'<]+|["'>]+$/g, "");
    return `![${alt.trim()}](${cleanSrc})`;
  });
}

/**
 * Sanitizes URL to prevent XSS (only allows safe protocols: http, https, mailto, data:image)
 */
function sanitizeUrl(url: string): string {
  if (!url) return "#";
  const cleaned = url.trim().replace(/^["'<]+|["'>]+$/g, "").trim();
  if (/^(https?:\/\/|mailto:|data:image\/)/i.test(cleaned)) {
    return cleaned;
  }
  return "#";
}

/**
 * Renders inline formatting: bold, italic, code, strikethrough, links, and raw URLs.
 */
function renderInlineContent(text: string, onImageClick?: (src: string, alt: string) => void): React.ReactNode {
  const pattern = /(!?\[.*?\]\(.*?\)|\`.*?\`|\*\*.*?\*\*|\*.*?\*|~~.*?~~|https?:\/\/[^\s<]+)/g;
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    if (!part) return null;

    // Image: ![alt](src)
    const imgMatch = part.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      const alt = imgMatch[1] || "Bukti gambar";
      const src = sanitizeUrl(imgMatch[2]);
      return (
        <span key={index} className="inline-block my-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onClick={(e) => {
              e.stopPropagation();
              onImageClick?.(src, alt);
            }}
            className="max-h-[240px] max-w-full rounded-lg border border-hairline object-contain cursor-zoom-in hover:opacity-95 hover:shadow-md transition-all shadow-xs bg-canvas"
          />
        </span>
      );
    }

    // Link: [label](url)
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      const label = linkMatch[1];
      const url = sanitizeUrl(linkMatch[2]);
      return (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-0.5 font-medium break-all"
        >
          <span>{label}</span>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="inline shrink-0">
            <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4.5M9.5 2.5V7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      );
    }

    // Inline Code: `code`
    const codeMatch = part.match(/^\`(.*?)\`$/);
    if (codeMatch) {
      return (
        <code key={index} className="px-1.5 py-0.5 rounded bg-surface-soft text-[12px] font-mono text-ink/90 border border-hairline">
          {codeMatch[1]}
        </code>
      );
    }

    // Bold: **text**
    const boldMatch = part.match(/^\*\*(.*?)\*\*$/);
    if (boldMatch) {
      return (
        <strong key={index} className="font-semibold text-ink">
          {boldMatch[1]}
        </strong>
      );
    }

    // Italic: *text*
    const italicMatch = part.match(/^\*(.*?)\*$/);
    if (italicMatch) {
      return (
        <em key={index} className="italic text-ink/90">
          {italicMatch[1]}
        </em>
      );
    }

    // Strikethrough: ~~text~~
    const strikeMatch = part.match(/^~~(.*?)~~$/);
    if (strikeMatch) {
      return (
        <del key={index} className="line-through text-ink/50">
          {strikeMatch[1]}
        </del>
      );
    }

    // Auto-link: https://...
    if (/^https?:\/\//i.test(part)) {
      const safe = sanitizeUrl(part);
      return (
        <a
          key={index}
          href={safe}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-0.5 font-medium break-all"
        >
          <span>{part}</span>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="inline shrink-0">
            <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4.5M9.5 2.5V7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

/**
 * Modern, Lightweight & Safe Markdown Viewer
 * - Uses React Portal for Lightbox Modal to avoid CSS transform clipping from cards/dialogs
 * - Supports compact mode for Kanban card display
 */
export default function MarkdownViewer({ content, className = "", compact = false }: MarkdownViewerProps) {
  const [lightboxImg, setLightboxImg] = useState<{ src: string; alt: string } | null>(null);
  const [imgLoadError, setImgLoadError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset error state when lightbox image changes
  useEffect(() => {
    setImgLoadError(false);
  }, [lightboxImg]);

  if (!content || !content.trim()) {
    return <span className="text-ink/40 italic text-[13px]">(Tidak ada catatan evidence)</span>;
  }

  const normalized = normalizeMarkdown(content.trim());

  // Compact mode for Kanban card
  if (compact) {
    const imgMatches = Array.from(normalized.matchAll(/!\[(.*?)\]\((.*?)\)/g));
    const cleanText = normalized
      .replace(/!\[(.*?)\]\((.*?)\)/g, "")
      .replace(/[#*`_~]/g, "")
      .replace(/\n+/g, " ")
      .trim();

    return (
      <>
        <div className={`text-[12px] leading-relaxed text-ink/80 ${className}`}>
          {imgMatches.length > 0 && (
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              {imgMatches.map((match, idx) => {
                const alt = match[1] || `Screenshot ${idx + 1}`;
                const src = sanitizeUrl(match[2]);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxImg({ src, alt });
                    }}
                    title={`Klik untuk memperbesar ${alt}`}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-300 text-amber-900 text-[11px] font-medium transition-colors cursor-pointer shadow-2xs"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={alt}
                      className="w-4 h-4 object-cover rounded border border-amber-400/50 shrink-0"
                    />
                    <span className="truncate max-w-[130px]">{alt}</span>
                    <span className="text-[10px] text-amber-700 font-mono font-bold">🔍</span>
                  </button>
                );
              })}
            </div>
          )}
          {cleanText && <span>{renderInlineContent(cleanText)}</span>}
        </div>

        {/* Global Portaled Lightbox for Compact Mode */}
        {mounted && lightboxImg && createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxImg(null);
            }}
          >
            <div
              className="relative max-w-[94vw] max-h-[94vh] flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {imgLoadError ? (
                <div className="p-xl bg-canvas rounded-xl text-center max-w-sm">
                  <p className="text-[14px] font-semibold text-red-600 mb-xs">⚠️ Gagal Memuat Gambar</p>
                  <p className="text-[12px] text-ink/60 mb-md">Format data URL gambar tidak lengkap atau rusak.</p>
                  <button
                    type="button"
                    onClick={() => setLightboxImg(null)}
                    className="px-lg py-1.5 rounded-lg bg-surface-soft text-ink text-[12px] font-medium"
                  >
                    Tutup
                  </button>
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={lightboxImg.src}
                  alt={lightboxImg.alt}
                  onError={() => setImgLoadError(true)}
                  className="max-w-full max-h-[82vh] rounded-lg shadow-2xl object-contain border border-white/15 bg-black/40"
                />
              )}

              <div className="mt-3 flex items-center justify-between w-full px-2 text-white/90 text-[13px] bg-black/60 py-2 rounded-lg backdrop-blur-xs">
                <span className="truncate max-w-[60%] font-medium">{lightboxImg.alt}</span>
                <div className="flex items-center gap-2">
                  <a
                    href={lightboxImg.src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 rounded-md bg-white/15 hover:bg-white/25 text-white text-[12px] font-medium transition-colors"
                  >
                    Buka Tab Baru ↗
                  </a>
                  <button
                    type="button"
                    onClick={() => setLightboxImg(null)}
                    className="px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white text-[12px] font-semibold transition-colors cursor-pointer"
                  >
                    Tutup ✕
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  // Parse lines for full view
  const lines = normalized.split("\n");
  const nodes: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle code blocks (```)
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        nodes.push(
          <pre
            key={`code-${i}`}
            className="my-2 p-3 rounded-lg bg-surface-soft border border-hairline overflow-x-auto text-[12px] font-mono text-ink/90 leading-normal"
          >
            <code>{codeBlockLines.join("\n")}</code>
          </pre>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    const trimmedLine = line.trim();

    if (!trimmedLine) {
      nodes.push(<div key={`empty-${i}`} className="h-2" />);
      continue;
    }

    // Headings
    if (trimmedLine.startsWith("### ")) {
      nodes.push(
        <h4 key={`h4-${i}`} className="text-[14px] font-semibold text-ink mt-3 mb-1">
          {renderInlineContent(trimmedLine.slice(4))}
        </h4>
      );
      continue;
    }
    if (trimmedLine.startsWith("## ")) {
      nodes.push(
        <h3 key={`h3-${i}`} className="text-[15px] font-semibold text-ink mt-3 mb-1">
          {renderInlineContent(trimmedLine.slice(3))}
        </h3>
      );
      continue;
    }
    if (trimmedLine.startsWith("# ")) {
      nodes.push(
        <h2 key={`h2-${i}`} className="text-[16px] font-bold text-ink mt-3 mb-1">
          {renderInlineContent(trimmedLine.slice(2))}
        </h2>
      );
      continue;
    }

    // Checklist / Task list: - [ ] or - [x]
    const checklistMatch = trimmedLine.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (checklistMatch) {
      const isChecked = checklistMatch[1].toLowerCase() === "x";
      const itemText = checklistMatch[2];
      nodes.push(
        <div key={`check-${i}`} className="flex items-start gap-2 my-1 text-[13px]">
          <span
            className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
              isChecked
                ? "bg-emerald-600 border-emerald-600 text-white"
                : "border-hairline bg-surface-soft text-transparent"
            }`}
          >
            {isChecked && (
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span className={`leading-relaxed ${isChecked ? "line-through text-ink/50" : "text-ink/80"}`}>
            {renderInlineContent(itemText, (src, alt) => setLightboxImg({ src, alt }))}
          </span>
        </div>
      );
      continue;
    }

    // Bullet List
    const bulletMatch = trimmedLine.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      nodes.push(
        <div key={`bullet-${i}`} className="flex items-start gap-2 my-0.5 text-[13px] text-ink/80">
          <span className="w-1.5 h-1.5 rounded-full bg-ink/60 mt-2 shrink-0" />
          <span className="leading-relaxed">
            {renderInlineContent(bulletMatch[1], (src, alt) => setLightboxImg({ src, alt }))}
          </span>
        </div>
      );
      continue;
    }

    // Numbered list
    const numMatch = trimmedLine.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      nodes.push(
        <div key={`num-${i}`} className="flex items-start gap-2 my-0.5 text-[13px] text-ink/80">
          <span className="font-mono text-[11px] text-ink/50 mt-0.5 shrink-0 min-w-[16px] text-right">
            {numMatch[1]}.
          </span>
          <span className="leading-relaxed">
            {renderInlineContent(numMatch[2], (src, alt) => setLightboxImg({ src, alt }))}
          </span>
        </div>
      );
      continue;
    }

    // Blockquote
    if (trimmedLine.startsWith("> ")) {
      nodes.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-3 border-ink/20 pl-3 my-2 text-[13px] italic text-ink/70"
        >
          {renderInlineContent(trimmedLine.slice(2), (src, alt) => setLightboxImg({ src, alt }))}
        </blockquote>
      );
      continue;
    }

    // Standard paragraph line
    nodes.push(
      <p key={`p-${i}`} className="my-1 text-[13px] leading-relaxed text-ink/85 break-words">
        {renderInlineContent(line, (src, alt) => setLightboxImg({ src, alt }))}
      </p>
    );
  }

  return (
    <>
      <div className={`space-y-0.5 ${className}`}>
        {nodes}
      </div>

      {/* Global Portaled Lightbox for Full View */}
      {mounted && lightboxImg && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={(e) => {
            e.stopPropagation();
            setLightboxImg(null);
          }}
        >
          <div
            className="relative max-w-[94vw] max-h-[94vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {imgLoadError ? (
              <div className="p-xl bg-canvas rounded-xl text-center max-w-sm">
                <p className="text-[14px] font-semibold text-red-600 mb-xs">⚠️ Gagal Memuat Gambar</p>
                <p className="text-[12px] text-ink/60 mb-md">Format data URL gambar tidak lengkap atau rusak.</p>
                <button
                  type="button"
                  onClick={() => setLightboxImg(null)}
                  className="px-lg py-1.5 rounded-lg bg-surface-soft text-ink text-[12px] font-medium cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={lightboxImg.src}
                alt={lightboxImg.alt}
                onError={() => setImgLoadError(true)}
                className="max-w-full max-h-[82vh] rounded-lg shadow-2xl object-contain border border-white/15 bg-black/40"
              />
            )}

            <div className="mt-3 flex items-center justify-between w-full px-2 text-white/90 text-[13px] bg-black/60 py-2 rounded-lg backdrop-blur-xs">
              <span className="truncate max-w-[60%] font-medium">{lightboxImg.alt}</span>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxImg.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded-md bg-white/15 hover:bg-white/25 text-white text-[12px] font-medium transition-colors"
                >
                  Buka Tab Baru ↗
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxImg(null)}
                  className="px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white text-[12px] font-semibold transition-colors cursor-pointer"
                >
                  Tutup ✕
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
