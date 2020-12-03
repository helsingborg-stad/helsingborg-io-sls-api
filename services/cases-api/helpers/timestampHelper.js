/**
 * @param {number} hours into the future
 * @returns {number} future date in milliseconds
 */
export function getFutureTimestamp(hours) {
  const days = Math.ceil(hours / 24);

  const date = new Date();
  const futureTimestamp = date.setDate(date.getDate() + days);

  return futureTimestamp;
}

/**
 * @param {number} ms
 */
export function millisecondsToSeconds(ms) {
  const seconds = Math.ceil(ms / 1000);
  return seconds;
}
