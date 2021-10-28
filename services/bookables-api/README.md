# HELSINGBORG IO SLS BOOKABLES SERVICE

## Purpose

The Bookables Service's purpose is to provide the app with data related to services that can be booked at Helsingborg Stad.

## Description

The Bookables Service is an API that returns information about the bookable services at Helsingborg Stad. Currently it retrieves the data from the parameter store, for ease of deployment. In the future this could be developed further into a platform with its own dynamo.

## Getting started

1. Read the global requierments for this repo, can be found [here](https://github.com/helsingborg-stad/helsingborg-io-sls-api/blob/dev/README.md)

### AWS API GATEWAY

A running instance of an API GATEWAY on AWS that includes a gateway resource named /search. You can find and deploy this in our [resource](https://github.com/helsingborg-stad/helsingborg-io-sls-resources/tree/dev/services/gateway/resources/search) repository.

### AWS PARAMETERSTORE (OPTIONAL)

A setup of search AWS paramterstore on aws. This can be created from the resource api. You can find and deploy this in our [resource](https://github.com/helsingborg-stad/helsingborg-io-sls-resources/tree/dev/services/parameterStore) repository.

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
$ sls deploy -v
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

### GET BOOKABLES

#### Request Type

`GET`

#### Endpoint

`/bookables`

#### Expected JSON Response

```json
{
    "jsonapi": {
        "version": "1.0"
    },
    "data": [
      {
        "name": "Rådgivning",
        "sharedMailbox": "mh.support@helsingborg.se",
        "address": "Drottninggatan 2, Helsingborg",
        "formId": "xxxx"
      }
    ]
}
```