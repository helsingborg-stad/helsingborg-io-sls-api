import Joi from 'joi';

function caseSchema() {
  return Joi.object({
    id: Joi.string()
      .guid({
        version: ['uuidv4', 'uuidv5'],
      })
      .isRequired(),
    formId: Joi.string()
      .guid({
        version: ['uuidv4', 'uuidv5'],
      })
      .isRequired(),
    provider: Joi.string().valid('VIVA'),
    status: Joi.string().valid('ongoing', 'submitted'),
    details: Joi.object({
      period: Joi.object({
        endDate: Joi.number(),
        startDate: Joi.number(),
      }),
    }).unknown(true),
    answers: Joi.array().items(
      Joi.object({
        field: Joi.object().keys({
          id: Joi.string(),
          tags: Joi.array().items(Joi.string()),
        }),
        value: Joi.string(),
      })
    ),
  });
}

export default caseSchema;
