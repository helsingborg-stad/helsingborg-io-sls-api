import S3 from 'aws-sdk/clients/s3';

const s3Client = new S3();
const bucketName = process.env.BUCKET_NAME;

export const loadFileFromBucket = async (filename: string) => {
  try {
    const file = await s3Client
      .getObject({
        Bucket: bucketName,
        Key: filename,
      })
      .promise();
    return file.Body;
  } catch (error) {
    throw `S3 bucket: ${bucketName} (filename: ${filename}) - ${error.code}:${error.message}`;
  }
};

export const writeFileToBucket = async (Key: string, data: Buffer) => {
  s3Client.putObject({ Bucket: bucketName, Key, Body: data }, err => {
    console.log(err);
  });
};
