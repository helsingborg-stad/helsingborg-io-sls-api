import { Validator } from '../helpers/types';

const testTemplate: Validator = (/*userCase, context*/) => {
  const testId = '<Your test id here>';
  // Perform testing on the User case
  // ....

  // Return error statement
  return {
    testId,
    level: 'error',
    message: '<Your error statement here',
  };
};

export default testTemplate;
