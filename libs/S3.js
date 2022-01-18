import S3 from 'aws-sdk/clients/s3';

export const s3Client = new S3({ apiVersion: '2006-03-01' });

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

export default {
    getSignedUrl,
    getFiles,
    getFile,
    deleteFile,
    storeFile,
};
