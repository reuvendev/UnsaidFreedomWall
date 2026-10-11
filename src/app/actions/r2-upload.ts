'use server';

import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, r2Bucket, r2PublicDomain } from '@/lib/r2';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';

export async function getPresignedUploadUrl(fileName: string, fileType: string) {
  try {
    if (!r2Bucket || !R2_ACCOUNT_ID) {
      throw new Error('R2 credentials or bucket details are missing in environment variables.');
    }

    // Generate a clean, unique object key
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const objectKey = `uploads/${Date.now()}-${sanitizedFileName}`;

    const command = new PutObjectCommand({
      Bucket: r2Bucket,
      Key: objectKey,
      ContentType: fileType,
    });

    // Create a presigned URL valid for 60 seconds
    const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 60 });

    // Format public URL (ensuring trailing slash formatting)
    const publicUrl = `${r2PublicDomain}/${objectKey}`;

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
