type UUIDGenerator = () => string;

export function getUniqueFileName(
  fileName: string,
  separator: string,
  uuidGenerator: UUIDGenerator
): string {
  const fileNamelastIndex = fileName.lastIndexOf('.');
  const uuid = uuidGenerator();

  if (-1 === fileNamelastIndex) {
    return fileName + separator + uuid;
  }

  const [name, extension] = [
    fileName.slice(0, fileNamelastIndex),
    fileName.slice(fileNamelastIndex),
  ];
  return name + separator + uuid + extension;
}
