import * as dynamoose from 'dynamoose';

const casesSchema = new dynamoose.Schema(
  {
    PK: {
      type: String,
      hashKey: true,
      validate: /^USER#(?:19|20)\d{6}\d{4}$/,
      required: true,
    },
    SK: {
      type: String,
      rangeKey: true,
      validate: /^USER#(?:19|20)\d{6}\d{4}#CASE#[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
      required: true,
    },
    ITEM_TYPE: {
      type: String,
      enum: ['CASE'],
      required: true,
    },
    id: {
      type: String,
      validated: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
      required: true,
    },
    currentStep: Number,
    personalNumber: {
      type: Number,
      validate: /(?:19|20)\d{6}\d{4}$/,
      required: true,
    },
    type: {
      type: String,
      enum: ['VIVA_CASE'],
      required: true,
    },
    formId: {
      type: String,
      validate: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
      required: true,
    },
    status: {
      type: String,
      enum: ['ongoing', 'submitted'],
      required: true,
    },
    data: {
      type: Object,
      required: true,
      schema: {
        expenses: {
          type: Object,
          required: true,
        },
        housingInfo: {
          type: Object,
          required: true,
        },
        incomes: {
          type: Object,
          required: true,
        },
        personalInfo: {
          type: Object,
          required: true,
        },
      },
    },
  },
  {
    saveUnknown: true,
    timestamps: true,
  }
);

export default casesSchema;
