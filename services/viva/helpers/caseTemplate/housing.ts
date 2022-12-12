import * as formHelpers from '../formHelpers';

import { parseFloatSafe } from './shared';

import type { CaseFormAnswer } from '../../types/caseItem';
import type { ValidTags } from './shared';

export interface Housing {
  streetAddress?: string;
  postalCode?: string;
  postalAddress?: string;
  type: string;
  layoutDescription: string;
  numberPeopleLiving: number;
  rent?: number;
  hasUnpaidRent: boolean;
  hasOwnerContractApproved: boolean;
  hasOwnRoom: boolean;
  value?: number;
  otherLivingDescription?: string;
  homelessDescription?: string;
  otherAdultsLivingTypes: string[];
}

enum ValidHousingTypes {
  lease = 'lease',
  sublease = 'sublease',
  roommate = 'roommate',
  parents = 'parents',
  child = 'child',
  condo = 'condo',
  house = 'house',
  other = 'other',
  homeless = 'homeless',
}

const friendlyHousingDescriptions: Record<ValidHousingTypes, string> = {
  lease: 'Hyresrätt/förstahandskontrakt',
  sublease: 'Andrahand',
  roommate: 'Inneboende',
  parents: 'Bor hos föräldrar',
  child: 'Bor hos vuxna barn',
  condo: 'Bostadsrätt',
  house: 'Eget hus eller fastighet',
  other: 'Annat boende',
  homeless: 'Bostadslös',
};

enum ValidOtherAdultsLivingTypes {
  withChildren = 'withChildren',
  withParents = 'withParents',
  withRelatives = 'withRelatives',
  withRoomMate = 'withRoomMate',
}

const friendlyOtherAdultsLivingDescriptions: Record<ValidOtherAdultsLivingTypes, string> = {
  withChildren: 'Vuxna barn över 18',
  withParents: 'Föräldrer/Föräldrar',
  withRelatives: 'Släktingar',
  withRoomMate: 'Inneboende',
};

function getHousingTypeDescription(answers: CaseFormAnswer[]): string {
  const typeAnswers = formHelpers
    .filterByTags(answers, ['type'])
    .filter(answer => answer.value === true);
  const validTypes = Object.values(ValidHousingTypes) as string[] as ValidTags[];
  const housingType = validTypes.filter(type => typeAnswers[0]?.field.tags.includes(type))[0];
  const description = friendlyHousingDescriptions[housingType] ?? '';
  return description;
}

function getCheckedOtherAdultsLivingDescriptions(answers: CaseFormAnswer[]): string[] {
  const otherLivingTypes = Object.values(ValidOtherAdultsLivingTypes) as string[] as ValidTags[];
  return otherLivingTypes.reduce((list, potentialLivingType) => {
    const checkValue = formHelpers.getFirstAnswerValueByTags(answers, [
      'housing',
      potentialLivingType,
    ]);
    if (checkValue === true) {
      return [
        ...list,
        friendlyOtherAdultsLivingDescriptions[potentialLivingType as ValidOtherAdultsLivingTypes],
      ];
    }
    return list;
  }, [] as string[]);
}

export function createHousing(answers: CaseFormAnswer[]): Housing {
  const housingAnswers = formHelpers.filterByTags(answers, ['housing']);

  return {
    type: getHousingTypeDescription(housingAnswers),
    streetAddress: formHelpers.getFirstAnswerValueByTags(housingAnswers, ['address']),
    postalCode: formHelpers.getFirstAnswerValueByTags(housingAnswers, ['postalCode']),
    postalAddress: formHelpers.getFirstAnswerValueByTags(housingAnswers, ['postalAddress']),
    numberPeopleLiving: parseInt(
      formHelpers.getFirstAnswerValueByTags(housingAnswers, ['numberPeopleLiving']) ?? '',
      10
    ),
    otherAdultsLivingTypes: getCheckedOtherAdultsLivingDescriptions(answers),
    value: parseFloatSafe(formHelpers.getFirstAnswerValueByTags(housingAnswers, ['value']) ?? ''),
    rent: parseFloatSafe(formHelpers.getFirstAnswerValueByTags(housingAnswers, ['rent']) ?? ''),
    hasUnpaidRent: !!formHelpers.getFirstAnswerValueByTags(housingAnswers, ['debtRent']),
    hasOwnRoom: !!formHelpers.getFirstAnswerValueByTags(housingAnswers, ['ownRoom']),
    hasOwnerContractApproved: !!formHelpers.getFirstAnswerValueByTags(housingAnswers, [
      'ownerContractApproved',
    ]),
    layoutDescription: formHelpers.getFirstAnswerValueByTags(housingAnswers, ['layout']) ?? '',
    homelessDescription: formHelpers.getFirstAnswerValueByTags(housingAnswers, [
      'homelessDescription',
    ]),
    otherLivingDescription: formHelpers.getFirstAnswerValueByTags(housingAnswers, [
      'otherLivingDescription',
    ]),
  };
}
