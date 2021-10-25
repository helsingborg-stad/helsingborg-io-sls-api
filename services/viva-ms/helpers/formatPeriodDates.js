function formatTimestampToDate(timestamp) {
  const date = new Date(timestamp);
  let formattedDateString = date.getFullYear() + '-';

  if (date.getMonth() < 9) {
    formattedDateString += '0';
  }
  formattedDateString += date.getMonth() + 1;
  formattedDateString += '-';

  if (date.getDate() < 10) {
    formattedDateString += '0';
  }
  formattedDateString += date.getDate();

  return formattedDateString;
}

export default function formatPeriodDates(period) {
  const endDate = formatTimestampToDate(period.endDate);
  const startDate = formatTimestampToDate(period.startDate);
  return {
    endDate,
    startDate,
  };
}
