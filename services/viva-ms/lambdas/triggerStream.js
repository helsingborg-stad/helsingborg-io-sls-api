/* eslint-disable no-console */
/**
 * Handler function for reacting to a stream from the cases table.
 */
export const main = async (event, context) => {
  console.log('trigger stream');

  console.log(context);

  const [record] = event.Records;
  console.log(record);

  return null;
};
