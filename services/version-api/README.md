# HELSINGBORG IO SLS VERSION SERVICE

## Purpose

The Version Service purpose is to handle Mitt Helsingborg application versions.

## Description

The Version Service is a RESTful API that allows developers to control which versions of the application Mitt Helsingborg
that could be used by the users. This is especially helpful if some versions aren't compatible with the current version
of the backend and we want to force users to update the application.

## Getting started

1. Read the global requirements for this repo, can be found [here](https://github.com/helsingborg-stad/helsingborg-io-sls-api/blob/dev/README.md)

### AWS API GATEWAY

A running instance of an API GATEWAY on AWS that includes a gateway resource named /version. You can find and deploy this in our [resource](https://github.com/helsingborg-stad/helsingborg-io-sls-resources/tree/dev/services/gateway/resources/version) repository.

### AWS PARAMETERSTORE (REQUIRED)

A setup of `versionEnvs` AWS parameterstore on aws. This can be created from the `resource` api. You can find and deploy this in our [resource](https://github.com/helsingborg-stad/helsingborg-io-sls-resources/tree/dev/services/parameterStore/envs) repository.

### Installation

```bash
$ yarn install
```

### Deploy and Run on AWS

Deploy command:

```bash
$ sls deploy
```

When you deploy the service, serverless will output the generated url in the terminal that the service can be accessed from.

### Tear down service

Teardown command:

```bash
$ sls remove
```

When you tear down the service, serverless will remove all resources created in the AWS console, including emptying the `deploymentBucket`.

### Testing (Jest)

Run test command:

```bash
$ yarn test
```

Run test command with [options](https://jestjs.io/docs/cli#options):

```bash
$ yarn test --[option_1] --[option_2]
```

## API

### GET STATUS

API that checks the current version of Mitt Helsingborg that a user is using and returns a status and updateUrl. The `status` property tells if the current
application version is ok (`OK`), if update is required (`UPDATE_REQUIRED`) or if update is optional (`UPDATE_OPTIONAL`).
The `updateUrl` property is a path to an updated version of the application (preferably Android/Ios app store).

#### Request Type

`GET`

#### Endpoint

`/version`

#### Expected Response

```
{
    "jsonapi": {
        "version": "1.0"
    },
    "data": {
        "type": "getStatus",
        "attributes": {
            "status": "OK | UPDATE_OPTIONAL | UPDATE_REQUIRED",
            "updateUrl": "URL"
        }
    }
}
```
