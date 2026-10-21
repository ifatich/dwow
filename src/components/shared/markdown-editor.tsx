"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import MarkdownViewer from "./markdown-viewer";

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minRows?: number;
  autoFocus?: boolean;
  disabled?: boolean;
}

export interface ImageAttachment {
  id: string;
  alt: string;
  src: string;
  sizeKb?: number;
}

/**
 * Normalizes Markdown content:
 * - Fixes base64 data URLs that may have been split or wrapped with newlines/whitespace.
 * - Ensures image syntax !\[alt\](url) is properly structured.
 */
function normalizeMarkdown(raw: string): string {
  if (!raw) return "";
  return raw.replace(/!\[([\s\S]*?)\]\s*\(([\s\S]*?)\)/g, (_, alt, src) => {
    const trimmedSrc = src.trim();
    const cleanSrc = trimmedSrc.startsWith("data:")
      ? trimmedSrc.replace(/\s+/g, "")
      : trimmedSrc.replace(/^["'<]+|["'>]+$/g, "");
    return `![${alt.trim()}](${cleanSrc})`;
  });
}

/**
 * Compresses an image file/blob to a lightweight WebP data URL using client-side canvas.
 * Preserves aspect ratio with max dimension bounds (~1200x900) for crystal clear readable screenshots.
 */
async function compressImageToDataUrl(file: File | Blob): Promise<{ dataUrl: string; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const maxW = 1200;
          const maxH = 900;
          let w = img.width;
          let h = img.height;

          // Scale down proportionally if larger than max bounds
          if (w > maxW || h > maxH) {
            const ratio = Math.min(maxW / w, maxH / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }

          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Gagal menginisialisasi canvas context"));
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, w, h);

          let dataUrl = "";
          try {
            dataUrl = canvas.toDataURL("image/webp", 0.78);
            if (!dataUrl.startsWith("data:image/webp")) {
              dataUrl = canvas.toDataURL("image/jpeg", 0.78);
            }
          } catch {
            dataUrl = canvas.toDataURL("image/jpeg", 0.78);
          }

          // Clean any stray whitespace from dataUrl
          dataUrl = dataUrl.replace(/\s+/g, "");

          const sizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);
          resolve({ dataUrl, sizeKb });
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error("File gambar rusak atau tidak dapat dibaca"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Gagal membaca file gambar"));
    reader.readAsDataURL(file);
  });
}

/**
 * Parses markdown into clean human-readable text and separated visual image attachments.
 * Prevents scary base64 code strings from flooding the textarea.
 */
function parseMarkdownValue(markdown: string): { text: string; attachments: ImageAttachment[] } {
  if (!markdown) return { text: "", attachments: [] };

  const normalized = normalizeMarkdown(markdown);
  const imgRegex = /!\[([\s\S]*?)\]\(([\s\S]*?)\)/g;
  const attachments: ImageAttachment[] = [];
  let idx = 0;

  let match;
  while ((match = imgRegex.exec(normalized)) !== null) {
    const alt = match[1] || `Screenshot ${idx + 1}`;
    const src = match[2].trim().startsWith("data:") ? match[2].replace(/\s+/g, "") : match[2].trim();
    const approxKb = src.startsWith("data:") ? Math.round((src.length * 3) / 4 / 1024) : undefined;
    attachments.push({
      id: `img-${idx}-${src.slice(-16).replace(/[^a-zA-Z0-9]/g, "")}`,
      alt,
      src,
      sizeKb: approxKb,
    });
    idx++;
  }

  // Remove the image markdown tags from textarea text
  const cleanText = normalized.replace(imgRegex, "").trim();
  return { text: cleanText, attachments };
}

/**
 * Combines human-readable text and image attachments back into standard Markdown.
 */
function serializeMarkdown(text: string, attachments: ImageAttachment[]): string {
  const parts: string[] = [];
  const trimmed = text.trim();
  if (trimmed) {
    parts.push(trimmed);
  }

  attachments.forEach((att) => {
    const cleanSrc = att.src.trim().startsWith("data:") ? att.src.replace(/\s+/g, "") : att.src.trim();
    parts.push(`![${att.alt || "Screenshot Bukti"}](${cleanSrc})`);
  });

  return parts.join("\n\n");
}

