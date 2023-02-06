import { wrappers } from '../libs/lambdaWrapper';
import { getCurrentPeriodInfo } from '../helpers/vivaPeriod';
import { getConfigFromS3, formatHandlebarsDateMessage } from '../helpers/vivaPeriod';

import type { PeriodConfig } from '../helpers/vivaPeriod';

export interface Dependencies {
  getConfig(): Promise<PeriodConfig>;
}

export interface Response {
  message: string | null;
}

export async function getStatus(_: never, dependencies: Dependencies): Promise<Response> {
  const config = await dependencies.getConfig();

  const { currentDate, periodOpenDate, isPeriodOpen } = getCurrentPeriodInfo(config);

  const message = isPeriodOpen
    ? null
    : formatHandlebarsDateMessage(config.responseMessageFormat, { currentDate, periodOpenDate });

  return {
    message,
  };
}

export const main = wrappers.restJSON.wrap(getStatus, {
  getConfig: getConfigFromS3,
});
