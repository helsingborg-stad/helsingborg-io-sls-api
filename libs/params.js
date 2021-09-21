import SSM from 'aws-sdk/clients/ssm';
import to from 'await-to-js';

const ssm = new SSM({ apiVersion: '2014-11-06' });

const cachedParameters = {};

async function read(name) {
  if (cachedParameters[name]) {
    return cachedParameters[name];
  }

  const requestParameters = {
    Name: name,
    WithDecryption: true,
  };

  const [ssmError, ssmParameters] = await to(ssm.getParameter(requestParameters).promise());
  if (ssmError) {
    throw ssmError;
  }

  const parameter = JSON.parse(ssmParameters.Parameter.Value);
  cachedParameters[name] = parameter;

  return cachedParameters[name];
}

export default { read };
