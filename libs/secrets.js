import SecretsManager from 'aws-sdk/clients/secretsmanager';

const secretsManager = new SecretsManager();

function get(secretName, secretKeyName) {
  const secretValue = secretsManager.getSecretValue({ SecretId: secretName }).promise();

  const secretJSON = JSON.parse(secretValue.SecretString);
  return secretJSON[secretKeyName];
}

export default {
  get,
};
