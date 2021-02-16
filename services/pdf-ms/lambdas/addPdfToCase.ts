/* eslint-disable no-console */
import AWS from 'aws-sdk';
import to from 'await-to-js';

import config from '../../../config.js';
import * as dynamoDb from '../../../libs/dynamoDb.js';

import { Template, FormType, formTypes, Answer } from '../helpers/types';
import { answersToObject } from '../helpers/caseDataConverter';
import { loadFileFromBucket, writeFileToBucket } from '../helpers/s3';
import { modifyPdf } from '../helpers/pdf';
// import { getUser } from '../helpers/user';
import { getNewAndChangedValues, getUserCases } from '../helpers/case';

const dynamoDbConverter = AWS.DynamoDB.Converter;

interface UserForm {
  personalNumber: string;
  currentFormAnswers: Answer[];
  currentFormAnswerAsObject: Record<string, any>;
}

// Get current case answers (event)
// Get previous (the one before current) case answers

// Get diffs between previous case answers and latest case answers
//

export async function main(event: Record<string, any>) {
  // Convert DynamoDB case data to plain object
  const unMarshalledCase: Record<string, any> = dynamoDbConverter.unmarshall(
    event.detail.dynamodb.NewImage
  );

  if (unMarshalledCase.pdfGenerated) {
    return null;
  }

  const currentAndPreviousAnswers: {
    currentAnswers: Answer[];
    previousAnswers: Answer[];
  } = createUserForm(unMarshalledCase);

  // const { personalNumber, currentFormId } = userFrom;

  // const user = await getUser(personalNumber);

  // if (user) {
  //   userFrom.forms[currentFormId].answers.user = user;
  // }

  // find changed and newly added values, compared to the last case with the same formId.
  const userCases = await getUserCases(personalNumber);

  let changedValues: string[] = [];
  let newValues: string[] = [];

  if (userCases) {
    const sortedCases = userCases
      .filter(c => c.status.type.includes('submitted'))
      .filter(c => c.SK !== SK)
      .sort((c1, c2) => c2.updatedAt - c1.updatedAt);

    const newestRelevantCase = sortedCases[0];
    const newAndChangedValues = getNewAndChangedValues(userCase, newestRelevantCase);

    changedValues = newAndChangedValues.changedValues;
    newValues = newAndChangedValues.newValues;

    userCase.forms[currentFormId].answers.valuesChanged =
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
  // const newPdfBuffer = await modifyPdf(
  //   pdfBaseFileBuffer,
  //   jsonTemplate,
  //   userCase.answers,
  //   userCase.answersArray,
  //   changedValues,
  //   newValues
  // );

  // save a copy of the generated pdf to the bucket.
  // This is (probably) temporary, to make it easier for us to check the generated pdfs.
  // writeFileToBucket(`cases/${userCase.id}.pdf`, newPdfBuffer);

  // const successfullyAddedData = await addPdfToCase(PK, SK, newPdfBuffer);
  // if (!successfullyAddedData) {
  //   console.error(`Something went wrong with adding pdf data to case, PK: ${PK}, SK: ${SK}`);
  // }
}

// Check if form exists not neede. Cases can't be created without an existing formid
async function getFormType(formId: string): Promise<FormType> {
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
    console.error('Error in accessing dynamoDb:', error);
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
}

function createUserForm(unMarshalledCase: Record<string, any>): UserForm {
  const {
    PK,
    currentFormId,
    forms: {
      [currentFormId]: { answers },
    },
  } = unMarshalledCase;

  let answer: Record<string, any> = {};

  if (Array.isArray(answers)) {
    answer = answersToObject(answers);
  }

  return {
    personalNumber: PK.substring(5),
    currentFormId,
    currentFormAnswers: answers,
    currentFormAnswerAsObject: answer,
  };
}
