/* eslint-disable no-undef */
const stage = process.env.stage;
const resourcesStage = process.env.resourcesStage;

const stageConfigs = {
  dev: {
    auth: {
      secrets: {
        accessToken: {
          keyName: 'AccessTokenSecret',
          name: 'dev/token/access/secret',
        },
        refreshToken: {
          keyName: 'RefreshTokenSecret',
          name: 'dev/token/refresh/secret',
        },
        authorizationCode: {
          keyName: 'AuthorizationCodeSecret',
          name: 'dev/token/authorization/code/secret',
        },
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
      providers: {
        viva: {
          envsKeyName: '/vivaCaseEnvs/dev',
        },
      },
    },
    vada: {
      envsKeyName: '/vadaEnvs/dev',
    },
    navet: {
      envsKeyName: '/navetEnvs/dev',
    },
    pdf: {
      envsKeyName: '/pdfEnvs/dev',
    },
    version: {
      envsKeyName: '/versionEnvs/dev',
    },
    vivaNewApplication: {
      envsKeyName: '/vivaNewApplicationEnvs/dev',
    },
    status: {
      messages: {
        envsKeyName: '/statusMessagesEnvs/dev',
      },
    },
  },
  test: {
    auth: {
      secrets: {
        accessToken: {
          keyName: 'AccessTokenSecret',
          name: 'test/token/access/secret',
        },
        refreshToken: {
          keyName: 'RefreshTokenSecret',
          name: 'test/token/refresh/secret',
        },
        authorizationCode: {
          keyName: 'AuthorizationCodeSecret',
          name: 'test/token/authorization/code/secret',
        },
      },
    },
    bankId: {
      envsKeyName: '/bankidEnvs/test',
    },
    users: {
      tableName: 'users',
    },
    forms: {
      tableName: 'forms',
    },
    cases: {
      tableName: 'cases',
      providers: {
        viva: {
          envsKeyName: '/vivaCaseEnvs/test',
        },
      },
    },
    vada: {
      envsKeyName: '/vadaEnvs/test',
    },
    navet: {
      envsKeyName: '/navetEnvs/test',
    },
    pdf: {
      envsKeyName: '/pdfEnvs/test',
    },
    version: {
      envsKeyName: '/versionEnvs/test',
    },
    vivaNewApplication: {
      envsKeyName: '/vivaNewApplicationEnvs/test',
    },
    status: {
      messages: {
        envsKeyName: '/statusMessagesEnvs/dev',
      },
    },
  },
  stage: {
    auth: {
      secrets: {
        accessToken: {
          keyName: 'AccessTokenSecret',
          name: 'stage/token/access/secret',
        },
        refreshToken: {
          keyName: 'RefreshTokenSecret',
          name: 'stage/token/refresh/secret',
        },
        authorizationCode: {
          keyName: 'AuthorizationCodeSecret',
          name: 'stage/token/authorization/code/secret',
        },
      },
    },
    bankId: {
      envsKeyName: '/bankidEnvs/stage',
    },
    users: {
      tableName: 'users',
    },
    forms: {
      tableName: 'forms',
    },
    cases: {
      tableName: 'cases',
      providers: {
        viva: {
          envsKeyName: '/vivaCaseEnvs/stage',
        },
      },
    },
    vada: {
      envsKeyName: '/vadaEnvs/stage',
    },
    navet: {
      envsKeyName: '/navetEnvs/stage',
    },
    pdf: {
      envsKeyName: '/pdfEnvs/stage',
    },
    version: {
      envsKeyName: '/versionEnvs/stage',
    },
    vivaNewApplication: {
      envsKeyName: '/vivaNewApplicationEnvs/stage',
    },
    status: {
      messages: {
        envsKeyName: '/statusMessagesEnvs/dev',
      },
    },
  },
  prod: {
    auth: {
      secrets: {
        accessToken: {
          keyName: 'AccessTokenSecret',
          name: 'prod/token/access/secret',
        },
        refreshToken: {
          keyName: 'RefreshTokenSecret',
          name: 'prod/token/refresh/secret',
        },
        authorizationCode: {
          keyName: 'AuthorizationCodeSecret',
          name: 'prod/token/authorization/code/secret',
        },
      },
    },
    bankId: {
      envsKeyName: '/bankidEnvs/prod',
    },
    users: {
      tableName: 'users',
    },
    forms: {
      tableName: 'forms',
    },
    cases: {
      tableName: 'cases',
      providers: {
        viva: {
          envsKeyName: '/vivaCaseEnvs/prod',
        },
      },
    },
    vada: {
      envsKeyName: '/vadaEnvs/prod',
    },
    navet: {
      envsKeyName: '/navetEnvs/prod',
    },
    pdf: {
      envsKeyName: '/pdfEnvs/prod',
    },
    version: {
      envsKeyName: '/versionEnvs/prod',
    },
    vivaNewApplication: {
      envsKeyName: '/vivaNewApplicationEnvs/prod',
    },
    status: {
      messages: {
        envsKeyName: '/statusMessagesEnvs/dev',
      },
    },
  },
  release: {
    auth: {
      secrets: {
        accessToken: {
          keyName: 'AccessTokenSecret',
          name: 'release/token/access/secret',
        },
        refreshToken: {
          keyName: 'RefreshTokenSecret',
          name: 'release/token/refresh/secret',
        },
        authorizationCode: {
          keyName: 'AuthorizationCodeSecret',
          name: 'release/token/authorization/code/secret',
        },
      },
    },
    bankId: {
      envsKeyName: '/bankidEnvs/release',
    },
    users: {
      tableName: 'users',
    },
    forms: {
      tableName: 'forms',
    },
    cases: {
      tableName: 'cases',
      providers: {
        viva: {
          envsKeyName: '/vivaCaseEnvs/release',
        },
      },
    },
    vada: {
      envsKeyName: '/vadaEnvs/release',
    },
    navet: {
      envsKeyName: '/navetEnvs/release',
    },
    pdf: {
      envsKeyName: '/pdfEnvs/release',
    },
    version: {
      envsKeyName: '/versionEnvs/release',
    },
    vivaNewApplication: {
      envsKeyName: '/vivaNewApplicationEnvs/release',
    },
    status: {
      messages: {
        envsKeyName: '/statusMessagesEnvs/dev',
      },
    },
  },
};

const config = stageConfigs[stage] || stageConfigs.dev;

export default {
  stage,
  resourcesStage,
  ...config,
};
