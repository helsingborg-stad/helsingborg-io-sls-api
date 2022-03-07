import { uuid } from 'uuidv4';

type UUIDGenerator = () => string;

export function getUniqueFileName(
  fileName: string,
  separator = '_',
  uuidGenerator: UUIDGenerator = uuid
) {
  const lastIndex = fileName.lastIndexOf('.');

  if (-1 === lastIndex) {
    return `${fileName}${separator}${uuidGenerator()}`;
  }
  const [name, ext] = [fileName.slice(0, lastIndex), fileName.slice(lastIndex)];
  return `${name}${separator}${uuidGenerator()}${ext}`;
}
