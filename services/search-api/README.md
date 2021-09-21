# HELSINGBORG IO SLS SEARCH SERVICE

## Purpose

The Search Service's purpose is to search through data related to an attendee's bookings and return information related to available time slots in the attendee's calendar.

## Description

The Search Service is an API that includes functions for searching through the calendar of an attendee and finding bookings and appropriate time slots for bookings of a specified length.

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

### SEARCH BOOKINGS

#### Request Type

`POST`

#### Endpoint

`/search/searchBookings`

#### JSON Payload

```json
{
  "attendee": "attendee_email_address",
  "startTime": "utc_time_format",
  "endTime": "utc_time_format",
}
```

#### Expected JSON Response

```json
{
    "jsonapi": {
        "version": "1.0"
    },
    "data": {
        "type": "outlookcalendarevents",
        "id": "attendee_email_address",
        "attributes": {
            "participant": "attendee_email_address"
        },
        "intervals": [
            {
                "eventId": "uid",
                "startTime": "utc_time_format",
                "endTime": "utc_time_format",
                "busyType": "Busy" | "Tentative",
                "isMeeting": "boolean",
                "subject": "string"
            },
            ...
        ]
    }
}
```