import { AxiosError, AxiosResponse } from 'axios';
import to from 'await-to-js';

import config from '../libs/config';
import * as request from '../libs/request';
import params from '../libs/params';
import hash from '../libs/helperHashEncode';

import type { VivaWorkflow } from '../types/vivaWorkflow';
import type {
  VivaMyPages,
  VivaOfficersOfficer,
  VivaMyPagesPersonApplication,
  VivaApplicationStatus,
} from '../types/vivaMyPages';
import type { VadaWorkflowCompletions } from '../types/vadaCompletions';

interface VadaErrorResponseData {
  error: {
    code: number;
    description: string;
    details: string;
  };
}

interface VadaResponseData<T = VivaWorkflow | VadaWorkflowCompletions | unknown> {
  type: string;
  attibutes: T;
}

interface VadaMyPagesResponse {
  person: VivaMyPages;
}

interface AdapterRequest<Body = unknown> {
  endpoint: string;
  method: string;
  body?: Body;
}

interface ConfigParams {
  vadaUrl: string;
  xApiKeyToken: string;
  hashSalt: string;
  hashSaltLength: number;
}

interface CompletionPostPayload {
  personalNumber: number;
  workflowId: string;
  attachments: Record<string, unknown>[];
}

interface WorkflowGetPayload {
  personalNumber: number;
  workflowId: string;
}

interface ApplicationPostPayload {
  personalNumber: number;
  applicationType: string;
  answers: Record<string, unknown>[];
  rawData: string;
  rawDataType: string;
  workflowId: string;
  attachments: Record<string, unknown>[];
}

interface AdapterCompletionRequestBody {
  workflowId: string;
  attachments: Record<string, unknown>[];
}

const REQUEST_TIMEOUT_IN_MS = 30000;

async function sendVivaAdapterRequest<T>({
  endpoint,
  method,
  body = undefined,
}: AdapterRequest): Promise<AxiosResponse<VadaResponseData<T>, unknown> | Record<string, never>> {
  const { vadaUrl, xApiKeyToken } = await getVivaSsmParams();
  const requestClient = request.requestClient(
    {},
    { 'x-api-key': xApiKeyToken },
    REQUEST_TIMEOUT_IN_MS
  );

  const [requestError, response] = await to<
    AxiosResponse<VadaResponseData<T>>,
    AxiosError<VadaErrorResponseData>
  >(request.call(requestClient, method, `${vadaUrl}/${endpoint}`, body));

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

  return response ?? {};
}

async function postCompletion(payload: CompletionPostPayload) {
  const { personalNumber, workflowId, attachments } = payload;
  const { hashSalt, hashSaltLength } = await getVivaSsmParams();
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams: AdapterRequest<AdapterCompletionRequestBody> = {
    endpoint: `applications/${hashedPersonalNumber}/completions`,
    method: 'post',
    body: {
      workflowId,
      attachments,
    },
  };

  const response = (await sendVivaAdapterRequest(requestParams)) as unknown as AxiosResponse;
  return response.data;
}

async function getLatestWorkflow(personalNumber: number): Promise<VivaWorkflow> {
  const { hashSalt, hashSaltLength } = await getVivaSsmParams();
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams: AdapterRequest = {
    endpoint: `mypages/${hashedPersonalNumber}/workflows/latest`,
    method: 'get',
  };

  const response = await sendVivaAdapterRequest<VivaWorkflow>(requestParams);
  return response.data.attibutes;
}

async function getWorkflowCompletions(
  payload: WorkflowGetPayload
): Promise<VadaWorkflowCompletions> {
  const { personalNumber, workflowId } = payload;
  const { hashSalt, hashSaltLength } = await getVivaSsmParams();
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams = {
    endpoint: `mypages/${hashedPersonalNumber}/workflows/${workflowId}/completions`,
    method: 'get',
  };

  const response = await sendVivaAdapterRequest<VadaWorkflowCompletions>(requestParams);
  return response.data.attibutes;
}

async function getWorkflow(payload: WorkflowGetPayload): Promise<VivaWorkflow> {
  const { personalNumber, workflowId } = payload;
  const { hashSalt, hashSaltLength } = await getVivaSsmParams();
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams = {
    endpoint: `mypages/${hashedPersonalNumber}/workflows/${workflowId}`,
    method: 'get',
  };

  const response = await sendVivaAdapterRequest<VivaWorkflow>(requestParams);
  return response.data.attibutes;
}

async function getOfficers(personalNumber: number): Promise<VivaOfficersOfficer> {
  const { hashSalt, hashSaltLength } = await getVivaSsmParams();
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams = {
    endpoint: `mypages/${hashedPersonalNumber}`,
    method: 'get',
  };

  const response = (await sendVivaAdapterRequest(
    requestParams
  )) as unknown as AxiosResponse<VadaMyPagesResponse>;
  return response.data.person.cases.vivacases.vivacase.officers;
}

async function postApplication(payload: ApplicationPostPayload) {
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

  const response = (await sendVivaAdapterRequest(requestParams)) as unknown as AxiosResponse;
  return response.data;
}

async function getApplication(personalNumber: number): Promise<VivaMyPagesPersonApplication> {
  const { hashSalt, hashSaltLength } = await getVivaSsmParams();
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams = {
    endpoint: `mypages/${hashedPersonalNumber}`,
    method: 'get',
  };

  const response = (await sendVivaAdapterRequest(requestParams)) as unknown as AxiosResponse;
  return response.data.person.application.vivaapplication;
}

async function getPerson(personalNumber: number): Promise<VivaMyPages> {
  const { hashSalt, hashSaltLength } = await getVivaSsmParams();
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams = {
    endpoint: `mypages/${hashedPersonalNumber}`,
    method: 'get',
  };

  const response = (await sendVivaAdapterRequest(requestParams)) as unknown as AxiosResponse;
  return {
    cases: response.data.person.cases.vivacases.vivacase,
    application: response.data.person.application.vivaapplication,
  };
}

async function getApplicationStatus(personalNumber: number): Promise<VivaApplicationStatus[]> {
  const { hashSalt, hashSaltLength } = await getVivaSsmParams();
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams = {
    endpoint: `applications/${hashedPersonalNumber}/status`,
    method: 'get',
  };

  const response = (await sendVivaAdapterRequest(requestParams)) as unknown as AxiosResponse;
  return response.data;
}

function getVivaSsmParams(): Promise<ConfigParams> {
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
