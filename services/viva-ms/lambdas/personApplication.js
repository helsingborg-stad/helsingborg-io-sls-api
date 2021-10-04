/* eslint-disable no-console */
import to from 'await-to-js';

import { putEvent } from '../../../libs/awsEventBridge';

import vivaAdapter from '../helpers/vivaAdapterRequestClient';

export async function main(event) {
  const clientUser = event.detail.user;

  const [getVivaPersonError, vivaPersonDetail] = await to(
    vivaAdapter.person.get(clientUser.personalNumber)
  );
  if (getVivaPersonError) {
    return console.error('(Viva-ms: personApplication) getVivaPersonError', getVivaPersonError);
  }

  const [putEventError] = await to(
    putEvent(
      {
        clientUser,
        vivaPersonDetail,
      },
      'getVivaPersonApplicationDetailSuccess',
      'vivaMs.personApplication'
    )
  );
  if (putEventError) {
    return console.error('(Viva-ms: personApplication) putEventError.', putEventError);
  }

  return true;
}
