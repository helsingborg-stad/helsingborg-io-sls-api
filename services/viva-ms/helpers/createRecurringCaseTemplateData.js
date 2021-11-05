import { TAG_NAME, VIVA_POST_TYPE_COLLECTION, PERSON_ROLE } from './constans';
import formatPeriodDates, { formatTimestampToDate } from './formatPeriodDates';
import formHelpers from './formHelpers';

function mapApplicant(person, answers) {
  const personalInfoAnswers = formHelpers.filterByFieldIdIncludes(answers, 'personalInfo');
  const personalInfo = personalInfoAnswers.reduce((accumulatedAnswer, answer) => {
    const attribute = formHelpers.getAttributeFromAnswerFieldId(answer.field.id);
    return { ...accumulatedAnswer, [attribute]: answer.value };
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
  const partnerInfoAnswers = formHelpers.filterByFieldIdIncludes(answers, 'partnerInfo');
  const partnerInfo = partnerInfoAnswers.reduce((accumulatedAnswer, answer) => {
    const attribute = formHelpers.getAttributeFromAnswerFieldId(answer.field.id);
    return { ...accumulatedAnswer, [attribute]: answer.value };
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

function getSecondStringFromDotNotatedString(sourceString) {
  const [, string] = sourceString.split('.');
  return string;
}

export function createPersonsObject(persons, answers) {
  const applicantPersons = persons.map(person => {
    if (person.role === PERSON_ROLE.applicant) {
      return mapApplicant(person, answers);
    }

    if (person.role === PERSON_ROLE.coApplicant) {
      return mapCoApplicant(person, answers);
    }

    return person;
  });

  return applicantPersons;
}

function createNotesObject(answers) {
  const notes = [];
  const filteredAnswers = formHelpers.filterByFieldIdIncludes(answers, 'otherMessage');
  if (filteredAnswers.length) {
    const [noteAnswer] = filteredAnswers;
    const note = {
      title: 'Meddelande från sökande',
      text: noteAnswer.value,
    };
    notes.push(note);
  }
  return notes;
}

export function createHousingInfoObject(answers) {
  const filteredAnswers = formHelpers.filterByFieldIdIncludes(answers, 'housingInfo');

  const housingInfo = filteredAnswers.reduce((accumulatedAnswer, answer) => {
    // field id can be constructed like personInfo.personFirstName, personInfo.personLastName
    const fieldId = getSecondStringFromDotNotatedString(answer.field.id);
    return { ...accumulatedAnswer, [fieldId]: answer.value };
  }, {});

  return housingInfo;
}

function createHousingExpenses(answers) {
  const categories = [
    {
      title: 'Hyra/Avgift',
      filterTags: ['expenses', 'boende', 'amount'],
      value: '',
    },
    {
      title: 'Hemförsäkring',
      filterTags: ['expenses', 'hemforsakring', 'amount'],
      value: '',
    },
    {
      title: 'Bredband',
      filterTags: ['expenses', 'bredband', 'amount'],
      value: '',
    },
    {
      title: 'El',
      filterTags: ['expenses', 'el', 'amount'],
      value: '',
    },
  ];

  const expenses = categories.map(category => {
    const [answer] = formHelpers.filterByTags(answers, category.filterTags);
    if (answer) {
      return {
        type: 'expenses',
        title: category.title,
        value: answer.value,
        id: category.filterTags.join(''),
        belongsTo: 'HOUSING',
        description: '',
        date: '',
        currency: 'kr',
      };
    }
    return undefined;
  });

  return expenses;
}
function createAssetsObject(answers) {
  const commonFilterTags = ['amount', 'assets'];
  const categories = [
    {
      title: 'Bil',
      filterTags: ['bil', ...commonFilterTags],
      value: '',
    },
    {
      title: 'Motorcykel',
      filterTags: ['motorcykel', ...commonFilterTags],
      value: '',
    },
    {
      title: 'Hus',
      filterTags: ['hus', ...commonFilterTags],
      value: '',
    },
    {
      title: 'Bostadsrätt',
      filterTags: ['lagenhet', ...commonFilterTags],
      value: '',
    },
    {
      title: 'Övriga fordon',
      filterTags: ['other', 'vehicle', ...commonFilterTags],
      value: '',
    },
    {
      title: 'Övriga tillgångar',
      filterTags: ['other', 'asset', ...commonFilterTags],
      value: '',
    },
  ];

  const assets = categories.map(category => {
    const [answer] = formHelpers.filterByTags(answers, category.filterTags);
    if (answer) {
      return {
        type: 'asset',
        title: category.title,
        value: answer.value,
        currency: 'kr',
      };
    }
    return undefined;
  });

  return assets;
}

function createHousingIncomes(answers) {
  const commonFilterTags = ['incomes', 'annan'];
  const filters = [
    {
      tags: ['group:hyresdel_hyra', ...commonFilterTags],
    },
    {
      tags: ['group:hyresdel_internet', ...commonFilterTags],
    },
    {
      tags: ['group:hyresdel_el', ...commonFilterTags],
    },
  ];

  const incomes = filters.map(filter => {
    const filteredAnswers = formHelpers.filterByTags(answers, filter.tags);

    if (filteredAnswers.length) {
      const initialHousingIncome = {
        type: 'incomes',
        belongsTo: 'HOUSING',
        id: filter.tags.join(''),
        description: '',
        date: '',
        value: '',
        currency: 'kr',
      };

      const income = filteredAnswers.reduce((currentIncome, answer) => {
        if (answer.field.tags.includes('description')) {
          return {
            ...currentIncome,
            description: answer.value,
          };
        }

        if (answer.field.tags.includes('amount')) {
          return {
            ...currentIncome,
            value: answer.value,
          };
        }

        return currentIncome;
      }, initialHousingIncome);

      return income;
    }
    return undefined;
  });

  return incomes;
}

export function createEconomicsObject(answers) {
  const categories = ['expenses', 'incomes'];
  let [expenses, incomes] = categories.map(category => {
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
        currency: 'kr',
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
        summaryItem.date = formatTimestampToDate(answer.value);
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

  const housingExpenses = createHousingExpenses(answers);
  if (housingExpenses) {
    expenses = [...expenses, ...housingExpenses];
  }

  const housingIncomes = createHousingIncomes(answers);
  if (housingIncomes.length) {
    incomes = [...incomes, ...housingIncomes];
  }

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
  const economics = createEconomicsObject(recurringform.answers);
  const notes = createNotesObject(recurringform.answers);
  const assets = createAssetsObject(recurringform.answers);

  return {
    notes,
    assets,
    period,
    persons,
    housing,
    economics,
  };
}
