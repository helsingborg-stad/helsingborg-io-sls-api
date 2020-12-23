import S3 from 'aws-sdk/clients/s3';

const s3Client = new S3();
const BucketName = process.env.BUCKET_NAME;

export const loadFileFromBucket = async (templateName: string) => {
  try {
    const file = await s3Client
      .getObject({
        Bucket: BucketName,
        Key: templateName,
      })
      .promise();
    return file.Body;
  } catch (error) {
    throw `S3 - ${error.code}:${error.message}`;
  }
};

export const writeFileToBucket = async (Key: string, data: Buffer) => {
  s3Client.putObject({ Bucket: BucketName, Key, Body: data }, err => {
    console.log(err);
  });
};
