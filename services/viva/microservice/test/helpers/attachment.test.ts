import * as S3 from '../../src/libs/S3';
import attachment from '../../src/helpers/attachment';
import type { CaseFormAnswer } from '../../src/types/caseItem';

jest.mock('../../src/libs/S3');

it('return a list of attachment objects', async () => {
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

  const answerList: CaseFormAnswer[] = [
    {
      field: {
        id: '123',
        tags: [],
      },
      value: [
        {
          uploadedId: 'uploadedId_0.png',
          deviceFileName: 'deviceFileName_0.png',
          mime: 'png',
          id: '1',
          index: 0,
          questionId: 'questionId_0.png',
          externalDisplayName: 'externalDisplayName_0.png',
        },
        {
          uploadedId: 'uploadedId_1.png',
          deviceFileName: 'deviceFileName_1.png',
          mime: 'png',
          id: '2',
          index: 1,
          questionId: 'questionId_1.png',
          externalDisplayName: 'externalDisplayName_1.png',
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
          uploadedId: 'uploadedIdA_0.png',
          deviceFileName: 'deviceFileNameA_0.png',
          mime: 'png',
          id: '3',
          index: 0,
          questionId: 'questionIdA_0.png',
          externalDisplayName: 'externalDisplayNameA_0.png',
        },
      ],
    },
  ];

  const result = await attachment.createFromAnswers('199492921234', answerList);

  expect(result).toEqual([
    {
      id: '199492921234/uploadedId_0.png',
      name: 'uploadedId_0.png',
      category: '',
      fileBase64: 'Some body here0',
    },
    {
      id: '199492921234/uploadedId_1.png',
      name: 'uploadedId_1.png',
      category: '',
      fileBase64: 'Some body here1',
    },
    {
      id: '199492921234/uploadedIdA_0.png',
      name: 'uploadedIdA_0.png',
      category: 'expenses',
      fileBase64: 'Some body hereA0',
    },
  ]);
});

it("return empty array when attachment file can't be retrived", async () => {
  jest.spyOn(S3.default, 'getFile').mockRejectedValueOnce({
    Body: 'BASE64 empty',
    id: '999',
  });

  const answerList: CaseFormAnswer[] = [
    {
      field: {
        id: '999',
        tags: ['viva', 'attachment', 'category', 'incomes'],
      },
      value: [
        {
          uploadedId: 'doNotExists.png',
          deviceFileName: 'doNotExists.png',
          mime: 'jpg',
          id: '1',
          index: 0,
          questionId: 'doNotExistsId',
          externalDisplayName: 'doNotExists.png',
        },
      ],
    },
  ];

  const result = await attachment.createFromAnswers('199492921234', answerList);

  expect(result).toEqual([]);
});

it('return empty array if answer value is of type string', async () => {
  const answerList: CaseFormAnswer[] = [
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

it('return list of attachment where category is set to expenses', async () => {
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

  const answerList: CaseFormAnswer[] = [
    {
      field: {
        id: '123',
        tags: ['viva', 'attachment', 'category', 'expenses'],
      },
      value: [
        {
          uploadedId: 'uploadedId_0.jpg',
          deviceFileName: 'deviceFileName_0.jpg',
          mime: 'jpg',
          id: '1',
          index: 0,
          questionId: 'questionId_0.jpg',
          externalDisplayName: 'externalDisplayName_0.jpg',
        },
        {
          uploadedId: 'uploadedId_1.jpg',
          deviceFileName: 'deviceFileName_1.jpg',
          mime: 'jpg',
          id: '2',
          index: 1,
          questionId: 'questionId_1.jpg',
          externalDisplayName: 'externalDisplayName_1.jpg',
        },
      ],
    },
  ];

  const result = await attachment.createFromAnswers('199492921234', answerList);

  expect(result).toEqual([
    {
      id: '199492921234/uploadedId_0.jpg',
      name: 'uploadedId_0.jpg',
      category: 'expenses',
      fileBase64: 'Some body here0',
    },
    {
      id: '199492921234/uploadedId_1.jpg',
      name: 'uploadedId_1.jpg',
      category: 'expenses',
      fileBase64: 'Some body here1',
    },
  ]);
});
