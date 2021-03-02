/* eslint-disable no-console */
import AWS from 'aws-sdk';
import to from 'await-to-js';

import config from '../../../config.js';
import params from '../../../libs/params';

import { Case, Template } from '../helpers/types';
import { arrayToObject } from '../helpers/caseDataConverter';
import { loadFileFromBucket, writeFileToBucket } from '../helpers/s3';
import { modifyPdf } from '../helpers/pdf';
import { getUser } from '../helpers/user';
import {
  getClosedUserCases,
  addPdfToCase,
  getLatestCase,
  getNewAndChangedCaseAnswerValues,
} from '../helpers/case';

const PDF_SSM_PARAMS = params.read(config.pdf.envsKeyName);

// Convert DynamoDB item to plain object
const dynamoDbConverter = AWS.DynamoDB.Converter;

export async function main(event: Record<string, any>): Promise<Boolean> {
  const submittedCase: Case = dynamoDbConverter.unmarshall(event.detail.dynamodb.NewImage);

  if (submittedCase.pdfGenerated === 'yes') {
    return true;
  }

  const personalNumber = submittedCase.PK.substring(5);

  const [getUserError, user] = await to(getUser(personalNumber));
  if (getUserError) {
    throw getUserError;
  }

  const [currentCase, previousCase] = sortCasesByDate(userCases, 2);

  const ssmParams = await PDF_SSM_PARAMS;
  const currentCaseAnswers = currentCase.forms[ssmParams.recurringFormId].answers;
  const previousCaseAnswers = previousCase.forms[ssmParams.recurringFormId].answers;

  const { changedValues, newValues } = getNewAndChangedCaseAnswerValues(
    currentCaseAnswers,
    previousCaseAnswers
  );

  }

  const pdfJsonValues = {
    ...arrayToObject(currentCaseAnswers),
    user,
    valuesChanged: changedValues.length > 0 || newValues.length > 0 ? 'Ja' : 'Nej',
  };

  const templates = ssmParams.templatesFilenames;
  const ekbRecurringTemplateFiles = templates['EKB-recurring'];

  const templateFile = await loadFileFromBucket(ekbRecurringTemplateFiles.JSONTemplateFilename);
  const jsonTemplate: Template = JSON.parse(templateFile.toString()) as Template;

  const pdfBaseFileBuffer: Buffer = (await loadFileFromBucket(
    ekbRecurringTemplateFiles.pdfBaseFilename
  )) as Buffer;

  const newPdfBuffer = await modifyPdf(
    pdfBaseFileBuffer,
    jsonTemplate,
    pdfJsonValues,
    currentCaseAnswers,
    changedValues,
    newValues
  );

  writeFileToBucket(`cases/${currentCase.id}.pdf`, newPdfBuffer);
  // Make it easier for developer to check the generated pdf

  const [addPdfToCaseError] = await to(addPdfToCase(currentCase, newPdfBuffer));
  if (addPdfToCaseError) {
    throw addPdfToCaseError;
  }

  return true;
}
