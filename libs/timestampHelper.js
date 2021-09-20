export function getFutureTimestamp(hours) {
  const milliseconds = hours * 60 * 60 * 1000;
  const futureTimestamp = Date.now() + milliseconds;
  return futureTimestamp;
}

export function millisecondsToSeconds(milliseconds) {
  const seconds = Math.ceil(milliseconds / 1000);
  return seconds;
}
