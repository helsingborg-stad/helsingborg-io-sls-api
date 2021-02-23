/* eslint-disable no-console */
import AWS from 'aws-sdk';
import to from 'await-to-js';

import config from '../../../config.js';
import params from '../../../libs/params';
import * as dynamoDb from '../../../libs/dynamoDb.js';

import { Template, Case } from '../helpers/types';
import { arrayToObject } from '../helpers/caseDataConverter';
import { loadFileFromBucket, writeFileToBucket } from '../helpers/s3';
import { modifyPdf } from '../helpers/pdf';
import { getUser } from '../helpers/user';
import { getNewAndChangedValues, getUserCases } from '../helpers/case';

const PDF_SSM_PARAMS = params.read(config.pdf.envsKeyName);

const dynamoDbConverter = AWS.DynamoDB.Converter;

export async function main(event: Record<string, any>) {
  // Convert DynamoDB case data to plain object
  const unMarshalledCase: Record<string, any> = dynamoDbConverter.unmarshall(
    event.detail.dynamodb.NewImage
  );

  if (unMarshalledCase.pdfGenerated === 'yes') {
    return true;
  }

  const { PK } = unMarshalledCase;
  const personalNumber = PK.substring(5);

  const [getUserCasesError, userCases] = await to(getUserCases(personalNumber));
  if (getUserCasesError) {
    console.error(getUserCasesError);
    throw getUserCasesError;
  }

  if (userCases.length === 0) {
    throw 'User cases not found';
  }

  const [currentCase, previousCase] = sortCasesByDate(userCases, 2);

  const ssmParams = await PDF_SSM_PARAMS;
  const currentCaseAnswers = currentCase.forms[ssmParams.recurringFormId].answers;
  const previousCaseAnswers = previousCase.forms[ssmParams.recurringFormId].answers;

  const [getUserError, user] = await to(getUser(personalNumber));
  if (getUserError) {
    console.error(getUserError);
    throw getUserError;
  }

  const { changedValues, newValues } = getNewAndChangedValues(
    currentCaseAnswers,
    previousCaseAnswers
  );

  const pdfJsonValues = {
    answers: {
      ...arrayToObject(currentCaseAnswers),
      user,
      valuesChanged: changedValues.length > 0 || newValues.length > 0 ? 'Ja' : 'Nej',
    },
  };

  const templates = ssmParams.templatesFilenames;
  const ekbTemplateFiles = templates['EKB-recurring'];

  // load the template files from the s3 bucket
  const templateFile = await loadFileFromBucket(ekbTemplateFiles.JSONTemplateFilename);
  const jsonTemplate: Template = JSON.parse(templateFile.toString()) as Template;
  const pdfBaseFileBuffer: Buffer = (await loadFileFromBucket(
    ekbTemplateFiles.pdfBaseFilename
  )) as Buffer;

  //add the data to the pdf according to the template
  const newPdfBuffer = await modifyPdf(
    pdfBaseFileBuffer,
    jsonTemplate,
    pdfJsonValues,
    currentCaseAnswers,
    changedValues,
    newValues
  );

  // save a copy of the generated pdf to the bucket.
  // This is (probably) temporary, to make it easier for us to check the generated pdfs.
  writeFileToBucket(`cases/${currentCase.id}.pdf`, newPdfBuffer);

  const successfullyAddedData = await addPdfToCase(currentCase, newPdfBuffer);
  if (!successfullyAddedData) {
    console.error(
      `Something went wrong with adding pdf data to case, PK: ${currentCase.PK}, SK: ${currentCase.SK}`
    );
  }
}

async function addPdfToCase(currentCase: Case, pdf?: string | Buffer) {
  const UpdateExpression = 'SET #pdf = :pdf, #pdfGenerated = :pdfGenerated';
  const ExpressionAttributeNames = { '#pdf': 'pdf', '#pdfGenerated': 'pdfGenerated' };
  const ExpressionAttributeValues = {
    ':pdf': pdf || undefined,
    ':pdfGenerated': pdf !== undefined ? 'yes' : 'no',
  };

  const params = {
    TableName: config.cases.tableName,
    Key: {
      PK: currentCase.PK,
      SK: currentCase.SK,
    },
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    ReturnValue: 'ALL_NEW',
  };

  const [error] = await to(dynamoDb.call('update', params));
  if (error) {
    console.error(error);
    return false;
  }

  return true;
}

function sortCasesByDate(cases: Case[], limit: number): Case[] {
  return cases
    .sort((caseA: Case, caseB: Case) => caseB.updatedAt - caseA.updatedAt)
    .slice(0, limit);
}
