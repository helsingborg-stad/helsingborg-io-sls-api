import axios from 'axios';
import https from 'https';

/**
 * Helper function to create an AXIOS request client
 *
 * Using the HTTPS node module as AXIOS agent
 *
 * https://github.com/axios/axios
 *
 * @param {obj} options See https.Agent https://nodejs.org/api/https.html#https_class_https_agent
 * @param {obj} headers Add headers to axios constructor
 * @param {number} timeout When request should time out (milliseconds)
 * @param {string} contentType
 * @returns AxiosInstance
 */
export const requestClient = (options, headers = {}, timeout = 5000, contentType = 'application/json') =>
    axios.create({
        httpsAgent: new https.Agent({ ...options }),
        headers: {
            'Content-Type': contentType,
            ...headers,
        },
        timeout,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
    });

export const call = (client, method, url, payload) => client[method](url, payload);
