import S3 from 'aws-sdk/clients/s3';

const s3Client = new S3();

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

/**
 * Use AWS SDK to create pre-signed POST data.
 * We also put a default file size limit (100B - 10MB).
 * @param bucketName
 * @param key
 * @param contentType
 * @param expireTime
 * @param fileMinSize
 * @param fileMaxSize
 * @returns {Promise<object>}
 */
function createPresignedPost({
  bucketName,
  key,
  contentType,
  expireTime,
  fileMinSize = 10,
  fileMaxSize = 10000000,
}) {
  const params = {
    Expires: expireTime,
    Bucket: bucketName,
    Conditions: [['content-length-range', fileMinSize, fileMaxSize]], // 100Byte - 10MB
    Fields: {
      'Content-Type': contentType,
      key,
    },
  };
  return new Promise((resolve, reject) => {
    s3Client.createPresignedPost(params, (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(data);
    });
  });
}

export default {
  getSignedUrl,
  createPresignedPost,
};
