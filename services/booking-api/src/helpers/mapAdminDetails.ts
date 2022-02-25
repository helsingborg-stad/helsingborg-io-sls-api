import to from 'await-to-js';
import booking, { GetHistoricalAttendeesAttributes } from './booking';

const emailToDetailsCollection: { [key: string]: GetHistoricalAttendeesAttributes } = {};

const fetchAdministratorDetails = async (email: string) => {
  const [, getAdministratorDetailsResponse] = await to(booking.getAdministratorDetails({ email }));

  return (
    getAdministratorDetailsResponse?.data?.data?.attributes ??
    ({
      Email: email,
    } as GetHistoricalAttendeesAttributes)
  );
};

const getEmailToDetailsMapping = async (
  emails: string[]
): Promise<Record<string, GetHistoricalAttendeesAttributes>> => {
  const promises = emails.map(async email => {
    if (!emailToDetailsCollection[email]) {
      emailToDetailsCollection[email] = await fetchAdministratorDetails(email);
    }
  });
  await Promise.all(promises);
  return emailToDetailsCollection;
};

export default getEmailToDetailsMapping;
