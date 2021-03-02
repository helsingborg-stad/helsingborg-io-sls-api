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
  const ekbTemplateFiles = templates['EKB-recurring'];

  // load the template files from the s3 bucket
  const templateFile = await loadFileFromBucket(ekbTemplateFiles.JSONTemplateFilename);
  const jsonTemplate: Template = JSON.parse(templateFile.toString()) as Template;
  const pdfBaseFileBuffer: Buffer = (await loadFileFromBucket(
    ekbTemplateFiles.pdfBaseFilename
  )) as Buffer;

  // add the data to the pdf according to the template
  const newPdfBuffer = await modifyPdf(
    pdfBaseFileBuffer,
    jsonTemplate,
    pdfJsonValues,
    currentCaseAnswers,
    changedValues,
    newValues
  );

  // This is (probably) temporary, to make it easier for us to check the generated pdfs.
  writeFileToBucket(`cases/${currentCase.id}.pdf`, newPdfBuffer);

  const [addPdfToCaseError] = await to(addPdfToCase(currentCase, newPdfBuffer));
  if (addPdfToCaseError) {
    throw addPdfToCaseError;
  }

  return true;
}
