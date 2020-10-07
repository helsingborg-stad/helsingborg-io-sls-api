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
    cases: {
      tableName: 'cases',
    },
    vada: {
      envsKeyName: '/vadaEnvs/dev',
    },
  },
  prod: {
    bankId: {
      envsKeyName: '/bankidEnvs/prod',
    },
    users: {
      tableName: 'users',
    },
    cases: {
      tableName: 'cases',
    },
  },
};

const config = stageConfigs[stage] || stageConfigs.dev;

export default {
  stage,
  resourcesStage,
  ...config,
};
