const requiredFormProperties = [
  { name: 'name', type: 'string' },
  { name: 'description', type: 'string' },
  { name: 'steps', type: 'object' },
];

const requiredStepProperties = [
  { name: 'title', type: 'string' },
  { name: 'id', type: 'string' },
];

const requiredQuestionProperties = [
  { name: 'id', type: 'string' },
  { name: 'type', type: 'string' },
];

function validateTypes(data, requiredProps) {
  const errors = [];
  for (const prop of requiredProps) {
    if (!data[prop.name]) {
      errors.push(`Missing required property: ${prop.name}.`);
    } else if (typeof data[prop.name] !== prop.type) {
      errors.push(`The property '${prop.name}' needs to be of type '${prop.type}'`);
    }
  }
  return errors;
}

/**
 * Function for running validation on the request body.
 * @param {obj} body the JSON request body
 * @param {bool} update whether or not this is validation for an update
 */
export function validateFormData(body, update = false) {
  let hasErrors = false;
  const errors = {};
  if (!update) {
    const formTypeErrors = validateTypes(body, requiredFormProperties);
    if (formTypeErrors.length > 0) {
      errors.formTypeErrors = formTypeErrors;
      hasErrors = true;
    }
  }
  const stepValidationErrors = [];
  if (body.steps && Array.isArray(body.steps) && body.steps.length > 0) {
    for (const step of body.steps) {
      const errors = validateStep(step);
      if (errors.length > 0) {
        stepValidationErrors.push(errors);
      }
    }
  }
  if (stepValidationErrors.length > 0) {
    errors.stepTypeErrors = stepValidationErrors;
    hasErrors = true;
  }

  return hasErrors ? errors : null;
}

function validateStep(step) {
  const stepTypeErrors = validateTypes(step, requiredStepProperties);

  if (step.questions) {
    const questionErrors = {};
    let hasQuestionErrors = false;
    if (!Array.isArray(step.questions)) {
      stepTypeErrors.push("The property 'questions' needs to be an array");
    } else {
      for (const index in step.questions) {
        const errors = validateQuestion(step.questions[index]);
        if (errors.length > 0) {
          questionErrors[index] = errors;
          hasQuestionErrors = true;
        }
      }
    }
    if (hasQuestionErrors) {
      stepTypeErrors.push(questionErrors);
    }
  }
  return stepTypeErrors;
}

function validateQuestion(question) {
  return validateTypes(question, requiredQuestionProperties);
}
