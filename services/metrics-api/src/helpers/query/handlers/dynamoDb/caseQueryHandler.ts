import { dynamoQueryHandler } from './queryHandler';
import config from '../../../../libs/config';
import type { CasesQueryHandler, CasesQueryParams, CaseItem } from '../../cases/types';

export const casesQuaryHandler: CasesQueryHandler = {
  async query(params: CasesQueryParams) {
    const { key: pk, value, index } = params;
    const casesTableName = `${config.resourcesStage}-${config.cases.tableName}`;
    return dynamoQueryHandler.query<CaseItem[]>(casesTableName, { pk, value, index });
  },
};
