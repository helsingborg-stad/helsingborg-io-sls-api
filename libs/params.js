import SSM from 'aws-sdk/clients/ssm';

const ssm = new SSM({ apiVersion: '2014-11-06' });

async function read(name) {
  const requestParameters = {
    Name: name,
    WithDecryption: true,
  };

  const ssmParameters = await ssm.getParameter(requestParameters).promise();
  return JSON.parse(ssmParameters.Parameter.Value);
}

export default { read };
