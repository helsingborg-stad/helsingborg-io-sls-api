import { putEvent } from '../libs/awsEventBridge';

interface EventParameters {
  source: string;
  detailType: string;
}

export const eventTypeCollection = {
  checkOpenNewApplicationSuccess: {
    source: 'vivaMs.personApplicationStatus',
    detailType: 'checkOpenNewApplicationSuccess',
  },
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
  syncWorkflowIdSuccess: {
    source: 'vivaMs.syncNewCaseWorkflowId',
    detailType: 'syncWorkflowIdSuccess',
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

function putUserEvent(
  detail: unknown,
  type: string,
  typeCollection: Record<string, EventParameters> = eventTypeCollection
): Promise<void> {
  const { detailType, source } = typeCollection[type];
  return putEvent(detail, detailType, source);
}

export default {
  completions: {
    success: (detail: unknown) => putUserEvent(detail, 'checkCompletionsStatusSuccess'),
    required: (detail: unknown) => putUserEvent(detail, 'checkCompletionsStatusRequired'),
  },
  checkOpenPeriodSuccess: (detail: unknown) => putUserEvent(detail, 'checkOpenPeriodSuccess'),
  personDetailSuccess: (detail: unknown) => putUserEvent(detail, 'personDetailSuccess'),
  applicationReceivedSuccess: (detail: unknown) => putUserEvent(detail, 'applicationReceivedSuccess'),
  decideCaseStatusSuccess: (detail: unknown) => putUserEvent(detail, 'decideCaseStatusSuccess'),
  syncWorkflowSuccess: (detail: unknown) => putUserEvent(detail, 'syncWorkflowSuccess'),
  syncWorkflowIdSuccess: (detail: unknown) => putUserEvent(detail, 'syncWorkflowIdSuccess'),
  htmlGeneratedSuccess: (detail: unknown) => putUserEvent(detail, 'htmlGeneratedSuccess'),
  applicationStatusSuccess: (detail: unknown) => putUserEvent(detail, 'applicationStatusSuccess'),
  setCaseCompletionsSuccess: (detail: unknown) => putUserEvent(detail, 'setCaseCompletionsSuccess'),
  syncCaseCompletionsSuccess: (detail: unknown) => putUserEvent(detail, 'syncCaseCompletionsSuccess'),
  checkOpenNewApplicationSuccess: (detail: unknown) => putUserEvent(detail, 'checkOpenNewApplicationSuccess'),
};
