/**
 * Helper to normalize image URLs, specifically handling Google Drive share links
 * and transforming them into direct renderable image links.
 */
export function formatImageUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();

  // Check if it's a Google Drive URL
  if (trimmed.includes('drive.google.com')) {
    // Matches /file/d/FILE_ID/ or id=FILE_ID
    const fileIdMatch =
      trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);

    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1];
      // Google Drive thumbnail endpoint works reliably for embedding
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
    }
  }

  return trimmed;
}
