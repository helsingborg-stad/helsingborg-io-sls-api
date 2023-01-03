import S3 from 'aws-sdk/clients/s3';

export const s3Client = new S3({ apiVersion: '2006-03-01' });

function getSignedUrl(bucketName, method, params) {
  return s3Client.getSignedUrl(method, {
    Bucket: bucketName,
    ...params,
  });
}

async function getFile(bucketName, key) {
  return s3Client
    .getObject({
      Bucket: bucketName,
      Key: key,
    })
    .promise();
}

async function deleteFile(bucketName, key) {
  return s3Client
    .deleteObject({
      Bucket: bucketName,
      Key: key,
    })
    .promise();
}

async function storeFile(bucketName, key, body) {
  return s3Client
    .putObject({
      Bucket: bucketName,
      Key: key,
      Body: body,
    })
    .promise();
}

async function deleteFiles(bucketName, keys) {
  return s3Client
    .deleteObjects({
      Bucket: bucketName,
      Delete: {
        Objects: keys,
      },
    })
    .promise();
}

async function copyFileWithinBucket(bucketName, sourceKey, targetKey) {
  return s3Client
    .copyObject({
      Bucket: bucketName,
      CopySource: `${bucketName}/${sourceKey}`,
      Key: targetKey,
    })
    .promise();
}

export default {
  getSignedUrl,
  getFile,
  deleteFile,
  deleteFiles,
  storeFile,
  copyFileWithinBucket,
};
