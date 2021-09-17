import params from '../../../libs/params';
import config from '../../../config';

let bookingSsmParameters;

export default async () => {
  try {
    if (!bookingSsmParameters) {
      bookingSsmParameters = await params.read(config.booking.envsKeyName);
    }

    return bookingSsmParameters;
  } catch (error) {
    throw new Error(error);
  }
};
