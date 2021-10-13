import { putEvent } from '../../../libs/awsEventBridge';

export const eventTypeCollection = {
  statusApplySuccess: {
    source: 'vivaMs.personApplicationStatus',
    detailType: 'applicationStatusApplySuccess',
  },
  statusCompletion: {
    source: 'vivaMs.personApplicationStatus',
    detailType: 'applicationStatusCompletionRequired',
  },
  personDetailSuccess: {
    source: 'vivaMs.personApplication',
    detailType: 'getVivaPersonApplicationDetailSuccess',
  },
  applicationReceivedSuccess: {
    source: 'vivaMs.submitApplication',
    detailType: 'vivaAdapterApplicationReceivedSuccess',
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
  statusCompletion: userDetail => putUserEvent(userDetail, 'statusCompletion'),
  personDetailSuccess: userDetail => putUserEvent(userDetail, 'personDetailSuccess'),
  applicationReceivedSuccess: userDetail => putUserEvent(userDetail, 'applicationReceivedSuccess'),
  syncWorkflowSuccess: userDetail => putUserEvent(userDetail, 'syncWorkflowSuccess'),
  decideCaseStatusSuccess: userDetail => putUserEvent(userDetail, 'decideCaseStatusSuccess'),
};
