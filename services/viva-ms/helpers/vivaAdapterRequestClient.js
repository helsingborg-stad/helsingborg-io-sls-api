import * as request from '../../../libs/request';
import { to } from 'await-to-js';
import params from '../../../libs/params';
import config from '../../../config';
import hash from '../../../libs/helperHashEncode';

const VADA_SSM_PARAMS = params.read(config.vada.envsKeyName);

const REQUEST_TIMEOUT_IN_MS = 15000;

async function sendVivaAdapterRequest({ endpoint, method, body = undefined }) {
  const { vadaUrl, xApiKeyToken } = await VADA_SSM_PARAMS;

  const requestClient = request.requestClient(
    {},
    { 'x-api-key': xApiKeyToken },
    REQUEST_TIMEOUT_IN_MS
  );

  const [requestError, response] = await to(
    request.call(requestClient, method, `${vadaUrl}/${endpoint}`, body)
  );

  if (requestError) {
    if (requestError.response) {
      // The request was made and the server responded with a
      // status code that falls out of the range of 2xx
      throw requestError.response;
    } else if (requestError.request) {
      // The request was made but no response was received
      // `error.request` is an instance of http.ClientRequest in node.js
      throw requestError.request;
    } else {
      // Something happened in setting up the request that triggered an Error
      throw requestError.message;
    }
  }

  return response.data;
}

async function postCompletion(payload) {
  const { personalNumber, workflowId, attachments } = payload;

  const { hashSalt, hashSaltLength } = await VADA_SSM_PARAMS;

  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams = {
    endpoint: `applications/${hashedPersonalNumber}/completions`,
    method: 'post',
    body: {
      workflowId,
      attachments,
    },
  };

  const [sendVivaAdapterRequestError, response] = await to(sendVivaAdapterRequest(requestParams));
  if (sendVivaAdapterRequestError) {
    throw sendVivaAdapterRequestError;
  }

  return response;
}

async function getWorkflow(payload) {
  const { personalNumber, workflowId } = payload;

  const { hashSalt, hashSaltLength } = await VADA_SSM_PARAMS;

  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams = {
    endpoint: `mypages/${hashedPersonalNumber}/workflows/${workflowId}`,
    method: 'get',
  };

  const [sendVivaAdapterRequestError, response] = await to(sendVivaAdapterRequest(requestParams));
  if (sendVivaAdapterRequestError) {
    throw sendVivaAdapterRequestError;
  }

  return response.data;
}

async function getOfficers(personalNumber) {
  const { hashSalt, hashSaltLength } = await VADA_SSM_PARAMS;

  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams = {
    endpoint: `mypages/${hashedPersonalNumber}`,
    method: 'get',
  };

  const [sendVivaAdapterRequestError, response] = await to(sendVivaAdapterRequest(requestParams));
  if (sendVivaAdapterRequestError) {
    throw sendVivaAdapterRequestError;
  }

  return response.data.person.cases.vivacases.vivacase.officers;
}

async function postApplication(payload) {
  const { hashid, applicationType, answers, rawData, rawDataType, workflowId } = payload;
  const requestParams = {
    endpoint: 'applications',
    method: 'post',
    body: {
      applicationType,
      hashid,
      answers,
      rawData,
      rawDataType,
      workflowId,
    },
  };

  const [sendVivaAdapterRequestError, response] = await to(sendVivaAdapterRequest(requestParams));
  if (sendVivaAdapterRequestError) {
    throw sendVivaAdapterRequestError;
  }

  return response.data;
}

async function getApplication(personalNumber) {
  const { hashSalt, hashSaltLength } = await VADA_SSM_PARAMS;

  const hashedPersonalNumber = hash.encode(personalNumber, hashSalt, hashSaltLength);

  const requestParams = {
    endpoint: `mypages/${hashedPersonalNumber}`,
    method: 'get',
  };

  const [sendVivaAdapterRequestError, response] = await to(sendVivaAdapterRequest(requestParams));
  if (sendVivaAdapterRequestError) {
    throw sendVivaAdapterRequestError;
  }

  return response.data.person.application.vivaapplication;
}

export default {
  completion: { post: postCompletion },
  workflow: { get: getWorkflow },
  officers: { get: getOfficers },
  application: { post: postApplication, get: getApplication },
};
