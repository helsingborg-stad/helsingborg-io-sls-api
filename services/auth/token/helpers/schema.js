import Joi from 'joi';

// regex for matching a json web token string pattern (xxxx.xxxx.xxxx)
const matchJsonWebToken = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*$/;
const jwt = Joi.string().regex(matchJsonWebToken);

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
