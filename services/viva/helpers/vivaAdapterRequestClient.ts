import { AxiosError, AxiosResponse } from 'axios';
import to from 'await-to-js';

import config from '../libs/config';
import * as request from '../libs/request';
import params from '../libs/params';
import hash from '../libs/helperHashEncode';

import type { VadaWorkflow, VivaWorkflow } from '../types/vivaWorkflow';
import type {
  VivaMyPages,
  VivaMyPagesVivaCase,
  VivaOfficer,
  VivaMyPagesApplication,
  VivaMyPagesVivaApplication,
} from '../types/vivaMyPages';
import type {
  VadaApplicationsStatus,
  VivaApplicationsStatusItem,
} from '../types/vivaApplicationsStatus';
import type { VadaCompletions, VadaWorkflowCompletions } from '../types/vadaCompletions';
import type { CaseAttachment } from '../helpers/attachment';
import type { CaseFormAnswer } from '../types/caseItem';

interface ConfigParams {
  vadaUrl: string;
  xApiKeyToken: string;
  hashSalt: string;
  hashSaltLength: number;
}

interface AdapterErrorResponseData {
  error: {
    code: number;
    description: string;
    details: string;
  };
}

interface AdapterResponseData<
  T =
    | VadaWorkflow
    | VivaMyPages
    | VivaMyPagesApplication
    | VadaCompletions
    | VadaApplicationsStatus
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

interface GetWorkflowPayload {
  personalNumber: number;
  workflowId: string;
}

interface PostCompletionsPayload {
  personalNumber: number;
  workflowId: string;
  attachments: CaseAttachment[];
}

export interface PostApplicationsPayload {
  personalNumber: number;
  applicationType: string;
  answers: CaseFormAnswer[];
  rawData: string;
  rawDataType: string;
  workflowId: string;
  attachments: CaseAttachment[];
}

interface AdapterCompletionsRequestBody {
  workflowId: string;
  attachments: CaseAttachment[];
}

interface AdapterPostApplicationsBody {
  hashid: string;
  applicationType: string;
  answers: CaseFormAnswer[];
  rawData: string;
  rawDataType: string;
  workflowId: string;
  attachments: CaseAttachment[];
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

async function getLatestWorkflow(personalNumber: number): Promise<VivaWorkflow> {
  const { hashSalt, hashSaltLength } = await getVivaSsmParams();
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams: AdapterRequest = {
    endpoint: `mypages/${hashedPersonalNumber}/workflows/latest`,
    method: 'get',
  };

  const response = await sendVivaAdapterRequest<VadaWorkflow>(requestParams);
  return response.data.attributes.workflow;
}

async function getWorkflow(payload: GetWorkflowPayload): Promise<VivaWorkflow> {
  const { personalNumber, workflowId } = payload;
  const { hashSalt, hashSaltLength } = await getVivaSsmParams();
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams: AdapterRequest = {
    endpoint: `mypages/${hashedPersonalNumber}/workflows/${workflowId}`,
    method: 'get',
  };

  const response = await sendVivaAdapterRequest<VadaWorkflow>(requestParams);
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

  const response = await sendVivaAdapterRequest<VadaCompletions>(requestParams);
  return response.data.attributes.completions;
}

async function getOfficers(personalNumber: number): Promise<VivaOfficer[] | VivaOfficer> {
  const requestParams = await createVivaMyPagesAdapterRequest(personalNumber);
  const response = await sendVivaAdapterRequest<VivaMyPages>(requestParams);
  return response.data.attributes.cases.vivacases.vivacase.officers?.officer ?? [];
}

async function getMyPages(personalNumber: number): Promise<VivaMyPagesVivaCase> {
  const requestParams = await createVivaMyPagesAdapterRequest(personalNumber);
  const response = await sendVivaAdapterRequest<VivaMyPages>(requestParams);
  return response.data.attributes.cases.vivacases.vivacase;
}

async function getApplication(personalNumber: number): Promise<VivaMyPagesVivaApplication> {
  const requestParams = await createVivaMyPagesAdapterRequest(personalNumber);
  const response = await sendVivaAdapterRequest<VivaMyPagesApplication>(requestParams);
  return response.data.attributes.vivaapplication;
}

async function getApplicationsStatus(
  personalNumber: number
): Promise<VivaApplicationsStatusItem[]> {
  const { hashSalt, hashSaltLength } = await getVivaSsmParams();
  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams: AdapterRequest = {
    endpoint: `applications/${hashedPersonalNumber}/status`,
    method: 'get',
  };

  const response = await sendVivaAdapterRequest<VadaApplicationsStatus>(requestParams);
  return response.data.attributes.status;
}

async function createVivaMyPagesAdapterRequest(personalNumber: number): Promise<AdapterRequest> {
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
