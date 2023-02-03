import { wrappers } from '../libs/lambdaWrapper';
import type { PeriodConfig } from '../helpers/vivaPeriod';
import {
  getSafe,
  getCurrentDate,
  getMonthIndex,
  createDate,
  isActivePeriodOpen,
  getConfigFromS3,
  formatHandlebarsDateMessage,
} from '../helpers/vivaPeriod';

export interface Dependencies {
  getConfig(): Promise<PeriodConfig>;
}

export interface Response {
  message: string | null;
}

export async function getStatus(_: never, dependencies: Dependencies): Promise<Response> {
  const config = await dependencies.getConfig();

  const currentDate = getCurrentDate();
  const currentMonthIndex = getMonthIndex(currentDate);

  const periodOpenDateRaw = getSafe(config.monthlyOpenDates, currentMonthIndex);
  const periodOpenDate = createDate(periodOpenDateRaw);

  const message = isActivePeriodOpen(currentDate, periodOpenDate)
    ? null
    : formatHandlebarsDateMessage(config.responseMessageFormat, { currentDate, periodOpenDate });

  return {
    message,
  };
}

export const main = wrappers.restJSON.wrap(getStatus, {
  getConfig: getConfigFromS3,
});
