import * as response from '../../../libs/response';

export const main = async event =>
  response.buildResponse(200, {
    type: 'vivaApplications',
    vivaResponse: 'Not implemented',
  });
