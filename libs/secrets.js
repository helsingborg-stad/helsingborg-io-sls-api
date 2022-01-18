import AWS from 'aws-sdk';

const secretsmanager = new AWS.SecretsManager();
/**
 * Retrives a secret from the aws secrets manager
 * @param {string} secretName the name or arn of the secret that are being retrived
 */
function get(secretName, secretKeyName) {
    return new Promise((resolve, reject) => {
        secretsmanager.getSecretValue(
            {
                SecretId: secretName,
            },
            (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    const secretStringObj = JSON.parse(data.SecretString);
                    const secretKey = secretStringObj[secretKeyName];
                    resolve(secretKey);
                }
            }
        );
    });
}

const secrets = {
    get,
};

export default secrets;
