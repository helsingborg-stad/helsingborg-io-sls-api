import uuid from 'uuid';
import storageService from '../libs/S3';

export async function savePdf(data: Buffer): Promise<string> {
  const id = uuid.v4();
  const pdfBucketKey = `pdf/${id}.pdf`;
  await storageService.storeFile(process.env.PDF_STORAGE_BUCKET_NAME, pdfBucketKey, data);
  return pdfBucketKey;
}
