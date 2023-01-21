import { dynamoQueryHandler } from './queryHandler';
import config from '../../../../libs/config';
import type { CaseQueryHandler, CaseQueryParams, CaseItem } from '../../cases/types';

export const caseQuaryHandler: CaseQueryHandler = {
  async query(params: CaseQueryParams) {
    const { key: pk, value, index } = params;
    const casesTableName = `${config.resourcesStage}-${config.cases.tableName}`;
    return dynamoQueryHandler.query<CaseItem[]>(casesTableName, { pk, value, index });
  },
};
