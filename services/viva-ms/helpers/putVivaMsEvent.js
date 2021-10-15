import { putEvent } from '../../../libs/awsEventBridge';

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
};

function putUserEvent(user, type, typeCollection = eventTypeCollection) {
  const { detailType, source } = typeCollection[type];
  return putEvent(user, detailType, source);
}

export default {
  checkOpenPeriodSuccess: userDetail => putUserEvent(userDetail, 'checkOpenPeriodSuccess'),
  completionRequired: userDetail => putUserEvent(userDetail, 'completionRequired'),
  personDetailSuccess: userDetail => putUserEvent(userDetail, 'personDetailSuccess'),
  applicationReceivedSuccess: userDetail => putUserEvent(userDetail, 'applicationReceivedSuccess'),
  syncWorkflowSuccess: userDetail => putUserEvent(userDetail, 'syncWorkflowSuccess'),
  decideCaseStatusSuccess: userDetail => putUserEvent(userDetail, 'decideCaseStatusSuccess'),
};
