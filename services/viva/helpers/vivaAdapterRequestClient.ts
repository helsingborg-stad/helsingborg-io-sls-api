import { AxiosError, AxiosResponse } from 'axios';
import to from 'await-to-js';

import config from '../libs/config';
import * as request from '../libs/request';
import params from '../libs/params';
import hash from '../libs/helperHashEncode';

import type { VivaWorkflow } from '../types/vivaWorkflow';
import type { VivaMyPages } from '../types/vivaMyPages';
import type { VadaWorkflowCompletions } from '../types/vadaCompletions';

interface VadaErrorResponseData {
  error: {
    code: number;
    description: string;
    details: string;
  };
}

interface VadaResponse<TAttributes = VivaWorkflow | VivaMyPages | VadaWorkflowCompletions> {
  type: string;
  attibutes: TAttributes;
}

interface RequestClientResponse<TAttributesData> {
  data: TAttributesData;
}

const REQUEST_TIMEOUT_IN_MS = 30000;

async function sendVivaAdapterRequest<TVadaResponse>({ endpoint, method, body = undefined }) {
  const { vadaUrl, xApiKeyToken } = await getVivaSsmParams();
  const requestClient = request.requestClient(
    {},
    { 'x-api-key': xApiKeyToken },
    REQUEST_TIMEOUT_IN_MS
  );

  const [requestError, response]: [
    AxiosError<VadaErrorResponseData, unknown> | null,
    AxiosResponse<RequestClientResponse<TVadaResponse>, unknown> | undefined
  ] = await to(request.call(requestClient, method, `${vadaUrl}/${endpoint}`, body));

  if (requestError) {
    if (requestError.response) {
      // The request was made and the server responded with a
      // status code that falls out of the range of 2xx
      throw {
        vadaResponse: requestError.response.data,
        status: requestError.response.status,
        headers: requestError.response.headers,
      };
    } else if (requestError.request) {
      // The request was made but no response was received
      // `error.request` is an instance of http.ClientRequest in node.js
      throw requestError.request;
    } else {
      // Something happened in setting up the request that triggered an Error
      throw requestError.message;
    }
  }

  return response;
}

async function postCompletion(payload) {
  const { personalNumber, workflowId, attachments } = payload;
  const { hashSalt, hashSaltLength } = await getVivaSsmParams();
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams = {
    endpoint: `applications/${hashedPersonalNumber}/completions`,
    method: 'post',
    body: {
      workflowId,
      attachments,
    },
  };

  const response = await sendVivaAdapterRequest(requestParams);
  return response.data;
}

async function getLatestWorkflow(personalNumber: number): Promise<VadaResponse<VivaWorkflow>> {
  const { hashSalt, hashSaltLength } = await getVivaSsmParams();
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams = {
    endpoint: `mypages/${hashedPersonalNumber}/workflows/latest`,
    method: 'get',
  };

  const response = await sendVivaAdapterRequest<VadaResponse<VivaWorkflow>>(requestParams);
  return response.data;
}

async function getWorkflowCompletions(payload) {
  const { personalNumber, workflowId } = payload;
  const { hashSalt, hashSaltLength } = await getVivaSsmParams();
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams = {
    endpoint: `mypages/${hashedPersonalNumber}/workflows/${workflowId}/completions`,
    method: 'get',
  };

  const response = await sendVivaAdapterRequest(requestParams);
  return response.data;
}

async function getWorkflow(payload) {
  const { personalNumber, workflowId } = payload;
  const { hashSalt, hashSaltLength } = await getVivaSsmParams();
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams = {
    endpoint: `mypages/${hashedPersonalNumber}/workflows/${workflowId}`,
    method: 'get',
  };

  const response = await sendVivaAdapterRequest(requestParams);
  return response.data;
}

async function getOfficers(personalNumber) {
  const { hashSalt, hashSaltLength } = await getVivaSsmParams();
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams = {
    endpoint: `mypages/${hashedPersonalNumber}`,
    method: 'get',
  };

  const response = await sendVivaAdapterRequest(requestParams);
  return response.data.person.cases.vivacases.vivacase.officers;
}

async function postApplication(payload) {
  const {
    personalNumber,
    applicationType,
    answers,
    rawData,
    rawDataType,
    workflowId,
    attachments,
  } = payload;
  const { hashSalt, hashSaltLength } = await getVivaSsmParams();
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams = {
    endpoint: 'applications',
    method: 'post',
    body: {
      applicationType,
      hashid: hashedPersonalNumber,
      answers,
      rawData,
      rawDataType,
      workflowId,
      attachments,
    },
  };

  const response = await sendVivaAdapterRequest(requestParams);
  return response.data;
}

async function getApplication(personalNumber) {
  const { hashSalt, hashSaltLength } = await getVivaSsmParams();
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams = {
    endpoint: `mypages/${hashedPersonalNumber}`,
    method: 'get',
  };

  const response = await sendVivaAdapterRequest(requestParams);
  return response.data.person.application.vivaapplication;
}

async function getPerson(personalNumber) {
  const { hashSalt, hashSaltLength } = await getVivaSsmParams();
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams = {
    endpoint: `mypages/${hashedPersonalNumber}`,
    method: 'get',
  };

  const response = await sendVivaAdapterRequest(requestParams);
  return {
    case: response.data.person.cases.vivacases.vivacase,
    application: response.data.person.application.vivaapplication,
  };
}

async function getApplicationStatus(personalNumber) {
  const { hashSalt, hashSaltLength } = await getVivaSsmParams();
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams = {
    endpoint: `applications/${hashedPersonalNumber}/status`,
    method: 'get',
  };

  const response = await sendVivaAdapterRequest(requestParams);
  return response.data;
}

function getVivaSsmParams() {
  return params.read(config.vada.envsKeyName);
}

export default {
  completion: { post: postCompletion },
  workflow: {
    get: getWorkflow,
    getLatest: getLatestWorkflow,
    getCompletions: getWorkflowCompletions,
  },
  officers: { get: getOfficers },
  person: { get: getPerson },
  application: {
    post: postApplication,
    get: getApplication,
    status: getApplicationStatus,
  },
};
