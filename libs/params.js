import SSM from 'aws-sdk/clients/ssm';
import to from 'await-to-js';

const ssm = new SSM({ apiVersion: '2014-11-06' });

const parameterCacheCollection = {};

async function read(name) {
  if (parameterCacheCollection[name]) {
    return parameterCacheCollection[name];
  }

  const requestParameters = {
    Name: name,
    WithDecryption: true,
  };

  const [ssmError, ssmParameters] = await to(
    ssm.getParameter(requestParameters).promise()
  );
  if (ssmError) {
    throw ssmError;
  }

  const parameter = JSON.parse(ssmParameters.Parameter.Value);
  parameterCacheCollection[name] = parameter;

  return parameterCacheCollection[name];
}

export default { read };
