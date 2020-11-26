import Joi from 'joi';
import { CASE_PROVIDER_VIVA } from '../../../libs/constants';

const caseFormId = Joi.string().guid({
  version: ['uuidv4', 'uuidv5'],
});

const caseProvider = Joi.string().valid(CASE_PROVIDER_VIVA);

const createCaseValidationSchema = Joi.object({
  formId: caseFormId.required(),
  provider: caseProvider.required(),
});

export default createCaseValidationSchema;
