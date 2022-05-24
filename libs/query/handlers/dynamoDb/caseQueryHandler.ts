import { dynamoQueryHandler } from './queryHandler';

import config from '../../../config';

import type { CaseQueryHandler } from '../../cases/types';

export const caseQuaryHandler: CaseQueryHandler = {
  async get(keys: { PK: string; SK: string }) {
    const casesTableName = `${config.resourceStage}-${config.cases.tableName}`;
    return dynamoQueryHandler.get(casesTableName, keys);
  },
};
