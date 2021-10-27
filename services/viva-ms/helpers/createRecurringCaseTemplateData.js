import { VIVA_POST_TYPE_COLLECTION } from './constans';
import formatPeriodDates from './formatPeriodDates';
import formHelpers from './formHelpers';

const personMapFunctions = {
  applicant: (person, answers) => mapApplicant(person, answers),
  coApplicant: (person, answers) => mapCoApplicant(person, answers),
};

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
  const partnerInfo = partnerInfoAnswers.reduce((acc, curr) => {
    const attribute = formHelpers.getAttributeFromAnswerFieldId(curr.field.id);
    return { ...acc, [attribute]: curr.value };
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
    const personMapFunction = personMapFunctions[person.role];
    if (personMapFunction) {
      return personMapFunction(person, answers);
    }
    return person;
  });

  return applicantPersons;
}

export function createHousingInfoObject(answers) {
  const filteredAnswers = answers.filter(answer => answer.field.id.includes('housingInfo'));

  const coApplicant = filteredAnswers.reduce((acc, curr) => {
    const strings = curr.field.id.split('.');
    return { ...acc, [strings[1]]: curr.value };
  }, {});

  return coApplicant;
}

export function createEconomicsObject(answers) {
  const categories = ['expenses', 'incomes'];
  const [expenses, incomes] = categories.map(category => {
    const categoryAnswers = formHelpers.filterByTags(answers, category);
    const categorySummaryList = categoryAnswers.reduce((summaryList, answer) => {
      const groupTag = formHelpers.getTagIfIncludes(answer.field.tags, 'group');

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

      if (answer.field.tags.includes('appliesto')) {
        summaryItem.belongsTo = answer.value;
      }

      if (answer.field.tags.includes('amount')) {
        summaryItem.value = answer.value;
      }

      if (answer.field.tags.includes('description')) {
        summaryItem.description = answer.value;
      }

      if (answer.field.tags.includes('date')) {
        summaryItem.date = answer.value;
      }

      const vivaPostType = answer.field.tags.reduce((type, tag) => {
        if (VIVA_POST_TYPE_COLLECTION[tag] !== undefined) {
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
