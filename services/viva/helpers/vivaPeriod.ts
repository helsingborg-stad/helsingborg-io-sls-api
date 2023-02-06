import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import 'dayjs/locale/sv';

import S3 from '../libs/S3';
import handlebars from './htmlTemplate';

import type { Dayjs } from 'dayjs';

dayjs.extend(isSameOrAfter);
dayjs.extend(advancedFormat);

export interface PeriodConfig {
  readonly responseMessageFormat: string;
  readonly monthlyOpenDates: string[];
}

export interface PeriodInfo {
  currentDate: Dayjs;
  periodOpenDate: Dayjs;
  isPeriodOpen: boolean;
}

export interface FormattingInput {
  currentDate: Dayjs;
  periodOpenDate: Dayjs;
}

export function getSafe<T>(list: T[], index: number): T {
  if (index >= list.length) {
    throw new Error(`Invalid index ${index} for list: ${list.join(', ')}`);
  }
  return list[index];
}

export async function getConfigFromS3(): Promise<PeriodConfig> {
  const s3File = await S3.getFile(process.env.VIVA_PERIOD_BUCKET_NAME, 'config.json');
  return JSON.parse(s3File.Body);
}

export function formatHandlebarsDateMessage(
  handlebarsInput: string,
  { currentDate, periodOpenDate }: FormattingInput
): string {
  const templateData = {
    nextMonth: currentDate.add(1, 'M').locale('sv').format('MMMM'),
    openDate: periodOpenDate.locale('sv').format('Do MMMM'),
  };
  return handlebars.compile(handlebarsInput)(templateData);
}

export function getCurrentPeriodInfo(config: PeriodConfig): PeriodInfo {
  const currentDate = dayjs();
  const currentMonthIndex = currentDate.month();

  const periodOpenDateRaw = getSafe(config.monthlyOpenDates, currentMonthIndex);
  const periodOpenDate = dayjs(periodOpenDateRaw);

  const isPeriodOpen = currentDate.isSameOrAfter(periodOpenDate);

  return { currentDate, periodOpenDate, isPeriodOpen };
}
