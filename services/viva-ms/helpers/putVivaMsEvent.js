import { putEvent } from '../../../libs/awsEventBridge';

export const eventTypeCollection = {
  statusApplySuccess: {
    source: 'vivaMs.personApplicationStatus',
    detailType: 'applicationStatusApplySuccess',
  },
  personDetailSuccess: {
    source: 'vivaMs.personApplication',
    detailType: 'getVivaPersonApplicationDetailSuccess',
  },
  applicationSumitSuccess: {
    source: 'vivaMs.submitApplication',
    detailType: 'vivaMsSubmitApplicationSuccess',
  },
  syncWorkflowSuccess: {
    source: 'vivaMs.syncWorkflow',
    detailType: 'vivaMsSyncWorkflowSuccess',
  },
  decideCaseStatusSuccess: {
    source: 'vivaMs.decideCaseStatus',
    detailType: 'vivaMsDecideCaseStatusSuccess',
  },
};

function putUserEvent(user, type, typeCollection = eventTypeCollection) {
  const { detailType, source } = typeCollection[type];
  return putEvent(user, detailType, source);
}

export default {
  statusApplySuccess: userDetail => putUserEvent(userDetail, 'statusApplySuccess'),
  personDetailSuccess: userDetail => putUserEvent(userDetail, 'personDetailSuccess'),
  applicationSumitSuccess: userDetail => putUserEvent(userDetail, 'applicationSumitSuccess'),
  syncWorkflowSuccess: userDetail => putUserEvent(userDetail, 'syncWorkflowSuccess'),
  decideCaseStatusSuccess: userDetail => putUserEvent(userDetail, 'decideCaseStatusSuccess'),
};
