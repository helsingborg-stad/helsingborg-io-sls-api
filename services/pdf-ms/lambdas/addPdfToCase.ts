import AWS from 'aws-sdk';
import to from 'await-to-js';

import { arrayToObject } from '../helpers/caseDataConverter';
import config from '../../../config.js';
import * as dynamoDb from '../../../libs/dynamoDb.js';
import { Template, FormType, Case, formTypes, AnswerObject } from '../helpers/types';
import { loadFileFromBucket, writeFileToBucket } from '../helpers/s3';
import { modifyPdf } from '../helpers/pdf';
import { getUser } from '../helpers/user';
import { getNewAndChangedValues, getApplicantCasesByFormId } from '../helpers/case';

const dynamoDbConverter = AWS.DynamoDB.Converter;

export const main = async (event: Record<string, any>) => {
  const caseData: Case & { user?: Record<string, any>; answersArray: AnswerObject[] } = parseCase(
    event.detail.dynamodb.NewImage
  );
  if (caseData.pdfGenerated) {
    return;
  }
  const { formId, PK, SK } = caseData;
  const personalNumber = PK.substring(5);
  const user = await getUser(personalNumber);
  if (user) {
    caseData.answers.user = user;
  }

  // find changed and newly added values, compared to the last case with the same formId.
  const relevantCases = await getApplicantCasesByFormId(personalNumber, formId);
  let changedValues: string[] = [];
  let newValues: string[] = [];
  if (relevantCases.length > 1) {
    const sortedCases = relevantCases
      .filter(c => c.status.type.includes('submitted'))
      .filter(c => c.SK !== SK)
      .sort((c1, c2) => c2.updatedAt - c1.updatedAt);
    const newestRelevantCase = sortedCases[0];
    const newAndChangedValues = getNewAndChangedValues(caseData, newestRelevantCase);
    changedValues = newAndChangedValues.changedValues;
    newValues = newAndChangedValues.newValues;
    caseData.answers.valuesChanged =
      changedValues.length > 0 || newValues.length > 0 ? 'Ja' : 'Nej';
  }

  // get the correct template
  const formType = await getFormType(formId);
  const templates = JSON.parse((await loadFileFromBucket('templateFiles.json')).toString());
  const templateFiles = templates[Object.keys(templates).includes(formType) ? formType : 'default'];

  // load the template files from the s3 bucket
  const templateFile = await loadFileFromBucket(templateFiles.JSONTemplateFilename);
  const jsonTemplate: Template = JSON.parse(templateFile.toString()) as Template;
  const pdfBaseFileBuffer: Buffer = (await loadFileFromBucket(
    templateFiles.pdfBaseFilename
  )) as Buffer;

  // add the data to the pdf according to the template
  const newPdfBuffer = await modifyPdf(
    pdfBaseFileBuffer,
    jsonTemplate,
    caseData.answers,
    changedValues,
    newValues
  );
  // save a copy of the generated pdf to the bucket.
  // This is (probably) temporary, to make it easier for us to check the generated pdfs.
  writeFileToBucket(`cases/${caseData.id}.pdf`, newPdfBuffer);

  const successfullyAddedData = await addPdfToCase(PK, SK, newPdfBuffer);
  if (!successfullyAddedData) {
    console.error(`Something went wrong with adding pdf data to case, PK: ${PK}, SK: ${SK}`);
  }
};

const getFormType = async (formId: string): Promise<FormType> => {
  const formPartitionKey = `FORM#${formId}`;
  const params = {
    TableName: config.forms.tableName,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: {
      ':pk': formPartitionKey,
    },
  };

  const [error, queryResponse] = await to(dynamoDb.call('query', params));
  if (error) {
    console.error('Error in accessing dynamoDb: ', error);
    return null;
  }
  const dbResponse = queryResponse as { Items: { formType?: string }[]; Count: number };
  if (dbResponse.Count === 0) {
    console.error(`Form with that id (${formId}) not found in the database.`);
    return null;
  }
  if (formTypes.includes(dbResponse.Items[0].formType)) {
    return dbResponse.Items[0].formType as FormType;
  }
  return null;
};

const addPdfToCase = async (PK: string, SK: string, pdf?: string | Buffer) => {
  const UpdateExpression = 'SET #pdf = :pdf, #pdfGenerated = :pdfGenerated';
  const ExpressionAttributeNames = { '#pdf': 'pdf', '#pdfGenerated': 'pdfGenerated' };
  const ExpressionAttributeValues = {
    ':pdf': pdf || 'No pdf to add',
    ':pdfGenerated': pdf !== undefined ? 'yes' : 'no',
  };

  const params = {
    TableName: config.cases.tableName,
    Key: { PK, SK },
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
};

const parseCase = (dynamoDbImage: any) => {
  // Convert DynamoDB case data to plain object
  const unMarshalledCase = dynamoDbConverter.unmarshall(dynamoDbImage);
  const { answers } = unMarshalledCase;
  let answerObject: Record<string, any> = {};
  if (Array.isArray(answers)) {
    answerObject = arrayToObject(answers);
  }
  return { ...unMarshalledCase, answers: answerObject, answersArray: answers } as Case & {
    answersArray: AnswerObject[];
  };
};
