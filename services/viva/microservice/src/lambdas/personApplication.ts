import log from '../libs/logs';

import putVivaMsEvent from '../helpers/putVivaMsEvent';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';

import type { CaseUser } from '../types/caseItem';
import type { VivaMyPages } from '../types/vivaMyPages';

export interface LambdaDetail {
  user: CaseUser;
}

export interface LambdaRequest {
  detail: LambdaDetail;
}

export interface PutEventParameters {
  clientUser: CaseUser;
  vivaPersonDetail: VivaMyPages;
}

export interface Dependencies {
  getVivaPerson: (personalNumber: string) => Promise<VivaMyPages>;
  putSuccessEvent: (parameters: PutEventParameters) => Promise<void>;
}

export async function personApplication(
  input: LambdaRequest,
  dependencies: Dependencies
): Promise<boolean> {
  const clientUser = input.detail.user;

  const vivaPersonDetail = await dependencies.getVivaPerson(clientUser.personalNumber);

  await dependencies.putSuccessEvent({
    clientUser,
    vivaPersonDetail,
  });

  return true;
}

export const main = log.wrap(event => {
  return personApplication(event, {
    getVivaPerson: vivaAdapter.person.get,
    putSuccessEvent: putVivaMsEvent.personDetailSuccess,
  });
});
