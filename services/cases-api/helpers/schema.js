import Joi from 'joi';
import { CASE_PROVIDER_VIVA } from '../../../libs/constants';

const uuid = Joi.string().guid({
  version: ['uuidv1', 'uuidv4', 'uuidv5'],
});

const caseProvider = Joi.string().valid(CASE_PROVIDER_VIVA);

const caseAnswers = Joi.array().items(
  Joi.object({
    field: Joi.object({
      id: uuid.required(),
      tags: Joi.array().items(Joi.string()).required(),
    }).required(),
    value: Joi.string().required(),
  })
);

const caseValidationSchema = Joi.object({
  formId: uuid.required(),
  provider: caseProvider.required(),
  answers: caseAnswers.allow(),
});

export default caseValidationSchema;
