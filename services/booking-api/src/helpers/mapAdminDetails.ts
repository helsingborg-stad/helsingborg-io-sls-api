import to from 'await-to-js';
import booking, { GetHistoricalAttendeesAttributes } from './booking';

const emailToDetails = {};

const getEmailToDetailsMapping = async (
  emails: string[]
): Promise<Record<string, GetHistoricalAttendeesAttributes>> => {
  const promises = emails.map(async email => {
    if (!emailToDetails[email]) {
      const [, getAdministratorDetailsResponse] = await to(
        booking.getAdministratorDetails({ email })
      );
      emailToDetails[email] = getAdministratorDetailsResponse?.data?.data?.attributes ?? {
        Email: email,
      };
    }
  });
  await Promise.all(promises);
  return emailToDetails;
};

export default getEmailToDetailsMapping;
