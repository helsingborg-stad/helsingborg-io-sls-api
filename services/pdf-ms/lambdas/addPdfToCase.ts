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

import log from '../../../libs/logs';

const PDF_SSM_PARAMS = params.read(config.pdf.envsKeyName);

const dynamoDbItemToObjectConverter = AWS.DynamoDB.Converter;

export async function main(
  event: Record<string, any>,
  context: Record<string, any>
): Promise<Boolean> {
  const submittedCase: Case = dynamoDbItemToObjectConverter.unmarshall(
    event.detail.dynamodb.NewImage
  );

  if (submittedCase.state === 'PDF_GENERATED') {
    console.log('TRIGGERED', submittedCase.state);
    return true;
  }

  const personalNumber = submittedCase.PK.substring(5);

  const [getUserError, user] = await to(getUser(personalNumber));
  if (getUserError) {
    log.error(
      'Get user error',
      context.awsRequestId,
      'service-pdf-ms-addPdfToCase-001',
      getUserError
    );

    throw getUserError;
  }

  const [getCasesError, closedCases] = await to(getClosedUserCases(personalNumber));
  if (getCasesError) {
    log.error(
      'Get cases error',
      context.awsRequestId,
      'service-pdf-ms-addPdfToCase-002',
      getUserError
    );

    throw getCasesError;
  }

  const ssmParams = await PDF_SSM_PARAMS;
  const submittedRecurringAnswers = submittedCase.forms[ssmParams.recurringFormId].answers;

  const { period } = submittedCase.details;
  const dateOptions = { timeZone: 'Europe/Stockholm' };

  const pdfPeriodLocaleDate = {
    start: new Date(period.startDate).toLocaleDateString('sv-SE', dateOptions),
    end: new Date(period.endDate).toLocaleDateString('sv-SE', dateOptions),
  };

  submittedRecurringAnswers.push({
    field: {
      id: 'periodDate',
      tags: [],
    },
    value: `${pdfPeriodLocaleDate.start} – ${pdfPeriodLocaleDate.end}`,
  });

  const pdfJsonValues = {
    valuesChanged: 'Nej',
  };

  let changedValues: string[] = [];
  let newValues: string[] = [];

  if (closedCases.length > 0) {
    const latestClosedCase = getLatestCase(closedCases);
    const latestClosedRecurringAnswers = latestClosedCase.forms[ssmParams.recurringFormId].answers;

    ({ changedValues, newValues } = getNewAndChangedCaseAnswerValues(
      submittedRecurringAnswers,
      latestClosedRecurringAnswers
    ));

    pdfJsonValues['valuesChanged'] =
      changedValues.length > 0 || newValues.length > 0 ? 'Ja' : 'Nej';
  }

  Object.assign(pdfJsonValues, {
    ...arrayToObject(submittedRecurringAnswers),
    user,
  });

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
    submittedRecurringAnswers,
    changedValues,
    newValues
  );

  writeFileToBucket(`cases/${Date.now()}-${submittedCase.id}.pdf`, newPdfBuffer);

  const [addPdfToCaseError] = await to(addPdfToCase(submittedCase, newPdfBuffer));
  if (addPdfToCaseError) {
    log.error(
      'Add pdf to case error',
      context.awsRequestId,
      'service-pdf-ms-addPdfToCase-003',
      addPdfToCaseError
    );

    throw addPdfToCaseError;
  }

  return true;
}
