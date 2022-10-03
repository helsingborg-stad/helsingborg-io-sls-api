import log from '../libs/logs';

import {
  VIVA_STATUS_NEW_APPLICATION_OPEN,
  VIVA_STATUS_APPLICATION_PERIOD_OPEN,
  VIVA_STATUS_CASE_EXISTS,
  VIVA_STATUS_WEB_APPLICATION_ACTIVE,
  VIVA_STATUS_WEB_APPLICATION_ALLOWED,
} from '../helpers/constants';
import putVivaMsEvent from '../helpers/putVivaMsEvent';
import validateApplicationStatus from '../helpers/validateApplicationStatus';

import type { VivaApplicationsStatusItem } from '../types/vivaApplicationsStatus';

interface User {
  personalNumber: string;
}

interface RecurringApplicationSuccessEvent {
  user: User;
}

interface LambdaDetail {
  user: User;
  status: VivaApplicationsStatusItem[];
}

export interface LambdaRequest {
  detail: LambdaDetail;
}

export interface Dependencies {
  recurringOpenEvent: (event: RecurringApplicationSuccessEvent) => Promise<void>;
  newOpenEvent: (event: LambdaDetail) => Promise<void>;
}

export async function personApplicationStatus(
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<boolean> {
  const { user, status } = input.detail;

  const recurringPeriodIsOpenStatusCodes = [
    VIVA_STATUS_APPLICATION_PERIOD_OPEN,
    VIVA_STATUS_CASE_EXISTS,
    VIVA_STATUS_WEB_APPLICATION_ACTIVE,
    VIVA_STATUS_WEB_APPLICATION_ALLOWED,
  ];
  if (validateApplicationStatus(status, recurringPeriodIsOpenStatusCodes)) {
    await dependencies.recurringOpenEvent({ user });
  }

  const newApplicationIsOpenStatusCodes = [VIVA_STATUS_NEW_APPLICATION_OPEN];
  if (validateApplicationStatus(status, newApplicationIsOpenStatusCodes)) {
    await dependencies.newOpenEvent(input.detail);
  }

  return true;
}

export const main = log.wrap(event =>
  personApplicationStatus(event, {
    recurringOpenEvent: putVivaMsEvent.checkOpenPeriodSuccess,
    newOpenEvent: putVivaMsEvent.checkOpenNewApplicationSuccess,
  })
);
