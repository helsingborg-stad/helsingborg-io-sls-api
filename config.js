/* eslint-disable no-undef */
import stageConfigs from './config.json';

const stage = process.env.stage;
const resourcesStage = process.env.resourcesStage;

const config = stageConfigs[stage] || stageConfigs.dev;

module.exports.default = {
  stage,
  resourcesStage,
  ...config,
};
