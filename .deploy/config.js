import process from 'process';

export default {
  deployCommand: `sls deploy -v --conceal --stage ${process.env.ENV}`,
  listCommand: `sls deploy list --stage ${process.env.ENV}`,
  rollbackCommand: `sls rollback --stage ${process.env.ENV} -t`,
  servicesPath: 'services',
  libsPath: 'libs',
  codeBuildPath: process.env.CODEBUILD_SRC_DIR,
  stage: process.env.ENV,
};
