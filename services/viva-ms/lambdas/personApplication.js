/* eslint-disable no-console */
import to from 'await-to-js';

import putVivaMsEvent from '../helpers/putVivaMsEvent';

import vivaAdapter from '../helpers/vivaAdapterRequestClient';

export async function main(event) {
  const clientUser = event.detail.user;

  const [getVivaPersonError, vivaPersonDetail] = await to(
    vivaAdapter.person.get(clientUser.personalNumber)
  );
  if (getVivaPersonError) {
    console.error(
      '(Viva-ms: personApplication) getVivaPersonError',
      getVivaPersonError
    );
    return false;
  }

  const [putEventError] = await to(
    putVivaMsEvent.personDetailSuccess({
      clientUser,
      vivaPersonDetail,
    })
  );
  if (putEventError) {
    console.error('(Viva-ms: personApplication) putEventError.', putEventError);
    return false;
  }

  return true;
}
