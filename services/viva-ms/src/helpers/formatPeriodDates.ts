export function formatTimestampToDate(timestamp: number) {
  const [date] = new Date(timestamp).toISOString().split('T');
  return date;
}

export default function formatPeriodDates(
  period: { startDate: number; endDate: number } | undefined
) {
  if (!period) return undefined;
  const endDate = formatTimestampToDate(period.endDate);
  const startDate = formatTimestampToDate(period.startDate);
  return {
    endDate,
    startDate,
  };
}
