import { Case, CaseValidatorContext } from './types';
import validatorList from '../validators';

export default function validateCases(userCaseList: Case[], context: CaseValidatorContext): void {
  userCaseList.forEach(userCase => {
    for (const validator of validatorList) {
      const data = validator(userCase, {
        getAge: context.getAge,
      });
      context.log(data, userCase);
    }
  });
}
