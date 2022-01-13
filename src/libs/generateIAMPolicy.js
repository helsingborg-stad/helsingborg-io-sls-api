/**
 * Generates a AWS IAMPolicy with a given effect on a given resource
 * @param {string} principalId any unique identifier for the IAM Policy.
 * @param {string} effect the effect of the IAM Policy.
 * @param {string} resource the target resource of the IAM Policy.
 */
export default function generateIAMPolicy(principalId, effect, resource) {
    const authResponse = {};

    authResponse.principalId = principalId;
    if (effect && resource) {
        const policyDocument = {};
        policyDocument.Version = '2012-10-17';
        policyDocument.Statement = [];
        const statementOne = {};
        statementOne.Action = 'execute-api:Invoke';
        statementOne.Effect = effect;
        statementOne.Resource = resource;
        policyDocument.Statement[0] = statementOne;
        authResponse.policyDocument = policyDocument;
    }

    return authResponse;
}
