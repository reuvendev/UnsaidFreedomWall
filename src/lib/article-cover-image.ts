import sharp from 'sharp';

export const MAX_ARTICLE_COVER_BYTES = 600_000;

export class InvalidArticleCover extends Error {}

export async function optimizeArticleCover(bytes: Buffer): Promise<Buffer> {
  if (bytes.length < 32 || bytes.length > MAX_ARTICLE_COVER_BYTES) {
    throw new InvalidArticleCover('Upload a compressed WebP cover smaller than 600 KB.');
  }
  try {
    const source = sharp(bytes, { failOn: 'error', limitInputPixels: 30_000_000 });
    const metadata = await source.metadata();
    if (metadata.format !== 'webp' || !metadata.width || !metadata.height || metadata.width > 1600 || metadata.height > 1600) {
      throw new InvalidArticleCover('Invalid WebP image or dimensions. Choose another photo.');
    }
    // Decoding and re-encoding verifies the image and strips EXIF/other metadata.
    const optimized = await source.rotate().webp({ quality: 80, effort: 4 }).toBuffer();
    if (optimized.length > MAX_ARTICLE_COVER_BYTES) {
      throw new InvalidArticleCover('Image remains too large after optimization. Choose a smaller photo.');
    }
    return optimized;
  } catch (error) {
    if (error instanceof InvalidArticleCover) throw error;
    throw new InvalidArticleCover('Could not decode the WebP image. Choose another photo.');
  }
}
