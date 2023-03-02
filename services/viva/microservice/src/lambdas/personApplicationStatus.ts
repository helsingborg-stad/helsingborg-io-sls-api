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

import type { CaseUser } from '../types/caseItem';
import type { VivaApplicationsStatusItem } from '../types/vivaApplicationsStatus';

type SuccessEvent = LambdaDetail;

interface LambdaDetail {
  user: CaseUser;
  status: VivaApplicationsStatusItem[];
}

export interface LambdaRequest {
  detail: LambdaDetail;
}

export interface Dependencies {
  triggerRecurringOpenEvent: (params: SuccessEvent) => Promise<void>;
  triggerNewOpenEvent: (params: SuccessEvent) => Promise<void>;
}

export async function personApplicationStatus(
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<boolean> {
  const { status } = input.detail;

  const recurringPeriodIsOpenStatusCodes = [
    VIVA_STATUS_APPLICATION_PERIOD_OPEN,
    VIVA_STATUS_CASE_EXISTS,
    VIVA_STATUS_WEB_APPLICATION_ACTIVE,
    VIVA_STATUS_WEB_APPLICATION_ALLOWED,
  ];
  const newApplicationIsOpenStatusCodes = [VIVA_STATUS_NEW_APPLICATION_OPEN];

  validateApplicationStatus(status, recurringPeriodIsOpenStatusCodes) &&
    (await dependencies.triggerRecurringOpenEvent(input.detail));

  validateApplicationStatus(status, newApplicationIsOpenStatusCodes) &&
    (await dependencies.triggerNewOpenEvent(input.detail));

  return true;
}

export const main = log.wrap(event =>
  personApplicationStatus(event, {
    triggerRecurringOpenEvent: putVivaMsEvent.checkOpenPeriodSuccess,
    triggerNewOpenEvent: putVivaMsEvent.checkOpenNewApplicationSuccess,
  })
);
