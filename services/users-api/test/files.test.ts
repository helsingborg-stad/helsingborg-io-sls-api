import { getUniqueFileName } from '../src/helpers/files';

it('Multiple dots only treating the last one as extension', async () => {
  expect(getUniqueFileName('my.file.jpg', '_', () => 'my:uuid')).toBe('my.file_my:uuid.jpg');
});
it('Handle filename without extension', async () => {
  expect(getUniqueFileName('myfile', '_', () => 'my:uuid')).toBe('myfile_my:uuid');
});
it('Handle comon case name with extension', async () => {
  expect(getUniqueFileName('myfile.jpg', '_', () => 'my:uuid')).toBe('myfile_my:uuid.jpg');
});
it('Handle empty filename', async () => {
  expect(getUniqueFileName('', '_', () => 'my:uuid')).toBe('_my:uuid');
});
