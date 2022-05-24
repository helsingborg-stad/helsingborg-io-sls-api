import * as S3 from '../../src/libs/S3';
import attachment from '../../src/helpers/attachment';

jest.mock('../../src/libs/S3');

it('returns a list of attachment objects', async () => {
  jest
    .spyOn(S3.default, 'getFile')
    .mockResolvedValueOnce({
      id: '1',
      Body: 'Some body here0',
    })
    .mockResolvedValueOnce({
      id: '2',
      Body: 'Some body here1',
    })
    .mockResolvedValueOnce({
      id: '3',
      Body: 'Some body hereA0',
    });

  const answerList = [
    {
      field: {
        id: '123',
        tags: [],
      },
      value: [
        {
          uploadedFileName: 'uploadedFileName_0.png',
        },
        {
          uploadedFileName: 'uploadedFileName_1.png',
        },
      ],
    },
    {
      field: {
        id: '987',
        tags: ['viva', 'attachment', 'category', 'expenses'],
      },
      value: [
        {
          uploadedFileName: 'uploadedFileNameA_0.png',
        },
      ],
    },
  ];

  const result = await attachment.createFromAnswers('199492921234', answerList);

  expect(result).toEqual([
    {
      id: '199492921234/uploadedFileName_0.png',
      name: 'uploadedFileName_0.png',
      category: '',
      fileBase64: 'Some body here0',
    },
    {
      id: '199492921234/uploadedFileName_1.png',
      name: 'uploadedFileName_1.png',
      category: '',
      fileBase64: 'Some body here1',
    },
    {
      id: '199492921234/uploadedFileNameA_0.png',
      name: 'uploadedFileNameA_0.png',
      category: 'expenses',
      fileBase64: 'Some body hereA0',
    },
  ]);
});

it("writes a log message to AWS Cloud Watch when S3 can't retrive get the attachment file", async () => {
  jest.spyOn(S3.default, 'getFile').mockRejectedValueOnce({
    Body: 'BASE64 empty',
    id: '999',
  });

  const answerList = [
    {
      field: {
        id: '999',
        tags: ['viva', 'attachment', 'category', 'incomes'],
      },
      value: [
        {
          uploadedFileName: 'doNotExists.png',
        },
      ],
    },
  ];

  const result = await attachment.createFromAnswers('199492921234', answerList);

  expect(result).toEqual([]);
});

it('should return empty array if answer value is of type string', async () => {
  const answerList = [
    {
      field: {
        id: '99',
        tags: ['viva', 'attachment', 'category', 'incomes'],
      },
      value: 'String value, THIS IS NOT AN ATTACHMENT',
    },
  ];

  const result = await attachment.createFromAnswers('199492921234', answerList);

  expect(result).toEqual([]);
});

it('should return list of attachment where category is set to expenses', async () => {
  jest
    .spyOn(S3.default, 'getFile')
    .mockResolvedValueOnce({
      id: '0',
      Body: 'Some body here0',
    })
    .mockResolvedValueOnce({
      id: '1',
      Body: 'Some body here1',
    });

  const answerList = [
    {
      field: {
        id: '123',
        tags: ['viva', 'attachment', 'category', 'expenses'],
      },
      value: [
        {
          uploadedFileName: 'uploadedFileName_0.jpg',
        },
        {
          uploadedFileName: 'uploadedFileName_1.jpg',
        },
      ],
    },
  ];

  const result = await attachment.createFromAnswers('199492921234', answerList);

  expect(result).toEqual([
    {
      id: '199492921234/uploadedFileName_0.jpg',
      name: 'uploadedFileName_0.jpg',
      category: 'expenses',
      fileBase64: 'Some body here0',
    },
    {
      id: '199492921234/uploadedFileName_1.jpg',
      name: 'uploadedFileName_1.jpg',
      category: 'expenses',
      fileBase64: 'Some body here1',
    },
  ]);
});
