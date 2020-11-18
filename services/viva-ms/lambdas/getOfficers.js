import AWS from 'aws-sdk';
import to from 'await-to-js';
import { throwError } from '@helsingborg-stad/npm-api-error-handling';

import config from '../../../config';
import params from '../../../libs/params';
import hash from '../../../libs/helperHashEncode';

import { CASE_PROVIDER_VIVA } from '../../../libs/constants';
import * as request from '../../../libs/request';

const SSMParams = params.read(config.vada.envsKeyName);

/**
 * Handler reacting on event stream triggered by DynamoDB cases table
 * Fetches officeres information on an applicant via the Viva API adapter (VADA)
 * Sends the officers data into the eventbridge
 */
export const main = async event => {};
