/**
 * Helper to normalize image URLs, specifically handling Google Drive share links
 * and transforming them into direct renderable image links.
 */
export function extractGoogleDriveFileId(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (
    trimmed.includes('drive.google.com') ||
    trimmed.includes('docs.google.com') ||
    trimmed.includes('googleusercontent.com')
  ) {
    const fileIdMatch =
      trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return fileIdMatch[1];
    }
  }
  return null;
}

export function formatImageUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();

  // Check if it's a Google Drive URL
  const fileId = extractGoogleDriveFileId(trimmed);
  if (fileId) {
    // Google Drive thumbnail endpoint works reliably for embedding
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
  }

  return trimmed;
}

export function getGoogleDriveDirectUrls(url?: string | null): {
  thumbnail: string;
  direct: string;
  original: string;
} | null {
  const fileId = extractGoogleDriveFileId(url);
  if (!fileId) return null;
  return {
    thumbnail: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`,
    direct: `https://lh3.googleusercontent.com/d/${fileId}`,
    original: `https://drive.google.com/file/d/${fileId}/view`,
  };
}

