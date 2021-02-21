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
    value: Joi.any().required(),
  })
);

const form = Joi.object({
  answers: caseAnswers.allow(),
  currentFromId: uuid.required(),
  currentPosition: Joi.object({
    index: Joi.number().required(),
    level: Joi.number().required(),
    currentMainStep: Joi.number().required(),
    currentMainStepIndex: Joi.number().required(),
  }).required(),
});

const caseValidationSchema = Joi.object({
  statusType: Joi.string().valid('notStarted').required(),
  currentFormId: uuid.required(),
  provider: caseProvider.required(),
  details: Joi.object().allow(),
  forms: Joi.object().pattern(/^/, [uuid.required(), form.required()]),
});

export default caseValidationSchema;
