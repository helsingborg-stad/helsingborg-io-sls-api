import to from 'await-to-js';
import handlebars from '../helpers/htmlTemplate';
import config from '../libs/config';
import log from '../libs/logs';
import { getItem as getStoredUserCase } from '../libs/queries';
import params from '../libs/params';
import S3 from '../libs/S3';

import createRecurringCaseTemplate from '../helpers/createRecurringCaseTemplate';
import putVivaMsEvent from '../helpers/putVivaMsEvent';
import { getClosedUserCases, updateVivaCaseState } from '../helpers/dynamoDb';

export async function main(event, context) {
  const { caseKeys } = event.detail;

  const [getCaseItemError, storedUserCase] = await getStoredUserCase(
    config.cases.tableName,
    caseKeys.PK,
    caseKeys.SK
  );
  const { Item: caseItem } = storedUserCase;

  if (getCaseItemError) {
    log.error(
      'Error getting stored case from the cases table',
      context.awsRequestId,
      'service-viva-ms-generateRecurringCaseHtml-000',
      getCaseItemError
    );
    return false;
  }
  const [paramsReadError, vivaCaseSSMParams] = await to(
    params.read(config.cases.providers.viva.envsKeyName)
  );
  if (paramsReadError) {
    log.error(
      'Read ssm params ´config.cases.providers.viva.envsKeyName´ failed',
      context.awsRequestId,
      'service-viva-ms-generateRecurringCaseHtml-002',
      paramsReadError
    );
    return false;
  }

  const [getClosedCasesError, closedUserCases] = await to(getClosedUserCases(caseKeys.PK));
  if (getClosedCasesError) {
    log.error(
      'Error getting previous items from the cases table',
      context.awsRequestId,
      'service-viva-ms-generateRecurringCaseHtml-006',
      getClosedCasesError
    );
    return false;
  }
  const { Items: closedCaseList } = closedUserCases as any;

  const { recurringFormId } = vivaCaseSSMParams;
  let changedAnswerValues = caseItem.forms[recurringFormId].answers;
  if (closedCaseList.length > 0) {
    const [closedCase] = closedCaseList.sort((caseA, caseB) => caseB.updatedAt - caseA.updatedAt);

    changedAnswerValues = getChangedCaseAnswerValues(
      caseItem.forms[recurringFormId].answers,
      closedCase.forms[recurringFormId].answers
    );
  }

  const [s3GetObjectError, hbsTemplateS3Object] = await to(
    S3.getFile(process.env.PDF_STORAGE_BUCKET_NAME, 'templates/ekb-recurring-v2.hbs')
  );
  if (s3GetObjectError) {
    log.error(
      'Failed to get object from S3 bucket',
      context.awsRequestId,
      'service-viva-ms-generateRecurringCaseHtml-001',
      s3GetObjectError
    );
    return false;
  }

  const handlebarsTemplateFileBody = hbsTemplateS3Object.Body.toString();
  const template = handlebars.compile(handlebarsTemplateFileBody);

  const caseTemplateData = createRecurringCaseTemplate(caseItem, changedAnswerValues);
  const html = template(caseTemplateData);

  const caseHtmlKey = `html/case-${caseItem.id}.html`;
  const [s3StoreFileError] = await to(
    S3.storeFile(process.env.PDF_STORAGE_BUCKET_NAME, caseHtmlKey, html)
  );
  if (s3StoreFileError) {
    log.error(
      'Failed to put object to S3 bucket',
      context.awsRequestId,
      'service-viva-ms-generateRecurringCaseHtml-003',
      s3StoreFileError
    );
    return false;
  }

  const [updateCaseError] = await to(updateVivaCaseState(caseItem));
  if (updateCaseError) {
    log.error(
      'Failed to update case state attribute',
      context.awsRequestId,
      'service-viva-ms-generateRecurringCaseHtml-004',
      updateCaseError
    );
    return false;
  }

  const [putEventError] = await to(
    putVivaMsEvent.htmlGeneratedSuccess({
      pdfStorageBucketKey: caseHtmlKey,
      keys: {
        PK: caseItem.PK,
        SK: caseItem.SK,
      },
    })
  );
  if (putEventError) {
    log.error(
      'Put event ´htmlGeneratedSuccess´ failed',
      context.awsRequestId,
      'service-viva-ms-generateRecurringCaseHtml-005',
      putEventError
    );
    return false;
  }

  return true;
}

function getChangedCaseAnswerValues(currentAnswerList, previousAnswerList) {
  return currentAnswerList.map(currentAnswer => {
    const tags = [...currentAnswer.field.tags];

    const previousAnswer = previousAnswerList.find(
      previousAnswer => previousAnswer.field.id === currentAnswer.field.id
    );

    if (previousAnswer?.value !== currentAnswer.value) {
      tags.push('changed');
    }
    return {
      ...currentAnswer,
      field: {
        ...currentAnswer.field,
        tags,
      },
    };
  });
}
