import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import 'dayjs/locale/sv';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import S3 from '../libs/S3';
import handlebars from './htmlTemplate';

dayjs.extend(isSameOrAfter);
dayjs.extend(advancedFormat);

type Date = Dayjs;

export interface PeriodConfig {
  readonly responseMessageFormat: string;
  readonly monthlyOpenDates: string[];
}

export interface FormattingInput {
  currentDate: Date;
  periodOpenDate: Date;
}

export async function getConfigFromS3(): Promise<PeriodConfig> {
  const s3File = await S3.getFile(process.env.BUCKET_NAME, 'config.json');
  return JSON.parse(s3File.Body);
}

export function getSafe<T>(list: T[], index: number): T {
  if (index >= list.length) {
    throw new Error(`Invalid index ${index} for list: ${list.join(', ')}`);
  }
  return list[index];
}

export function getCurrentDate(): Date {
  return dayjs();
}

export function createDate(date: string): Date {
  return dayjs(date);
}

export function getMonthIndex(date: Date): number {
  return date.month();
}

export function isActivePeriodOpen(currentDate: Date, periodOpenDate: Date): boolean {
  return currentDate.isSameOrAfter(periodOpenDate);
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
