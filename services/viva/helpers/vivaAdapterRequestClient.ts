import type { AxiosError, AxiosResponse } from 'axios';
import to from 'await-to-js';

import config from '../libs/config';
import * as request from '../libs/request';
import params from '../libs/params';
import hash from '../libs/helperHashEncode';

import type { VivaWorkflow } from '../types/vivaWorkflow';
import type {
  VadaWorkflowResponse,
  VadaLatestWorkflowResponse,
  VadaApplicationsStatusResponse,
  VadaCompletionsResponse,
  VadaMyPagesReposnse,
} from '../types/vadaResponse';
import type {
  VivaMyPagesVivaCase,
  VivaOfficer,
  VivaMyPagesApplication,
  VivaMyPagesVivaApplication,
  VivaMyPagesCases,
} from '../types/vivaMyPages';
import type { VivaApplicationsStatusItem } from '../types/vivaApplicationsStatus';
import type { VadaWorkflowCompletions } from '../types/vadaCompletions';
import type { VivaAttachment } from '../types/vivaAttachment';
import type { CaseFormAnswer } from '../types/caseItem';

interface ConfigParams {
  vadaUrl: string;
  xApiKeyToken: string;
  hashSalt: string;
  hashSaltLength: number;
}

interface AdapterError {
  code: number;
  description: string;
  details: string;
}

interface AdapterErrorResponseData {
  error: AdapterError;
}

interface AdapterResponseData<
  T =
    | VadaLatestWorkflowResponse
    | VadaWorkflowResponse
    | VadaCompletionsResponse
    | VadaApplicationsStatusResponse
    | VivaMyPagesCases
    | VivaMyPagesApplication
    | unknown
> {
  type: string;
  attributes: T;
}

interface AdapterRequest<Body = unknown> {
  endpoint: string;
  method: string;
  body?: Body;
}

export interface GetWorkflowPayload {
  personalNumber: string;
  workflowId: string;
}

export interface PostCompletionsPayload {
  personalNumber: string;
  workflowId: string;
  attachments: VivaAttachment[];
}

export interface PostApplicationsPayload {
  personalNumber: string;
  applicationType: string;
  answers: CaseFormAnswer[];
  rawData: string;
  rawDataType: string;
  workflowId: string;
  attachments: VivaAttachment[];
}

interface AdapterCompletionsRequestBody {
  workflowId: string;
  attachments: VivaAttachment[];
}

interface AdapterPostApplicationsBody {
  hashid: string;
  applicationType: string;
  answers: CaseFormAnswer[];
  rawData: string;
  rawDataType: string;
  workflowId: string;
  attachments: VivaAttachment[];
}

interface PostCompletionsResponse {
  status: string;
}

const REQUEST_TIMEOUT_IN_MS = 30000;

async function sendVivaAdapterRequest<Attributes>({
  endpoint,
  method,
  body = undefined,
}: AdapterRequest): Promise<
  AxiosResponse<AdapterResponseData<Attributes>> | Record<string, never>
