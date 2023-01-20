import { dynamoQueryHandler } from './queryHandler';
import config from '../../../../libs/config';
import type { CaseQueryHandler, QueryParams, CaseItem } from '../../cases/types';

export const caseQuaryHandler: CaseQueryHandler = {
  async query(params: QueryParams) {
    const casesTableName = `${config.resourcesStage}-${config.cases.tableName}`;
    return dynamoQueryHandler.query<CaseItem[]>(casesTableName, params);
  },
};
