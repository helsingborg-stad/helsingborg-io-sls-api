/**
 * Generates a AWS IAMPolicy with a given effect on a given resource
 * @param {string} principalId any unique identifier for the IAM Policy.
 * @param {string} effect the effect of the IAM Policy.
 * @param {string} resource the target resource of the IAM Policy.
 */
export default function generateIAMPolicy(principalId: string, effect: string, resource: string): {
    principalId: string;
    policyDocument: {
        Version: string;
        Statement: any[];
    };
};
