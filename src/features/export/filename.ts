export const MAX_FILENAME_BYTES = 240;
export function filenameStem(name: string) {
  return name.replace(/\.pdf$/i, "");
}
export function validateFilename(value: string): string {
  const stem = filenameStem(value.trim()).trim();
  if (!stem) throw new Error("Enter a filename.");
  if (/[<>:"/\\|?*]/.test(stem) || Array.from(stem).some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127))
    throw new Error('Avoid these characters: < > : " / \\ | ? * and control characters.');
  if (/\.$/.test(stem) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(stem))
    throw new Error("Choose a filename without a reserved name or trailing period.");
  if (new TextEncoder().encode(stem).length > MAX_FILENAME_BYTES)
    throw new Error("This filename is too long. Use a shorter name (up to 240 bytes).");
  return stem + ".pdf";
}
export function exportFilename(original: string, custom: string | null) {
  return custom ?? filenameStem(original) + "-signed.pdf";
}
