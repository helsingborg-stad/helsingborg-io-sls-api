import uuid from 'uuid';

import CaseBuilder from './CaseBuilder';
import type { ICaseFactory } from './CaseFactory';

import { getStatusByType } from '../../libs/caseStatuses';
import {
  NOT_STARTED_VIVA,
  VIVA_CASE_CREATED,
  TWELVE_HOURS,
  CASE_PROVIDER_VIVA,
} from '../../libs/constants';
import { getFutureTimestamp, millisecondsToSeconds } from '../../libs/timestampHelper';
import createCaseHelper from '../createCase';

import type { CaseItem } from '../../types/caseItem';
import type { VivaMyPagesApplicationPeriod, VivaMyPagesVivaCase } from '../../types/vivaMyPages';

export interface Dependencies {
  getRecurringFormId(): Promise<string>;
}

export interface CreateCaseParams {
  workflowId: string | null;
  vivaMyPages: VivaMyPagesVivaCase;
  vivaPeriod: VivaMyPagesApplicationPeriod;
}

function createVivaCaseId({ idenclair }: VivaMyPagesVivaCase): string {
  const [, vivaCaseId] = idenclair.split('/');
  return vivaCaseId;
}

export default class EkbCaseFactory implements ICaseFactory<CreateCaseParams> {
  private dependencies: Dependencies;

  constructor(dependencies: Dependencies) {
    this.dependencies = dependencies;
  }

  async createCase({ workflowId, vivaMyPages, vivaPeriod }: CreateCaseParams): Promise<CaseItem> {
    const newId = uuid.v4();
    const formId = await this.dependencies.getRecurringFormId();
    const applicantPersonalNumber: string = createCaseHelper.stripNonNumericalCharacters(
      vivaMyPages.client.pnumber
    );

    return new CaseBuilder()
      .setId(newId)
      .setKeys(`USER#${applicantPersonalNumber}`, `CASE#${newId}`)
      .setGSI2PK(createCaseHelper.createGSI2PK())
      .setState(VIVA_CASE_CREATED)
      .setExpirationTime(millisecondsToSeconds(getFutureTimestamp(TWELVE_HOURS)))
      .setCreatedAt(Date.now())
      .setUpdatedAt(0)
      .setStatus(getStatusByType(NOT_STARTED_VIVA))
      .setProvider(CASE_PROVIDER_VIVA)
      .setForms({})
      .setPersons(createCaseHelper.getCasePersonList(vivaMyPages))
      .setDetails({
        vivaCaseId: createVivaCaseId(vivaMyPages),
        workflowId,
        period: createCaseHelper.getPeriodInMilliseconds(vivaPeriod),
        completions: null,
      })
      .setCurrentFormId(formId)

      .setContacts([])
      .build();
  }
}
