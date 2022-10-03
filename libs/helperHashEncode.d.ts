export default hash;
declare namespace hash {
  export { encode };
}

declare function encode(value: unknown, hashSalt: string, hashSaltLength: number): string;
