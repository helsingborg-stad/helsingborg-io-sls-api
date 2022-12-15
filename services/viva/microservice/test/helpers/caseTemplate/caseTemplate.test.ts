import createCaseTemplate from '../../../../api/cases/src/helpers/createCaseTemplate';

import type { CaseItem } from '../../../../api/cases/src/types/caseItem';

import MOCK_NEW_APPLICATION_CASE_ITEM_RAW from './mocks/newApplicationCaseItem.json';

const MOCK_NEW_APPLICATION_CASE_ITEM = MOCK_NEW_APPLICATION_CASE_ITEM_RAW as CaseItem;

describe('Case Template', () => {
  it('generates template data for new application', () => {
    const answers =
      MOCK_NEW_APPLICATION_CASE_ITEM.forms[MOCK_NEW_APPLICATION_CASE_ITEM.currentFormId].answers;
    const result = createCaseTemplate(MOCK_NEW_APPLICATION_CASE_ITEM, answers);

    expect(result).toMatchSnapshot();
  });
});
