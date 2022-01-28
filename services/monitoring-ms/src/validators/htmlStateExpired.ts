import { Validator } from 'helpers/types';

const htmlStateExpired: Validator = (userCase, { getAge }) => {
  const testId = '  ';
  // Perform testing on the User case
  if (userCase.state === 'CASE_HTML_GENERATED') {
    if (getAge(userCase.updatedAt) > 7200000) {
      return {
        testId,
        level: 'error',
        message: 'State CASE_HTML_GENERATED not expected after 2 hours.',
      };
    }
  }
};

export default htmlStateExpired;
