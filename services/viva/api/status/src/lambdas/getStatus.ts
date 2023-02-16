import { wrappers } from '../libs/lambdaWrapper';
import vivaAdapter from '../helpers/vivaAdapterRequestClient';

import type { VivaApplicationsStatusItem } from '../types/vivaApplicationsStatus';

export interface Input {
  personalNumber: string;
}

export interface Dependencies {
  getStatus: (personalNumber: string) => Promise<VivaApplicationsStatusItem[]>;
}

export interface Response {
  code: number;
  parts: {
    code: number;
    message: string;
  }[];
}

export async function getStatus(
  { personalNumber }: Input,
  dependencies: Dependencies
): Promise<Response> {
  const statuses = await dependencies.getStatus(personalNumber);

  return {
    code: statuses.reduce((accumulated, status) => accumulated + status.code, 0),
    parts: statuses.map(status => ({ code: status.code, message: status.description })),
  };
}

export const main = wrappers.restJSON.wrap(getStatus, {
  getStatus: vivaAdapter.applications.status,
});
