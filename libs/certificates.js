import S3 from 'aws-sdk/clients/s3';

const s3Client = new S3({ apiVersion: '2006-03-01' });

export function read(bucket, key) {
  return s3Client
    .getObject({
      Bucket: bucket,
      Key: key,
    })
    .promise();
}
