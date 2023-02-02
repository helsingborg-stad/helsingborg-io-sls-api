import { s3Client } from '../libs/S3';

export async function getHtmlContent(storageKey: string): Promise<string> {
  const result = await s3Client
    .getObject({
      Bucket: process.env.PDF_STORAGE_BUCKET_NAME,
      Key: storageKey,
    })
    .promise();

  return result.Body.toString() as string;
}
