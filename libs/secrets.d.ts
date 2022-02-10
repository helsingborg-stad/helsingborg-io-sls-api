/* eslint-disable @typescript-eslint/no-explicit-any */
export default secrets;
declare namespace secrets {
  export { get };
}
/**
 * Retrives a secret from the aws secrets manager
 * @param {string} secretName the name or arn of the secret that are being retrived
 */
declare function get(secretName: string, secretKeyName: any): Promise<any>;
