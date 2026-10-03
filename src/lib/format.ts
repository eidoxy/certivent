// Client-safe date helpers. Display is in the browser's time zone (00 sec 7).
import { format, isSameDay } from "date-fns";

/** "Sat, 11 Oct 2026 · 09:00" */
export function formatDateTime(iso: string): string {
  return format(new Date(iso), "EEE, d MMM yyyy · HH:mm");
}

/** "11 Oct 2026" (date only, e.g. certificate issue dates). */
export function formatDate(iso: string): string {
  return format(new Date(iso), "d MMM yyyy");
}

/**
 * Same-day events collapse to one line ("Sat, 11 Oct 2026 · 09:00 - 12:00"); multi-day events
 * return two lines, each a full date and time.
 */
export function formatDateRange(startIso: string, endIso: string): string[] {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (isSameDay(start, end)) {
    return [`${format(start, "EEE, d MMM yyyy")} · ${format(start, "HH:mm")} - ${format(end, "HH:mm")}`];
  }
  return [formatDateTime(startIso), `to ${formatDateTime(endIso)}`];
}


/** Plain-text file size: "512 B", "48.3 KB", "1.2 MB". */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (Math.round(kb * 10) / 10 < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
