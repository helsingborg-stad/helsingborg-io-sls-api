type UUIDGenerator = () => string;

export function getUniqueFileName(fileName: string, separator = '_', uuidGenerator: UUIDGenerator) {
  const lastIndex = fileName.lastIndexOf('.');
  const uuid = uuidGenerator();

  if (-1 === lastIndex) {
    return `${fileName}${separator}${uuid}`;
  }
  const [name, extension] = [fileName.slice(0, lastIndex), fileName.slice(lastIndex)];
  return `${name}${separator}${uuid}${extension}`;
}
