import S3 from 'aws-sdk/clients/s3';

export const s3Client = new S3();

async function getSignedUrl(bucketName, method, params) {
  return s3Client.getSignedUrl(method, {
    Bucket: bucketName,
    ...params,
  });
}

async function getFiles(bucketName, prefix) {
  return s3Client
    .listObjectsV2({
      Bucket: bucketName,
      Prefix: prefix,
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

export default {
  getSignedUrl,
  getFiles,
  deleteFile,
};
