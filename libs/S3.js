import AWS from 'aws-sdk';

const s3Client = new AWS.S3();

async function getSignedUrl(bucket, method, params) {
  return s3Client.getSignedUrl(method, {
    Bucket: bucket,
    ...params,
  });
}

const S3 = {
  getSignedUrl,
};

export default S3;
