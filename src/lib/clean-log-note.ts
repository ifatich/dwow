/**
 * Cleans an activity log note so it only displays readable human text,
 * stripping any raw image base64 data URLs while preserving human text and replacing with a clean image tag.
 */
export function cleanLogNote(note: string | null | undefined): string {
  if (!note) return "";
  return note
    // Replace markdown image ![alt](url) with clean [📷 alt] tag
    .replace(/!\[([\s\S]*?)\]\(([\s\S]*?)\)/g, (_, alt) => {
      const label = alt?.trim() || "Gambar Bukti";
      return `[📷 ${label}]`;
    })
    // Strip any raw or detached data:image/ string
    .replace(/\(data:image\/[^\)]+\)/g, "")
    .replace(/data:image\/[a-zA-Z0-9\/;+=,-]+/g, "")
    // Clean up excessive whitespace/newlines
    .replace(/\n\s*\n/g, "\n")
    .trim();
}
