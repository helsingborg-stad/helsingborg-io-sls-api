/* eslint-disable no-console */
import to from 'await-to-js';
import { throwError, BadRequestError } from '@helsingborg-stad/npm-api-error-handling';
import S3 from '../../../libs/S3';
import * as response from '../../../libs/response';
import { decodeToken } from '../../../libs/token';
import log from '../../../libs/logs';

const BUCKET_NAME = process.env.BUCKET_NAME;

export async function main(event, context) {
    const { filename } = event.pathParameters;
    if (!filename) {
        return response.failure(new BadRequestError('Missing filename in path query string'));
    }

    const decodedToken = decodeToken(event);
    const { personalNumber } = decodedToken;

    const [getFilesError, userS3Files] = await to(getFilesFromUserS3Bucket(personalNumber));
    if (getFilesError) {
        log.error('Get files error', context.awsRequestId, 'service-users-api-deleteAttachment-001', getFilesError);

        return response.failure(getFilesError);
    }

    const fileKey = `${personalNumber}/${filename}`;

    const [findFileError] = await to(findFile(userS3Files, fileKey));
    if (findFileError) {
        log.error('Find file error', context.awsRequestId, 'service-users-api-deleteAttachment-002', findFileError);

        return response.failure(findFileError);
    }

    const [deleteFileError] = await to(deleteFile(fileKey));
    if (deleteFileError) {
        log.error('Delete file error', context.awsRequestId, 'service-users-api-deleteAttachment-003', deleteFileError);

        return response.failure(deleteFileError);
    }

    return response.success(200, {
        type: 'userAttachment',
    });
}

async function getFilesFromUserS3Bucket(personalNumber) {
    const [getFilesError, s3Files] = await to(S3.getFiles(BUCKET_NAME, `${personalNumber}/`));
    if (getFilesError) {
        throwError(getFilesError.statusCode, getFilesError.message);
    }

    return s3Files;
}

async function deleteFile(fileKey) {
    const [deleteFileError] = await to(S3.deleteFile(BUCKET_NAME, fileKey));
    if (deleteFileError) {
        throwError(deleteFileError.statusCode, deleteFileError.message);
    }

    return true;
}

async function findFile(s3Files, fileKey) {
    const fileKeyExists = s3Files.Contents.find((file) => file?.Key === fileKey);
    if (!fileKeyExists) {
        throwError(404, `No file with key '${fileKey}' found`);
    }

    return true;
}
