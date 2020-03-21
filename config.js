/* eslint-disable no-undef */
const stage = process.env.stage;
const resourcesStage = process.env.resourcesStage;

const stageConfigs = {
  dev: {
    bankId: {
      envsKeyName: '/bankidEnvs/dev',
      caName: 'bankid.ca',
      pfxName: 'FPTestcert2.pfx',
    },
  },
  prod: {
    bankId: {
      envsKeyName: '/bankidEnvs/prod',
      caName: 'bankid.ca',
      pfxName: 'FPTestcert2.pfx',
    },
  },
};

const config = stageConfigs[stage] || stageConfigs.dev;

export default {
  stage,
  resourcesStage,
  ...config,
};
