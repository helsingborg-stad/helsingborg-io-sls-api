import AWS from 'aws-sdk';

const S3 = new AWS.S3();

export const read = async (Bucket, Key) => {
         try {
           const file = await S3.getObject({
             Bucket,
             Key
           }).promise();
           return file;
         } catch (error) {
           throw `S3 - ${error.code}:${error.message}`;
         }
       };
