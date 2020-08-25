/**
 * Handler function for reacting to a stream from the cases table.
 */
export const main = async event => {
  // eslint-disable-next-line no-console
  console.log('trigger stream');

  const [record] = event.Records;
  // eslint-disable-next-line no-console
  console.log(record);

  return null;
};
