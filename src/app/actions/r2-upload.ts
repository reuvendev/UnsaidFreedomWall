'use server';

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || '';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export async function getPresignedUploadUrl(fileName: string, fileType: string) {
  try {
    if (!R2_BUCKET_NAME || !R2_ACCOUNT_ID) {
      throw new Error('R2 credentials or bucket details are missing in environment variables.');
    }

    // Generate a clean, unique object key
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const objectKey = `uploads/${Date.now()}-${sanitizedFileName}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: objectKey,
      ContentType: fileType,
    });

    // Create a presigned URL valid for 60 seconds
    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 60 });

    // Format public URL (ensuring trailing slash formatting)
    const baseUrl = R2_PUBLIC_DOMAIN.endsWith('/')
      ? R2_PUBLIC_DOMAIN.slice(0, -1)
      : R2_PUBLIC_DOMAIN;
    const publicUrl = `${baseUrl}/${objectKey}`;

    return {
      success: true,
      signedUrl,
      publicUrl,
    };
  } catch (error: any) {
    console.error('Error generating presigned URL:', error);
    return {
      success: false,
      error: error.message || 'Failed to authorize image upload.',
    };
  }
}