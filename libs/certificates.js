import S3 from 'aws-sdk/clients/s3';

const s3Client = new S3({ apiVersion: '2006-03-01' });

export function read(Bucket, Key) {
  try {
    return s3Client
      .getObject({
        Bucket,
        Key,
      })
      .promise();
  } catch (error) {
    throw `S3 - ${error.code}:${error.message}`;
  }
}
