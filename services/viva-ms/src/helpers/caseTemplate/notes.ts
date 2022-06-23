import type { CaseFormAnswer } from '../../types/caseItem';
import * as formHelpers from '../formHelpers';
import { filterValid } from './shared';

export interface Note {
  title: string;
  text: string;
}

export function createNotes(answers: CaseFormAnswer[]): Note[] {
  const message = formHelpers.getFirstAnswerValueByTags(answers, ['message']);

  const consolidated: (Note | undefined)[] = [
    message
      ? {
          title: 'Meddelande från sökande',
          text: message as string,
        }
      : undefined,
  ];

  return filterValid(consolidated);
}
