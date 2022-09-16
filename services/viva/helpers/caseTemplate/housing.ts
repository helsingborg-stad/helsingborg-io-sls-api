import * as formHelpers from '../formHelpers';

import type { CaseFormAnswer } from '../../types/caseItem';
import type { ValidTags } from './shared';

export interface Housing {
  streetAddress?: string;
  postalCode?: string;
  postalAddress?: string;
  type: string;
  layoutDescription: string;
  numberPeopleLiving: number;
  rent: number;
  hasUnpaidRent: boolean;
  hasOwnerContractApproved: boolean;
  hasOwnRoom: boolean;
  value: number;
  otherLivingDescription?: string;
  homelessDescription?: string;
  otherAdultsLivingTypes: string[];
}

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
    type: formHelpers.getFirstAnswerValueByTags(housingAnswers, ['type']) ?? '',
    streetAddress: formHelpers.getFirstAnswerValueByTags(housingAnswers, ['address']),
    postalCode: formHelpers.getFirstAnswerValueByTags(housingAnswers, ['postalCode']),
    postalAddress: formHelpers.getFirstAnswerValueByTags(housingAnswers, ['postalAddress']),
    numberPeopleLiving: parseInt(
      formHelpers.getFirstAnswerValueByTags(housingAnswers, ['numberPeopleLiving']) ?? '',
      10
    ),
    otherAdultsLivingTypes: getCheckedOtherAdultsLivingDescriptions(answers),
    value: parseFloat(formHelpers.getFirstAnswerValueByTags(housingAnswers, ['value']) ?? ''),
    rent: parseFloat(formHelpers.getFirstAnswerValueByTags(housingAnswers, ['rent']) ?? ''),
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
