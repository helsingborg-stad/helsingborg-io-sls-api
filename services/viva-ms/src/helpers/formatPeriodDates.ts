export function formatTimestampToDate(timestamp) {
  const [date] = new Date(timestamp).toISOString().split('T');
  return date;
}

export default function formatPeriodDates(period) {
  if (!period) return undefined;
  const endDate = formatTimestampToDate(period.endDate);
  const startDate = formatTimestampToDate(period.startDate);
  return {
    endDate,
    startDate,
  };
}
