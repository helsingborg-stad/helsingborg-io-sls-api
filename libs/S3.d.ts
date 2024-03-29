/* eslint-disable @typescript-eslint/no-explicit-any */
export const s3Client: any;
declare namespace _default {
  export { getSignedUrl };
  export { getFiles };
  export { getFile };
  export { deleteFile };
  export { deleteFiles };
  export { storeFile };
  export { copyFileWithinBucket };
}
export default _default;
declare function getSignedUrl(bucketName: any, method: any, params: any): string;
declare function getFile(bucketName: any, key: any): Promise<any>;
declare function deleteFile(bucketName: any, key: any): Promise<any>;
declare function deleteFiles(bucketName: string, keys: { Key: string }[]): Promise<any>;
declare function storeFile(bucketName: any, key: any, body: any): Promise<any>;
declare function copyFileWithinBucket(
  bucketName: string,
  sourceKey: string,
  targetKey: string
): Promise<void>;
