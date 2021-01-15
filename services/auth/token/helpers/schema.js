import Joi from 'joi';

const jwt = Joi.string().regex(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*$/);

const tokenValidationSchema = Joi.object({
  grant_type: Joi.string().valid('authorization_code', 'refresh_token').required(),
  code: jwt.when('grant_type', {
    is: 'authorization_code',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  refresh_token: jwt.when('grant_type', {
    is: 'refresh_token',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
});

export default tokenValidationSchema;
