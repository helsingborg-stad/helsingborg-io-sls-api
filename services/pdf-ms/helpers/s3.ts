import { s3Client } from '../../../libs/S3';

const bucketName = process.env.BUCKET_NAME;

export async function loadFileFromBucket(Key: string) {
  try {
    const s3File = await s3Client
      .getObject({
        Bucket: bucketName,
        Key,
      })
      .promise();

    return s3File.Body;
  } catch (s3ClientGetError) {
    throw new Error(`S3 - ${s3ClientGetError.code}: ${s3ClientGetError.message}`);
  }
}

export async function writeFileToBucket(Key: string, Body: Buffer) {
  try {
    const s3PutFileResult = await s3Client
      .putObject({
        Bucket: bucketName,
        Key,
        Body,
      })
      .promise();
    return s3PutFileResult;
  } catch (s3ClientPutError) {
    throw new Error(`S3 - ${s3ClientPutError.code}: ${s3ClientPutError.message}`);
  }
}
