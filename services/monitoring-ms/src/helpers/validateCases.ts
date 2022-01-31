import { CaseValidatorContext } from './types';
import validatorList from '../validators';

export default async function validateCases(context: CaseValidatorContext): Promise<void> {
  const { Items: userCaseList } = await context.getCases();

  userCaseList.forEach(userCase => {
    for (const validator of validatorList) {
      const data = validator(userCase, {
        getAge: context.getAge,
      });
      if (data) {
        context.log(data, userCase);
      }
    }
  });
}