/**
 * Modern Markdown Editor with:
 * 1. Immediate visual image preview cards (No base64 clutter in textarea)
 * 2. Visual Formatting Toolbar (Bold, Italic, Lists, Checklist, Link)
 * 3. Clipboard Screenshot Paste (Ctrl+V) & Drag-and-drop
 * 4. Dual Tab (Write / Full Preview) & Global Portaled Lightbox
 */
export default function MarkdownEditor({
  value,
  onChange,
  placeholder = "Tulis bukti pengerjaan, link PR, catatan, atau paste screenshot di sini...",
  minRows = 4,
  autoFocus = false,
  disabled = false,
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [lightboxImg, setLightboxImg] = useState<{ src: string; alt: string } | null>(null);
  const [lightboxError, setLightboxError] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLightboxError(false);
  }, [lightboxImg]);

  // Split value into clean text and image attachments
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const lastSerializedRef = useRef<string>("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with parent value prop (guaranteeing no cursor jumps when typing)
  useEffect(() => {
    if (value !== lastSerializedRef.current) {
      const parsed = parseMarkdownValue(value);
      setText(parsed.text);
      setAttachments(parsed.attachments);
      lastSerializedRef.current = value;
    }
  }, [value]);

  const showStatus = useCallback((msg: string, isError = false) => {
    setStatusMessage({ text: msg, isError });
    setTimeout(() => {
      setStatusMessage((prev) => (prev?.text === msg ? null : prev));
    }, 4000);
  }, []);

  /**
   * Updates parent with combined markdown
   */
  const emitChange = useCallback(
    (newText: string, newAttachments: ImageAttachment[]) => {
      const serialized = serializeMarkdown(newText, newAttachments);
      lastSerializedRef.current = serialized;
      onChange(serialized);
    },
    [onChange]
  );

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    emitChange(newText, attachments);
  };

  /**
   * Helper to insert or wrap text around current selection in the textarea.
   */
  const insertFormatting = useCallback(
    (prefix: string, suffix = "", defaultText = "") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = text.substring(start, end) || defaultText;

      const replacement = `${prefix}${selected}${suffix}`;
      const newText = text.substring(0, start) + replacement + text.substring(end);
      setText(newText);
      emitChange(newText, attachments);

      // Restore focus & cursor
      requestAnimationFrame(() => {
        textarea.focus();
        const newCursorPos = start + prefix.length + selected.length;
        textarea.setSelectionRange(
          selected === defaultText ? start + prefix.length : newCursorPos,
          selected === defaultText ? start + prefix.length + defaultText.length : newCursorPos
        );
      });
    },
    [text, attachments, emitChange]
  );

  /**
   * Helper to insert line-based formatting (bullet, numbered list, checklist)
   */
  const insertLinePrefix = useCallback(
    (prefix: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const beforeStart = text.substring(0, start);
      const lastNewline = beforeStart.lastIndexOf("\n");
      const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;

      const selected = text.substring(lineStart, end);
      const lines = selected.split("\n");
      const formattedLines = lines.map((line) => {
        if (line.startsWith(prefix)) return line;
        return `${prefix}${line}`;
      });

      const replacement = formattedLines.join("\n");
      const newText = text.substring(0, lineStart) + replacement + text.substring(end);
      setText(newText);
      emitChange(newText, attachments);

      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(lineStart + replacement.length, lineStart + replacement.length);
      });
    },
    [text, attachments, emitChange]
  );

  /**
   * Adds an image to attachments, automatically displaying visual preview card immediately
   */
  const addImageAttachment = useCallback(
    (dataUrl: string, label = "Screenshot Bukti", sizeKb?: number) => {
      const newAttachment: ImageAttachment = {
        id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        alt: label,
        src: dataUrl.replace(/\s+/g, ""),
        sizeKb,
      };

      const updated = [...attachments, newAttachment];
      setAttachments(updated);
      emitChange(text, updated);
      showStatus(`✅ Screenshot berhasil dilampirkan & langsung dipreview di bawah! (${sizeKb || 40} KB)`);
    },
    [attachments, text, emitChange, showStatus]
  );

  /**
   * Removes an attachment
   */
  const removeAttachment = useCallback(
    (id: string) => {
      const updated = attachments.filter((a) => a.id !== id);
      setAttachments(updated);
      emitChange(text, updated);
      showStatus("Gambar lampiran telah dihapus");
    },
    [attachments, text, emitChange, showStatus]
  );

  /**
   * Handle pasting images directly from clipboard (Cmd+V / Ctrl+V screenshot)
   */
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf("image") !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) return;

          try {
            setIsProcessingImage(true);
            const { dataUrl, sizeKb } = await compressImageToDataUrl(file);
            addImageAttachment(dataUrl, `Screenshot Bukti ${attachments.length + 1}`, sizeKb);
          } catch {
            showStatus("❌ Gagal memproses gambar dari clipboard", true);
          } finally {
            setIsProcessingImage(false);
          }
          return;
        }
      }
    },
    [addImageAttachment, attachments.length, showStatus]
  );

  /**
   * Handle Drag and Drop images onto textarea
   */
  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLTextAreaElement>) => {
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      if (file.type.startsWith("image/")) {
        e.preventDefault();
        try {
          setIsProcessingImage(true);
          const { dataUrl, sizeKb } = await compressImageToDataUrl(file);
          addImageAttachment(dataUrl, file.name.replace(/\.[^/.]+$/, "") || "Gambar Bukti", sizeKb);
        } catch {
          showStatus("❌ Gagal memproses file gambar", true);
        } finally {
          setIsProcessingImage(false);
        }
      }
    },
    [addImageAttachment, showStatus]
  );

  /**
   * Handle image upload from file picker button
   */
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        showStatus("❌ Hanya file gambar yang didukung (PNG, JPG, WebP, GIF)", true);
        e.target.value = "";
        return;
      }

      try {
        setIsProcessingImage(true);
        const { dataUrl, sizeKb } = await compressImageToDataUrl(file);
        addImageAttachment(dataUrl, file.name.replace(/\.[^/.]+$/, "") || "Gambar Bukti", sizeKb);
      } catch {
        showStatus("❌ Gagal memproses file gambar", true);
      } finally {
        setIsProcessingImage(false);
        e.target.value = "";
      }
    },
    [addImageAttachment, showStatus]
  );

  /**
   * Keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+K)
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
      if (e.key.toLowerCase() === "b") {
        e.preventDefault();
        insertFormatting("**", "**", "teks tebal");
      } else if (e.key.toLowerCase() === "i") {
        e.preventDefault();
        insertFormatting("*", "*", "teks miring");
      } else if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        insertFormatting("[", "](https://...)", "Judul Link");
      }
    }
  };

  const combinedMarkdown = serializeMarkdown(text, attachments);

  return (
    <div className="w-full rounded-lg border border-hairline bg-canvas shadow-2xs overflow-hidden transition-all focus-within:border-ink/40">
      {/* Hidden File Input for Image Attachment */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header Bar: Tabs (Write/Preview) & Status Toast */}
      <div className="flex items-center justify-between px-sm py-1.5 bg-surface-soft/60 border-b border-hairline">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("write")}
            className={`px-2.5 py-1 text-[12px] font-medium rounded transition-colors cursor-pointer ${
              activeTab === "write"
                ? "bg-canvas text-ink shadow-2xs font-semibold"
                : "text-ink/60 hover:text-ink hover:bg-canvas/50"
            }`}
          >
            Tulis Catatan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preview")}
            className={`px-2.5 py-1 text-[12px] font-medium rounded transition-colors cursor-pointer flex items-center gap-1 ${
              activeTab === "preview"
                ? "bg-canvas text-ink shadow-2xs font-semibold"
                : "text-ink/60 hover:text-ink hover:bg-canvas/50"
            }`}
          >
            <span>Preview Lengkap</span>
            {attachments.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                {attachments.length}
              </span>
            )}
          </button>
        </div>

        {/* Status notification / Spinner */}
        <div className="flex items-center text-[11px] font-medium">
          {isProcessingImage ? (
            <span className="text-amber-600 flex items-center gap-1.5 animate-pulse">
              <svg className="animate-spin h-3 w-3 text-amber-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Mengompres & memuat gambar...
            </span>
          ) : statusMessage ? (
            <span className={statusMessage.isError ? "text-red-500" : "text-emerald-600"}>
              {statusMessage.text}
            </span>
          ) : (
            <span className="text-ink/40 hidden sm:inline flex items-center gap-1">
              <span>Bisa paste</span>
              <kbd className="px-1 py-0.5 bg-canvas rounded border border-hairline text-[10px] font-mono">Ctrl+V</kbd>
              <span>screenshot</span>
            </span>
          )}
        </div>
      </div>

      {/* Action Toolbar (Visible in Write Mode) */}
      {activeTab === "write" && (
        <div className="flex flex-wrap items-center gap-0.5 px-xs py-1 bg-canvas border-b border-hairline-soft text-ink/70">
          {/* Bold */}
          <button
            type="button"
            onClick={() => insertFormatting("**", "**", "teks tebal")}
            disabled={disabled}
            title="Tebal (Ctrl+B)"
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-soft hover:text-ink transition-colors cursor-pointer text-[13px] font-bold"
          >
            B
          </button>

          {/* Italic */}
          <button
            type="button"
            onClick={() => insertFormatting("*", "*", "teks miring")}
            disabled={disabled}
            title="Miring (Ctrl+I)"
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-soft hover:text-ink transition-colors cursor-pointer text-[13px] italic font-serif"
          >
            I
          </button>

          <div className="w-[1px] h-4 bg-hairline mx-1" />

          {/* Bullet List */}
          <button
            type="button"
            onClick={() => insertLinePrefix("- ")}
            disabled={disabled}
            title="Daftar Poin (- item)"
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-soft hover:text-ink transition-colors cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="2.5" cy="4" r="1.5" />
              <rect x="6" y="3" width="9" height="2" rx="1" />
              <circle cx="2.5" cy="8" r="1.5" />
              <rect x="6" y="7" width="9" height="2" rx="1" />
              <circle cx="2.5" cy="12" r="1.5" />
              <rect x="6" y="11" width="9" height="2" rx="1" />
            </svg>
          </button>

          {/* Numbered List */}
          <button
            type="button"
            onClick={() => insertLinePrefix("1. ")}
            disabled={disabled}
            title="Daftar Berurutan (1. item)"
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-soft hover:text-ink transition-colors cursor-pointer text-[11px] font-mono font-bold"
          >
            1.
          </button>

          {/* Checklist */}
          <button
            type="button"
            onClick={() => insertLinePrefix("- [ ] ")}
            disabled={disabled}
            title="Daftar Checklist (- [ ] task)"
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-soft hover:text-ink transition-colors cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
              <rect x="2" y="2" width="12" height="12" rx="2" />
              <path d="M5 8l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="w-[1px] h-4 bg-hairline mx-1" />

          {/* Link */}
          <button
            type="button"
            onClick={() => insertFormatting("[", "](https://...)", "Judul Link")}
            disabled={disabled}
            title="Sisipkan Link (Ctrl+K)"
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-soft hover:text-ink transition-colors cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <path d="M6.5 9.5a3.5 3.5 0 005 0l2-2a3.5 3.5 0 00-5-5l-1 1" />
              <path d="M9.5 6.5a3.5 3.5 0 00-5 0l-2 2a3.5 3.5 0 005 5l1-1" />
            </svg>
          </button>

          {/* Image Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isProcessingImage}
            title="Upload atau Lampirkan Gambar / Screenshot"
            className="px-2 h-7 flex items-center gap-1.5 rounded bg-surface-soft/80 hover:bg-surface-soft hover:text-ink transition-colors cursor-pointer text-[12px] font-medium border border-hairline-soft"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
              <rect x="2" y="2" width="12" height="12" rx="2" />
              <circle cx="5.5" cy="5.5" r="1.5" />
              <path d="M14 11l-3.5-3.5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[11px] font-medium">Tambah Gambar</span>
          </button>

          {/* Code */}
          <button
            type="button"
            onClick={() => insertFormatting("`", "`", "kode")}
            disabled={disabled}
            title="Format Kode (`code`)"
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-soft hover:text-ink transition-colors cursor-pointer text-[12px] font-mono"
          >
            &lt;&gt;
          </button>
        </div>
      )}

      {/* Editor Content Area */}
      <div className="relative">
        {activeTab === "write" ? (
          <div>
            {/* Clean Textarea without Base64 clutter */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onPaste={handlePaste}
              onDrop={handleDrop}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={minRows}
              disabled={disabled}
              autoFocus={autoFocus}
              className="w-full px-md py-sm bg-canvas text-[13px] font-[450] text-ink placeholder:text-ink/30 focus:outline-none transition-colors resize-y leading-relaxed font-sans"
            />

            {/* INSTANT VISUAL IMAGE PREVIEW (Shows immediately without clicking preview tab!) */}
            {attachments.length > 0 && (
              <div className="p-sm bg-surface-soft/40 border-t border-hairline-soft">
                <div className="flex items-center justify-between mb-xs">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink/60 font-semibold flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="2" y="2" width="12" height="12" rx="2" />
                      <circle cx="5.5" cy="5.5" r="1.5" />
                      <path d="M14 11l-3.5-3.5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Bukti Gambar Terlampir ({attachments.length})
                  </span>
                  <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                    ✓ Preview Aktif
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {attachments.map((att, idx) => (
                    <div
                      key={att.id || idx}
                      className="group relative flex items-center gap-2.5 p-2 rounded-lg bg-canvas border border-hairline hover:border-amber-400 transition-all shadow-2xs"
                    >
                      {/* Clickable Image Thumbnail */}
                      <button
                        type="button"
                        onClick={() => setLightboxImg({ src: att.src, alt: att.alt })}
                        className="relative w-14 h-14 rounded-md overflow-hidden bg-surface-soft border border-hairline shrink-0 cursor-zoom-in block text-left"
                        title="Klik untuk memperbesar gambar"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={att.src}
                          alt={att.alt}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[11px] font-bold">
                          🔍
                        </div>
                      </button>

                      {/* Info & Caption */}
                      <div className="flex-1 min-w-0 pr-6">
                        <p className="text-[12px] font-medium text-ink truncate" title={att.alt}>
                          {att.alt}
                        </p>
                        <p className="text-[10px] text-ink/45 font-mono mt-0.5">
                          {att.sizeKb ? `WebP • ~${att.sizeKb} KB` : "WebP Terkompresi"}
                        </p>
                        <button
                          type="button"
                          onClick={() => setLightboxImg({ src: att.src, alt: att.alt })}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-0.5 mt-0.5 cursor-pointer"
                        >
                          Perbesar Gambar ↗
                        </button>
                      </div>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => removeAttachment(att.id)}
                        title="Hapus gambar ini"
                        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-md bg-surface-soft hover:bg-red-50 text-ink/40 hover:text-red-600 transition-colors cursor-pointer"
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full min-h-[160px] max-h-[360px] overflow-y-auto px-md py-sm bg-surface-soft/20 text-[13px] border-t border-hairline-soft">
            <MarkdownViewer content={combinedMarkdown} />
          </div>
        )}
      </div>

      {/* Footer Helper Note */}
      <div className="px-md py-1.5 bg-surface-soft/40 border-t border-hairline-soft flex items-center justify-between text-[11px] text-ink/40">
        <span className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
            <circle cx="8" cy="8" r="7" />
            <path d="M8 5v3M8 11v.5" strokeLinecap="round" />
          </svg>
          Screenshot langsung muncul sebagai preview kartu di bawah teks.
        </span>
        <span className="font-mono text-[10px]">
          {attachments.length > 0 ? `${attachments.length} gambar terlampir` : "Belum ada gambar"}
        </span>
      </div>

      {/* Full Screen Lightbox Modal rendered via Global Portal */}
      {mounted && lightboxImg && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setLightboxImg(null)}
        >
          <div
            className="relative max-w-[94vw] max-h-[94vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxError ? (
              <div className="p-xl bg-canvas rounded-xl text-center max-w-sm">
                <p className="text-[14px] font-semibold text-red-600 mb-xs">⚠️ Gagal Memuat Gambar</p>
                <p className="text-[12px] text-ink/60 mb-md">Format data gambar tidak valid atau rusak.</p>
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
                onError={() => setLightboxError(true)}
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
    </div>
  );
}
