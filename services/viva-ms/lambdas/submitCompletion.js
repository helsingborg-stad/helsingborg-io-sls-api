/* eslint-disable no-console */
import AWS from 'aws-sdk';
import S3 from '../../../libs/S3';
import { to } from 'await-to-js';
import params from '../../../libs/params';
import config from '../../../config';
import * as request from '../../../libs/request';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';
import hash from '../../../libs/helperHashEncode';

const VIVA_CASE_SSM_PARAMS = params.read(config.cases.providers.viva.envsKeyName);
const VADA_SSM_PARAMS = params.read(config.vada.envsKeyName);

export async function main(event) {
  const vivaCaseSsmParams = await VIVA_CASE_SSM_PARAMS;
  const caseItem = parseDynamoDBItemFromEvent(event);

  if (caseItem.currentFormId !== vivaCaseSsmParams.completionFormId) {
    console.info('(viva-ms: submitApplication): currentFormId does not match completionFormId');
    return false;
  }

  const personalNumber = caseItem.PK.substr(5);

  const caseAnswers = caseItem.forms[caseItem.currentFormId].answers;

  const [attachmentListError, attachmentList] = await to(
    answersToAttachmentList(personalNumber, caseAnswers)
  );
  if (attachmentListError) {
    throw attachmentListError;
  }

  // send attachments to viva.
  const { vadaUrl, xApiKeyToken, hashSalt, hashSaltLength } = await VADA_SSM_PARAMS;

  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);
  const requestParams = {
    url: `${vadaUrl}/applications/${hashedPersonalNumber}/completions`,
    method: 'post',
    headers: {
      'x-api-key': xApiKeyToken,
    },
    body: {
      workflowId: caseItem.details.workflowId,
      attachments: attachmentList,
    },
  };

  const [sendVivaAdapterRequestError, response] = await to(sendVivaAdapterRequest(requestParams));
  if (sendVivaAdapterRequestError) {
    throw sendVivaAdapterRequestError;
  }
  console.info(response);

  return true;
}

function parseDynamoDBItemFromEvent(event) {
  if (event.detail.dynamodb.NewImage === undefined) {
    throw 'Could not read dynamoDB image from event details';
  }
  const dynamoDBItem = AWS.DynamoDB.Converter.unmarshall(event.detail.dynamodb.NewImage);
  return dynamoDBItem;
}

// const answers = [
//   {
//     field: {
//       id: '1',
//       tags: ['viva', 'attachment', 'category', 'expenses'],
//     },
//     value: [
//       {
//         fileame: 'test.jpg',
//         uploadedFileName: '182c4d16-de4c-44df-9df5-3dbc98030280_somefile',
//       },
//       {
//         fileame: 'test.jpg',
//         uploadedFileName: 'does_not_exsits',
//       },
//     ],
//   },
//   {
//     field: {
//       id: '2',
//       tags: ['viva', 'attachment', 'category', 'incomes'],
//     },
//     value: [
//       {
//         fileame: 'test.jpg',
//         uploadedFileName: '182c4d16-de4c-44df-9df5-3dbc98030280_somefile',
//       },
//       {
//         fileame: 'test.jpg',
//         uploadedFileName: 'does_not_exsits',
//       },
//     ],
//   },
//   {
//     field: {
//       id: '3',
//       tags: ['viva', 'attachment', 'category', 'completion'],
//     },
//     value: [
//       {
//         fileame: 'test.jpg',
//         uploadedFileName: '182c4d16-de4c-44df-9df5-3dbc98030280_somefile',
//       },
//       {
//         fileame: 'test.jpg',
//         uploadedFileName: 'does_not_exsits',
//       },
//     ],
//   },
// ];

function getAttachmentCategory(tags, attachmentCategories = ['expenses', 'incomes', 'completion']) {
  if (tags && tags.includes('viva') && tags.includes('attachment') && tags.includes('category')) {
    return attachmentCategories.reduce((acc, curr) => {
      if (tags.includes(curr)) {
        return curr;
      }
      return acc;
    }, undefined);
  }
  return undefined;
}

function generateFileKey(keyPrefix, filename) {
  return `${keyPrefix}/${filename}`;
}

async function answersToAttachmentList(personalNumber, answerList) {
  const attachmentList = [];

  for (const answer of answerList) {
    const attachmentCategory = getAttachmentCategory(answer.field.tags);
    if (!attachmentCategory) {
      continue;
    }

    for (const valueItem of answer.value) {
      const s3FileKey = generateFileKey(personalNumber, valueItem.uploadedFileName);

      // TODO: import bucketname from env
      const [getFileError, file] = await to(S3.getFile(process.env.BUCKET_NAME, s3FileKey));
      if (getFileError) {
        console.info(s3FileKey, getFileError);
        continue;
      }

      const attachment = {
        id: s3FileKey,
        name: valueItem.filename,
        category: attachmentCategory,
        fileBase64: file.Body.toString('base64'),
      };

      attachmentList.push(attachment);
    }
  }

  return attachmentList;
}

async function sendVivaAdapterRequest(requestParams) {
  const { url, method, headers, body } = await requestParams;
  const requestClient = request.requestClient({}, headers);

  const [requestError, response] = await to(request.call(requestClient, method, url, body));

  if (requestError) {
    if (requestError.response) {
      // The request was made and the server responded with a
      // status code that falls out of the range of 2xx
      throwError(requestError.response.status, requestError.response.data.message);
    } else if (requestError.request) {
      // The request was made but no response was received
      // `error.request` is an instance of http.ClientRequest in node.js
      throwError(500, requestError.request.message);
    } else {
      // Something happened in setting up the request that triggered an Error
      throwError(500, requestError.message);
    }
  }

  return response.data;
}
