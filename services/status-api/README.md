# HELSINGBORG IO SLS STATUS SERVICE

## Purpose

The Status Service purpose is to return api status messages when there is an error in the api (backend) or when we want to
set the backend in some kind of maintenance mode.

## Description

The Status Service is a RESTful API that allows users to fetch the status message. The message itself is (as of now) a value in an
environment variable which could be changed in the AWS Lambda Console.

## Getting started

1. Read the global requirements for this repo, can be found [here](https://github.com/helsingborg-stad/helsingborg-io-sls-api/blob/dev/README.md)

### AWS API GATEWAY

A running instance of an API GATEWAY on AWS that includes a gateway resource named /status. You can find and deploy this in our [resource](https://github.com/helsingborg-stad/helsingborg-io-sls-resources/tree/dev/services/gateway/resources/status) repository.


### Installation

```bash
$ npm install
```

### Run Local

```bash
$ sls offline
```

When you deploy the service, serverless will output the generated url in the terminal that the service can be accessed from.

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
$ npm run test
```

Run test command with [options](https://jestjs.io/docs/cli#options):

```bash
$ npm run test -- --[option_1] --[option_2]
```

## API

### GET STATUS

#### Changing the return value in lambda console
This lambda function only returns the value of the `message` environment variable. In order to manually change it, you need to open the lambda function in the AWS Console. First, go to the `Lambda Console`, then open `status-api-<STAGE>-getStatus` lambda and press the `Configuration` tab. Select `Environment variables` in the menu to the left and then press edit. Change the value on the `message` variable to whichever you want.

#### Request Type

`GET`

#### Endpoint

`/status`

#### Expected Response

```
{
    "jsonapi": {
        "version": "1.0"
    },
    "body": {
        "data": {
            "message": "The status message"
        }
    }
}
```
