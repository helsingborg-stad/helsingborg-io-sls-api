# HELSINGBORG IO SLS OFFICE ADD-IN SERVICE

## Purpose

The Office Add-In Service's purpose is to provide an interface for the Mitt Helsingborg Outlook Add-In to interact with Datatorget.

## Description

The Office Add-In service is a RESTful API that allows administrators using the Mitt Helsingborg Add-In to look up a user's reference code in order to be able to create bookings.

## Getting started

1. Read the global requirements for this repo, can be found [here](https://github.com/helsingborg-stad/helsingborg-io-sls-api/blob/dev/README.md)

### AWS API GATEWAY

A running instance of an API GATEWAY on AWS that includes a gateway resource named /office-add-in. You can find and deploy this in our [resource](https://github.com/helsingborg-stad/helsingborg-io-sls-resources/tree/dev/services/gateway/resources/office-add-in) repository.

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
$ sls deploy --verbose
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

### Fetch reference code

#### Request Type

`GET`

#### Endpoint

`/office-add-in/fetchReferenceCode/{query}`

#### Expected Response

```
{
    "jsonapi": {
        "version": "1.0"
    },
    "data": {
        "type": "fetchReferenceCode",
        "referenceCode": "reference_code"
    }
}
```