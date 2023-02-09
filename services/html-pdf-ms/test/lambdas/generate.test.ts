import { generate } from '../../src/lambdas/generate';
import type { Dependencies, FunctionInput } from '../../src/lambdas/generate';

function createDependencies(): Dependencies {
  return {
    getHtmlContent: jest.fn().mockResolvedValue('<html><body>ABC</body></html>'),
    savePdf: jest.fn().mockResolvedValue('123'),
    createPdf: jest.fn().mockResolvedValue(Buffer.from('ABC')),
    sendSuccessEvent: jest.fn().mockResolvedValue(undefined),
  };
}

it('returns true if pdf was saved successfully', async () => {
  const mockDependencies = createDependencies();
  const input: FunctionInput = {
    detail: {
      pdfStorageBucketKey: '123',
      keys: {
        PK: '123',
        SK: '456',
      },
    },
  };

  const result = await generate(input, mockDependencies);

  expect(mockDependencies.sendSuccessEvent).toHaveBeenCalledWith({
    keys: {
      PK: '123',
      SK: '456',
    },
    pdfStorageBucketKey: '123',
  });
  expect(mockDependencies.getHtmlContent).toHaveBeenCalledWith('123');
  expect(mockDependencies.createPdf).toHaveBeenCalledWith('<html><body>ABC</body></html>');
  expect(mockDependencies.savePdf).toHaveBeenCalledWith(Buffer.from('ABC'));
  expect(result).toBe(true);
});
