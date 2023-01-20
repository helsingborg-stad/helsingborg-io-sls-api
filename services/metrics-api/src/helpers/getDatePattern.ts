import dayjs from 'dayjs';

export function getDatePattern(format: string): string {
  const dateByFormat = dayjs().format(format);
  return dateByFormat;
}
