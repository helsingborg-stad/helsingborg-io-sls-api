export default secrets;
declare namespace secrets {
  export { get };
}
declare function get(secretName: string, secretKeyName: string): Promise<string>;
