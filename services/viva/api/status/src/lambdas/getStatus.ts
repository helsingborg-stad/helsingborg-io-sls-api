import { wrappers } from '../libs/lambdaWrapper';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';

import type { VivaApplicationsStatusItem } from '../types/vivaApplicationsStatus';

export interface LambdaRequest {
  personalNumber: string;
}

export interface Dependencies {
  getStatus: (personalNumber: string) => Promise<VivaApplicationsStatusItem[]>;
}

interface StatusPart {
  code: number;
  message: string;
}

export interface LambdaResponse {
  code: number;
  parts: StatusPart[];
}

export async function getStatus(
  { personalNumber }: LambdaRequest,
  dependencies: Dependencies
): Promise<LambdaResponse> {
  const statuses = await dependencies.getStatus(personalNumber);

  return {
    code: statuses.reduce((accumulated, { code }) => accumulated + code, 0),
    parts: statuses.map(({ code, description }) => ({ code, message: description })),
  };
}

export const main = wrappers.restJSON.wrap(getStatus, {
  getStatus: vivaAdapter.applications.status,
});
