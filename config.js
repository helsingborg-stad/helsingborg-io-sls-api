/* eslint-disable no-undef */
const stage = process.env.stage;
const resourcesStage = process.env.resourcesStage;

const stageConfigs = {
  dev: {
    token: {
      secret: {
        keyName: 'TokenGeneratorSecret',
        name: 'dev/token/generation',
      },
    },
    bankId: {
      envsKeyName: '/bankidEnvs/dev',
    },
    users: {
      tableName: 'users',
    },
    forms: {
      tableName: 'forms',
    },
  },
  prod: {
    bankId: {
      envsKeyName: '/bankidEnvs/prod',
    },
    users: {
      tableName: 'users',
    },
  },
};

const config = stageConfigs[stage] || stageConfigs.dev;

export default {
  stage,
  resourcesStage,
  ...config,
};
