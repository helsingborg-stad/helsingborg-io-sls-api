import log from '../libs/logs';
import { putEvent } from '../libs/awsEventBridge';
import civilRegistrationProvider from '../helpers/provider';
import type { CivilRegistrationProvider, CaseUser } from '../helpers/types';

type SuccessEvent = LambdaDetail;

export interface LambdaDetail {
  readonly user: CaseUser;
}

export interface Input {
  readonly detail: LambdaDetail;
}

export interface Dependencies {
  provider: CivilRegistrationProvider;
  triggerEvent: (params: SuccessEvent, detailType: string, source: string) => Promise<void>;
}

export async function pollUser(input: Input, dependencies: Dependencies): Promise<boolean> {
  const user = await dependencies.provider.getUserInfo(input.detail.user.personalNumber);
  await dependencies.triggerEvent(
    {
      user,
    },
    'navetMsPollUserSuccess',
    'navetMs.pollUser'
  );
  return true;
}

export const main = log.wrap(async event => {
  return pollUser(event, {
    provider: civilRegistrationProvider,
    triggerEvent: putEvent,
  });
});
