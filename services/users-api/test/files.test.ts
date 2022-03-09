import { getUniqueFileName } from '../src/helpers/files';

const uuid = 'my:uuid';

test('when multiple dots exists in a filename, only the last one as extension', () => {
  const result = getUniqueFileName('my.file.jpg', '_', () => uuid);
  expect(result).toBe('my.file_my:uuid.jpg');
});

test('filename without extension should be formatted properly', () => {
  const result = getUniqueFileName('myfile', '_', () => uuid);
  expect(result).toBe('myfile_my:uuid');
});

test('common filename with extension should be formatted properly', () => {
  const result = getUniqueFileName('myfile.jpg', '_', () => uuid);
  expect(result).toBe('myfile_my:uuid.jpg');
});

test('empty filename should be handled gracefully', () => {
  const result = getUniqueFileName('', '_', () => uuid);
  expect(result).toBe('_my:uuid');
});
