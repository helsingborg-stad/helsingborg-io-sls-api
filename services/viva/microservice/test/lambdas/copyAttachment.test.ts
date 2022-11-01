import { copyAttachment } from '../../src/lambdas/copyAttachment';

import type { Record, Dependencies } from '../../src/lambdas/copyAttachment';
import { CasePersonRole } from '../../../types/caseItem';
import type { CasePerson, CaseItem } from '../../../types/caseItem';

const applicantPersonalNumber = '195001012222';
const coApplicantPersonalNumber = '198901013333';
const fileName = '12345678910';

function createPerson(personalNumber: string, role: CasePersonRole): CasePerson {
  return {
    role,
    personalNumber,
    firstName: `firstName-${role}`,
    lastName: `lastName-${role}`,
  };
}

function createS3Record(key: string): Record {
  return {
    s3: {
      object: {
        key,
      },
    },
  };
}

function createDependencies(partialDependencies: Partial<Dependencies> = {}): Dependencies {
  return {
    copyFile: () => Promise.resolve(),
    getLatestUpdatedCase: () =>
      Promise.resolve({
        persons: [
          createPerson(applicantPersonalNumber, CasePersonRole.Applicant),
          createPerson(coApplicantPersonalNumber, CasePersonRole.CoApplicant),
        ],
      }) as Promise<CaseItem>,
    ...partialDependencies,
  };
}

it('copies file to coapplicant bucket', async () => {
  const copyFileMock = jest.fn();
  const result = await copyAttachment(
    {
      Records: [createS3Record(`${applicantPersonalNumber}/${fileName}`)],
    },
    createDependencies({
      copyFile: copyFileMock,
    })
  );

  expect(result).toBe(true);
  expect(copyFileMock).toHaveBeenCalledWith(
    `${applicantPersonalNumber}/${fileName}`,
    `${coApplicantPersonalNumber}/${fileName}`
  );
});

it('skips copying of file if coapplicant does not exist', async () => {
  const copyFileMock = jest.fn();
  const result = await copyAttachment(
    {
      Records: [createS3Record(`${applicantPersonalNumber}/${fileName}`)],
    },
    createDependencies({
      copyFile: copyFileMock,
      getLatestUpdatedCase: () =>
        Promise.resolve({
          persons: [createPerson(applicantPersonalNumber, CasePersonRole.Applicant)],
        }) as Promise<CaseItem>,
    })
  );

  expect(result).toBe(false);
  expect(copyFileMock).not.toHaveBeenCalled();
});

it('skips copying of file if personal number is the same as s3 key and is coapplicant', async () => {
  const copyFileMock = jest.fn();
  const result = await copyAttachment(
    {
      Records: [createS3Record(`${coApplicantPersonalNumber}/${fileName}`)],
    },
    createDependencies({
      copyFile: copyFileMock,
      getLatestUpdatedCase: () =>
        Promise.resolve({
          persons: [createPerson(coApplicantPersonalNumber, CasePersonRole.CoApplicant)],
        }) as Promise<CaseItem>,
    })
  );

  expect(result).toBe(false);
  expect(copyFileMock).not.toHaveBeenCalled();
});
