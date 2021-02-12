import Joi from 'joi';
import { CASE_PROVIDER_VIVA } from '../../../libs/constants';

const uuid = Joi.string().guid({
  version: ['uuidv1', 'uuidv4', 'uuidv5'],
});

const caseProvider = Joi.string().valid(CASE_PROVIDER_VIVA);

const caseAnswers = Joi.array().items(
  Joi.object({
    field: Joi.object({
      id: Joi.string().required(),
      tags: Joi.array().items(Joi.string()).required(),
    }).required(),
    value: Joi.any(),
  })
);

const caseForm = Joi.object({
  answers: caseAnswers.allow(),
  currentFromId: uuid.required(),
  currentPosition: Joi.object({
    index: Joi.number().required(),
    level: Joi.number().required(),
    currentMainStep: Joi.number().required(),
    currentMainStepIndex: Joi.number().required(),
  }).required(),
});

const status = Joi.object({
  type: Joi.string().required(),
  name: Joi.string().required(),
  description: Joi.string().required(),
});

const caseValidationSchema = Joi.object({
  provider: caseProvider.required(),
  details: Joi.object().allow(),
  status: status.required(),
  forms: Joi.object().pattern(Joi.string(), Joi.object().concat(caseForm)),
});

export default caseValidationSchema;
