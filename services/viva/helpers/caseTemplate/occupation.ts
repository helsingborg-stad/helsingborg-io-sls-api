import * as formHelpers from '../formHelpers';
import { toDateString } from './shared';

import type { CaseFormAnswer } from '../../types/caseItem';

export enum ValidOccupation {
  fulltime = 'fulltime',
  parttime = 'parttime',
  unemployed = 'unemployed',
  parentalleave = 'parentalleave',
  studies = 'studies',
  sickleave = 'sickleave',
  otheroccupation = 'otheroccupation',
}

export interface Occupation {
  type: ValidOccupation;
  name: string;
  description?: string;
}

type DescriptionMapperFunction = (
  occupationType: ValidOccupation,
  answers: CaseFormAnswer[]
) => string | undefined;

const descriptionMapperFunctions: Record<string, DescriptionMapperFunction> = {
  fromDescription(occupationType: ValidOccupation, answers: CaseFormAnswer[]): string | undefined {
    return formHelpers.getFirstAnswerValueByTags(answers, [
      'occupation',
      'description',
      occupationType,
    ]);
  },

  fromDate(occupationType: ValidOccupation, answers: CaseFormAnswer[]): string {
    const maybeDateNumber = formHelpers.getFirstAnswerValueByTags(answers, [
      'occupation',
      'date',
      occupationType,
    ]);

    return toDateString(maybeDateNumber);
  },
};

const descriptionMap: Record<ValidOccupation, DescriptionMapperFunction> = {
  fulltime: descriptionMapperFunctions.fromDescription,
  otheroccupation: descriptionMapperFunctions.fromDescription,
  parttime: descriptionMapperFunctions.fromDescription,
  studies: descriptionMapperFunctions.fromDescription,
  unemployed: descriptionMapperFunctions.fromDescription,
  parentalleave: descriptionMapperFunctions.fromDate,
  sickleave: descriptionMapperFunctions.fromDate,
};

const friendlyNames: Record<ValidOccupation, string> = {
  [ValidOccupation.fulltime]: 'Arbetar heltid',
  [ValidOccupation.parttime]: 'Arbetar deltid',
  [ValidOccupation.unemployed]: 'Arbetssökande',
  [ValidOccupation.parentalleave]: 'Föräldraledig',
  [ValidOccupation.studies]: 'Studerande',
  [ValidOccupation.sickleave]: 'Sjukskriven med läkarintyg',
  [ValidOccupation.otheroccupation]: 'Annat',
};

function hasChecked(answers: CaseFormAnswer[], occupationType: ValidOccupation): boolean {
  const answerValue = formHelpers.getFirstAnswerValueByTags(answers, [
    'occupation',
    'type',
    occupationType,
  ]);

  return answerValue === true;
}

function createOccupation(occupationType: ValidOccupation, answers: CaseFormAnswer[]): Occupation {
  return {
    type: occupationType,
    name: friendlyNames[occupationType] ?? occupationType,
    description: descriptionMap[occupationType](occupationType, answers),
  };
}

export function createOccupations(answers: CaseFormAnswer[]): Occupation[] {
  const allOccupationTypes = Object.values(ValidOccupation);

  const chosenOccupationTypes = allOccupationTypes.filter(occupationType =>
    hasChecked(answers, occupationType)
  );

  return chosenOccupationTypes.map<Occupation>(occupationType =>
    createOccupation(occupationType, answers)
  );
}