> {
  const { vadaUrl, xApiKeyToken } = await getVivaSsmParams();
  const requestClient = request.requestClient(
    {},
    { 'x-api-key': xApiKeyToken },
    REQUEST_TIMEOUT_IN_MS
  );

  const [requestError, response] = await to<
    AxiosResponse<AdapterResponseData<Attributes>>,
    AxiosError<AdapterErrorResponseData>
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

async function getLatestWorkflow(personalNumber: string): Promise<VivaWorkflow> {
  const { hashSalt, hashSaltLength } = await getVivaSsmParams();
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams: AdapterRequest = {
    endpoint: `mypages/${hashedPersonalNumber}/workflows/latest`,
    method: 'get',
  };

  const response = await sendVivaAdapterRequest<VadaLatestWorkflowResponse>(requestParams);
  return response.data.attributes.latestWorkflow;
}

async function getWorkflow(payload: GetWorkflowPayload): Promise<VivaWorkflow> {
  const { personalNumber, workflowId } = payload;
  const { hashSalt, hashSaltLength } = await getVivaSsmParams();
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams: AdapterRequest = {
    endpoint: `mypages/${hashedPersonalNumber}/workflows/${workflowId}`,
    method: 'get',
  };

  const response = await sendVivaAdapterRequest<VadaWorkflowResponse>(requestParams);
  return response.data.attributes.workflow;
}

async function getWorkflowCompletions(
  payload: GetWorkflowPayload
): Promise<VadaWorkflowCompletions> {
  const { personalNumber, workflowId } = payload;
  const { hashSalt, hashSaltLength } = await getVivaSsmParams();
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams: AdapterRequest = {
    endpoint: `mypages/${hashedPersonalNumber}/workflows/${workflowId}/completions`,
    method: 'get',
  };

  const response = await sendVivaAdapterRequest<VadaCompletionsResponse>(requestParams);
  return response.data.attributes.completions;
}

async function getOfficers(personalNumber: string): Promise<VivaOfficer[] | VivaOfficer> {
  const requestParams = await createVivaMyPagesAdapterRequest(personalNumber);
  const response = await sendVivaAdapterRequest<VadaMyPagesReposnse>(requestParams);
  return (
    response.data.attributes.cases.vivacases.vivacase.officers?.officer ?? ([] as VivaOfficer[])
  );
}

async function getMyPages(personalNumber: string): Promise<VivaMyPagesVivaCase> {
  const requestParams = await createVivaMyPagesAdapterRequest(personalNumber);
  const response = await sendVivaAdapterRequest<VadaMyPagesReposnse>(requestParams);
  return response.data.attributes.cases.vivacases.vivacase;
}

async function getApplication(personalNumber: string): Promise<VivaMyPagesVivaApplication> {
  const requestParams = await createVivaMyPagesAdapterRequest(personalNumber);
  const response = await sendVivaAdapterRequest<VadaMyPagesReposnse>(requestParams);
  return response.data.attributes.application.vivaapplication;
}

async function getApplicationsStatus(
  personalNumber: string
): Promise<VivaApplicationsStatusItem[]> {
  const { hashSalt, hashSaltLength } = await getVivaSsmParams();
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams: AdapterRequest = {
    endpoint: `applications/${hashedPersonalNumber}/status`,
    method: 'get',
  };

  const response = await sendVivaAdapterRequest<VadaApplicationsStatusResponse>(requestParams);
  return response.data.attributes.status;
}

async function createVivaMyPagesAdapterRequest(personalNumber: string): Promise<AdapterRequest> {
  const { hashSalt, hashSaltLength } = await getVivaSsmParams();
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  return {
    endpoint: `mypages/${hashedPersonalNumber}`,
    method: 'get',
  };
}

function getVivaSsmParams(): Promise<ConfigParams> {
  return params.read(config.vada.envsKeyName);
}

async function postApplications(
  payload: PostApplicationsPayload
): Promise<Record<string, unknown>> {
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

  const requestParams: AdapterRequest<AdapterPostApplicationsBody> = {
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

  const response = (await sendVivaAdapterRequest(requestParams)) as AxiosResponse;
  return response.data;
}

async function postCompletions(payload: PostCompletionsPayload): Promise<PostCompletionsResponse> {
  const { personalNumber, workflowId, attachments } = payload;
  const { hashSalt, hashSaltLength } = await getVivaSsmParams();
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams: AdapterRequest<AdapterCompletionsRequestBody> = {
    endpoint: `applications/${hashedPersonalNumber}/completions`,
    method: 'post',
    body: {
      workflowId,
      attachments,
    },
  };

  const response = (await sendVivaAdapterRequest(requestParams)) as AxiosResponse;
  return response.data;
}

export default {
  completions: { post: postCompletions },
  workflow: {
    get: getWorkflow,
    getLatest: getLatestWorkflow,
    getCompletions: getWorkflowCompletions,
  },
  officers: { get: getOfficers },
  myPages: { get: getMyPages },
  applications: {
    post: postApplications,
    get: getApplication,
    status: getApplicationsStatus,
  },
};
