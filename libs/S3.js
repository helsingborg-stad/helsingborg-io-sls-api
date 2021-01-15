import S3 from 'aws-sdk/clients/s3';

export const s3Client = new S3();

/**
 * Use AWS SDK to create pre-signed upload url.
 * @param bucketName
 * @param method
 * @param params
 * @returns {string}
 */
async function getSignedUrl(bucketName, method, params) {
  return s3Client.getSignedUrl(method, {
    Bucket: bucketName,
    ...params,
  });
}

export default {
  getSignedUrl,
};
