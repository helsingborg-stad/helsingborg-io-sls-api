import { dynamoQueryHandler } from './queryHandler';

import config from '../../../config';

import type { CaseQueryHandler } from '../../cases/types';

export const caseQuaryHandler: CaseQueryHandler = {
  async get(keys: { PK: string; SK: string }) {
    return dynamoQueryHandler.get(config.cases.tableName, keys);
  },
};
