import { putEvent } from '../libs/awsEventBridge';

export const eventTypeCollection = {
  checkOpenPeriodSuccess: {
    source: 'vivaMs.personApplicationStatus',
    detailType: 'checkOpenPeriodSuccess',
  },
  personDetailSuccess: {
    source: 'vivaMs.personApplication',
    detailType: 'personDetailSuccess',
  },
  applicationReceivedSuccess: {
    source: 'vivaMs.submitApplication',
    detailType: 'applicationReceivedSuccess',
  },
  checkCompletionsStatusSuccess: {
    source: 'vivaMs.checkCompletionsStatus',
    detailType: 'Completions Due Date Probably Overdue',
  },
  checkCompletionsStatusRequired: {
    source: 'vivaMs.checkCompletionsStatus',
    detailType: 'checkCompletionsStatusRequired',
  },
  decideCaseStatusSuccess: {
    source: 'vivaMs.decideCaseStatus',
    detailType: 'decideCaseStatusSuccess',
  },
  syncWorkflowSuccess: {
    source: 'vivaMs.syncWorkflow',
    detailType: 'syncWorkflowSuccess',
  },
  htmlGeneratedSuccess: {
    source: 'vivaMs.generateRecurringCaseHtml',
    detailType: 'htmlGeneratedSuccess',
  },
  applicationStatusSuccess: {
    source: 'vivaMs.applicationStatus',
    detailType: 'applicationStatusSuccess',
  },
  setCaseCompletionsSuccess: {
    source: 'vivaMs.setCaseCompletions',
    detailType: 'setSuccess',
  },
  syncCaseCompletionsSuccess: {
    source: 'vivaMs.syncCaseCompletions',
    detailType: 'syncSuccess',
  },
};

function putUserEvent(detail, type, typeCollection = eventTypeCollection) {
  const { detailType, source } = typeCollection[type];
  return putEvent(detail, detailType, source);
}

export default {
  completions: {
    success: detail => putUserEvent(detail, 'checkCompletionsStatusSuccess'),
    required: detail => putUserEvent(detail, 'checkCompletionsStatusRequired'),
  },
  checkOpenPeriodSuccess: detail => putUserEvent(detail, 'checkOpenPeriodSuccess'),
  personDetailSuccess: detail => putUserEvent(detail, 'personDetailSuccess'),
  applicationReceivedSuccess: detail => putUserEvent(detail, 'applicationReceivedSuccess'),
  decideCaseStatusSuccess: detail => putUserEvent(detail, 'decideCaseStatusSuccess'),
  syncWorkflowSuccess: detail => putUserEvent(detail, 'syncWorkflowSuccess'),
  htmlGeneratedSuccess: detail => putUserEvent(detail, 'htmlGeneratedSuccess'),
  applicationStatusSuccess: detail => putUserEvent(detail, 'applicationStatusSuccess'),
  setCaseCompletionsSuccess: detail => putUserEvent(detail, 'setCaseCompletionsSuccess'),
  syncCaseCompletionsSuccess: detail => putUserEvent(detail, 'syncCaseCompletionsSuccess'),
};
