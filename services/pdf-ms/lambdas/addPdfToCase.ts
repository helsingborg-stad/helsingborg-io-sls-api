import AWS from 'aws-sdk';
import to from 'await-to-js';
import { convertAnswerArrayToObject } from '../helpers/caseDataConverter';
import config from '../../../config.js';
import * as dynamoDb from '../../../libs/dynamoDb.js';
import { TemplateData, FormType, CaseData, formTypes } from '../helpers/types';
import { loadFileFromBucket, writeFileToBucket } from '../helpers/s3';
import { modifyPdf } from '../helpers/pdf';

const dynamoDbConverter = AWS.DynamoDB.Converter;

// Something that encodes which templates we have available in our bucket, and maps them to formTypes.
// TODO: possibly move this to a file in the S3 that we load? Think about how we want to solve this.
const templates: Record<
  FormType | 'default',
  { pdfBaseFilename: string; JSONTemplateFilename: string }
> = {
  'EKB-new': { pdfBaseFilename: 'ekb-template.pdf', JSONTemplateFilename: 'ekb-template.json' },
  'EKB-recurring': {
    pdfBaseFilename: 'ekb-template.pdf',
    JSONTemplateFilename: 'ekb-template.json',
  },
  default: { pdfBaseFilename: 'ekb-template.pdf', JSONTemplateFilename: 'ekb-template.json' },
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
    console.error('Form with that id not found in the database.');
    return null;
  }
  if (formTypes.includes(dbResponse.Items[0].formType)) {
    return dbResponse.Items[0].formType as FormType;
  }
  return null;
};

const addPdfDataToCase = async (PK: string, SK: string, pdf?: string | Buffer) => {
  const UpdateExpression = 'SET #pdf = :pdf, #pdfGenerated = :pdfGenerated';
  const ExpressionAttributeNames = { '#pdf': 'pdf', '#pdfGenerated': 'pdfGenerated' };
  const ExpressionAttributeValues = {
    ':pdf': pdf || 'No pdf to add',
    ':pdfGenerated': pdf !== undefined,
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

const parseCaseData = (dynamoDbImage: any) => {
  // Convert DynamoDB case data to plain object
  const unMarshalledCaseData = dynamoDbConverter.unmarshall(dynamoDbImage);
  const { answers } = unMarshalledCaseData;
  let answerObject: Record<string, any> = {};
  if (Array.isArray(answers)) {
    answerObject = convertAnswerArrayToObject(answers);
  }
  return { ...unMarshalledCaseData, answers: answerObject } as CaseData;
};

export const main = async (event: Record<string, any>) => {
  const caseData = parseCaseData(event.detail.dynamodb.NewImage);
  if (caseData.pdfGenerated) {
    console.log('pdf already generated, aborting.');
    return;
  }
  const { formId, PK, SK } = caseData;
  const formType = await getFormType(formId);

  let templateFiles: {
    pdfBaseFilename: string;
    JSONTemplateFilename: string;
  };
  if (formType !== null) {
    templateFiles = templates[formType];
  } else {
    templateFiles = templates['default'];
  }

  // load the template files from the s3 bucket
  const jsonTemplateFile = await loadFileFromBucket(templateFiles.JSONTemplateFilename);
  const jsonTemplate: TemplateData = JSON.parse(jsonTemplateFile.toString()) as TemplateData;
  const pdfBaseFile: Buffer = (await loadFileFromBucket(templateFiles.pdfBaseFilename)) as Buffer;

  // add the data according to the template
  const newPdfBuffer = await modifyPdf(pdfBaseFile, jsonTemplate, caseData.answers);
  // I save a copy of the generated pdf to the bucket.
  // This is (probably) temporary, to make it easier for us to check the generated pdfs.
  writeFileToBucket(`cases/${caseData.id}.pdf`, newPdfBuffer);

  const successfullyAddedData = await addPdfDataToCase(PK, SK, newPdfBuffer);
  if (successfullyAddedData) {
    console.log('successfully added pdf to case!');
  } else {
    console.error('something went wrong with adding pdf data to case');
  }
};
