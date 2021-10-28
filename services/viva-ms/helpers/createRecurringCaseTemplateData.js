import { TAG_NAME, VIVA_POST_TYPE_COLLECTION, PERSON_ROLES } from './constans';
import formatPeriodDates from './formatPeriodDates';
import formHelpers from './formHelpers';

function mapApplicant(person, answers) {
  const personalInfoAnswers = formHelpers.filterByFieldIdIncludes(answers, 'personalInfo');
  const personalInfo = personalInfoAnswers.reduce((acc, curr) => {
    const attribute = formHelpers.getAttributeFromAnswerFieldId(curr.field.id);
    return { ...acc, [attribute]: curr.value };
  }, {});

  return {
    role: person.role,
    personalNumber: person.personalNumber,
    firstName: person.firstName,
    lastName: person.lastName,
    phone: personalInfo.telephone,
    email: personalInfo.email,
    occupation: personalInfo.occupation,
  };
}

function mapCoApplicant(person, answers) {
  const partnerInfoAnswers = formHelpers.filterByFieldIdIncludes(answers, 'personalInfo');
  const partnerInfo = partnerInfoAnswers.reduce((object, answer) => {
    const attribute = formHelpers.getAttributeFromAnswerFieldId(answer.field.id);
    return { ...object, [attribute]: answer.value };
  }, {});

  return {
    role: person.role,
    personalNumber: person.personalNumber,
    firstName: person.firstName,
    lastName: person.lastName,
    phone: partnerInfo.partnerPhone,
    email: partnerInfo.partnerMail,
    occupation: partnerInfo.partnerOccupation,
  };
}

export function createPersonsObject(persons, answers) {
  const applicantPersons = persons.map(person => {
    if (person.role === PERSON_ROLES.applicant) {
      return mapApplicant(person, answers);
    }

    if (person.role === PERSON_ROLES.coApplicant) {
      return mapCoApplicant(person, answers);
    }

    return person;
  });

  return applicantPersons;
}

export function createHousingInfoObject(answers) {
  const filteredAnswers = formHelpers.filterByFieldIdIncludes(answers, 'housingId');

  const housingInfo = filteredAnswers.reduce((acc, curr) => {
    const strings = curr.field.id.split('.');
    return { ...acc, [strings[1]]: curr.value };
  }, {});

  return housingInfo;
}

export function createEconomicsObject(answers) {
  const categories = ['expenses', 'incomes'];
  const [expenses, incomes] = categories.map(category => {
    const categoryAnswers = formHelpers.filterByTags(answers, category);
    const categorySummaryList = categoryAnswers.reduce((summaryList, answer) => {
      const { tags } = answer.field;

      const groupTag = formHelpers.getTagIfIncludes(tags, TAG_NAME.group);

      let summaryItem = {
        type: category,
        id: groupTag,
        belongsTo: 'APPLICANT',
        title: '',
        description: '',
        date: '',
        value: '',
      };

      const summaryItemIndex = summaryList.findIndex(summaryItem => summaryItem.id === groupTag);

      if (summaryItemIndex !== -1) {
        summaryItem = summaryList[summaryItemIndex];
      }

      if (tags.includes(TAG_NAME.appliesto)) {
        summaryItem.belongsTo = answer.value;
      }

      if (tags.includes(TAG_NAME.amount)) {
        summaryItem.value = answer.value;
      }

      if (tags.includes(TAG_NAME.description)) {
        summaryItem.description = answer.value;
      }

      if (tags.includes(TAG_NAME.date)) {
        summaryItem.date = answer.value;
      }

      const vivaPostType = tags.reduce((type, tag) => {
        const isTagVivaPostType = VIVA_POST_TYPE_COLLECTION[tag] !== undefined;
        if (isTagVivaPostType) {
          return tag;
        }
        return type;
      }, '');

      if (vivaPostType) {
        summaryItem.type = vivaPostType;
        summaryItem.title = VIVA_POST_TYPE_COLLECTION[vivaPostType];
      }

      if (summaryItemIndex !== -1) {
        summaryList[summaryItemIndex] = summaryItem;
      } else {
        summaryList.push(summaryItem);
      }

      return summaryList;
    }, []);
    return categorySummaryList;
  });
  return {
    expenses,
    incomes,
  };
}

export default function createRecurringCaseTemplateData(caseItem, recurringFormId) {
  const recurringform = caseItem.forms[recurringFormId];
  const period = formatPeriodDates(caseItem.details.period);
  const persons = createPersonsObject(caseItem.persons, recurringform.answers);
  const housing = createHousingInfoObject(recurringform.answers);
  const economis = createEconomicsObject(recurringform.answers);

  return {
    period,
    persons,
    housing,
    economis,
  };
}
