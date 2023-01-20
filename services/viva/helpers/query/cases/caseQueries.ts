import { caseQuaryHandler } from '../handlers/dynamoDb/caseQueryHandler';

import type { CaseQueryHandler } from './types';

export const caseQueries: CaseQueryHandler = {
  async get(keys: { PK: string; SK: string }) {
    return caseQuaryHandler.get({
      PK: keys.PK,
      SK: keys.SK,
    });
  },
};
