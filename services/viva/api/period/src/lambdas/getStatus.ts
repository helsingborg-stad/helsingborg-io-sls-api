import { wrappers } from '../libs/lambdaWrapper';
import {
  getVivaPeriodInfo,
  getCurrentPeriodInfo,
  getConfigFromS3,
  formatHandlebarsDateMessage,
  isProviderPeriodOpen,
  isVivaApplicantStatusEligible,
} from '../helpers/vivaPeriod';
import type { PeriodConfig, ProviderPeriodInfo } from '../helpers/vivaPeriod';

export interface Input {
  personalNumber: string;
}

export interface Response {
  message: string | null;
}

export interface Dependencies {
  getProviderPeriodInfo(personalNumber: string): Promise<ProviderPeriodInfo>;
  isApplicantStatusEligible(personalNumber: string): Promise<boolean>;
  getConfig(): Promise<PeriodConfig>;
}

export async function getStatus(input: Input, dependencies: Dependencies): Promise<Response> {
  const providerPeriodInfo = await dependencies.getProviderPeriodInfo(input.personalNumber);
  const config = await dependencies.getConfig();
  const { currentDate, periodOpenDate, isPeriodOpen } = getCurrentPeriodInfo(config);

  const isApplicantStatusEligible = await dependencies.isApplicantStatusEligible(
    input.personalNumber
  );

  const isCurrentPeriodOpen = isProviderPeriodOpen(currentDate, providerPeriodInfo);
  const isApplicantEligibleToApply = isCurrentPeriodOpen && isApplicantStatusEligible;
  const canApplicantApply = isPeriodOpen || isApplicantEligibleToApply;

  const message = canApplicantApply
    ? null
    : formatHandlebarsDateMessage(config.responseMessageFormat, { currentDate, periodOpenDate });

  return {
    message,
  };
}

export const main = wrappers.restJSON.wrap(getStatus, {
  getProviderPeriodInfo: getVivaPeriodInfo,
  isApplicantStatusEligible: isVivaApplicantStatusEligible,
  getConfig: getConfigFromS3,
});
