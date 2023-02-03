import dayjs from 'dayjs';
import 'dayjs/locale/sv';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import advancedFormat from 'dayjs/plugin/advancedFormat';

import S3 from '../libs/S3';
import { wrappers } from '../libs/lambdaWrapper';
import handlebars from '../helpers/htmlTemplate';

dayjs.extend(isSameOrAfter);
dayjs.extend(advancedFormat);

export interface PeriodConfig {
  readonly responseMessageFormat: string;
  readonly monthlyOpenDates: string[];
}

export interface Dependencies {
  getConfig(): Promise<PeriodConfig>;
}

export interface Response {
  message: string | null;
}

export interface FormattingInput {
  currentDate: dayjs.Dayjs;
  periodOpenDate: dayjs.Dayjs;
}

async function getConfigFromS3(): Promise<PeriodConfig> {
  const s3File = await S3.getFile(process.env.BUCKET_NAME, 'config.json');
  return JSON.parse(s3File.Body);
}

function formatHandlebarsDateMessage(
  handlebarsInput: string,
  { currentDate, periodOpenDate }: FormattingInput
): string {
  const templateData = {
    nextMonth: currentDate.add(1, 'M').locale('sv').format('MMMM'),
    openDate: periodOpenDate.locale('sv').format('Do MMMM'),
  };
  return handlebars.compile(handlebarsInput)(templateData);
}

function getSafe<T>(list: T[], index: number): T {
  if (index >= list.length) {
    throw new Error(`Invalid index ${index} for list: ${list.join(', ')}`);
  }

  return list[index];
}

export async function getStatus(_: never, dependencies: Dependencies): Promise<Response> {
  const config = await dependencies.getConfig();

  const currentDate = dayjs();
  const currentMonthIndex = currentDate.month();
  const periodOpenDateRaw = getSafe(config.monthlyOpenDates, currentMonthIndex);
  const periodOpenDate = dayjs(periodOpenDateRaw);
  const isActivePeriodOpen = currentDate.isSameOrAfter(periodOpenDate);
  const message = isActivePeriodOpen
    ? null
    : formatHandlebarsDateMessage(config.responseMessageFormat, { currentDate, periodOpenDate });

  return {
    message,
  };
}

export const main = wrappers.restJSON.wrap(getStatus, {
  getConfig: getConfigFromS3,
});
