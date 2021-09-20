# HELSINGBORG IO SLS BOOKING SERVICE

## Purpose

The Booking Service purpose is to manage Outlook calendar bookings against Datatorget service.

## Description

The Booking Service is a RESTful API that allows users to create, delete, update or get an Outlook calendar booking with requests
done to Datatorget API.

## Getting started

1. Read the global requierments for this repo, can be found [here](https://github.com/helsingborg-stad/helsingborg-io-sls-api/blob/dev/README.md)

### AWS API GATEWAY

A running instance of an API GATEWAY on AWS that includes a gateway resource named /booking. You can find and deploy this in our [resource](https://github.com/helsingborg-stad/helsingborg-io-sls-resources/tree/dev/services/gateway/resources/booking) repository.

### AWS PARAMETERSTORE (OPTIONAL)

A setup of booking AWS paramterstore on aws. This can be created from the resource api. You can find and deploy this in our [resource](https://github.com/helsingborg-stad/helsingborg-io-sls-resources/tree/dev/services/parameterStore) repository.

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

## API

### GET BOOKING

#### Request Type

`GET`

#### Endpoint

`/booking/{bookingId}`

#### JSON PAYLOAD

`N/A`

#### Excpected Response

```
{
    "jsonapi": {
        "version": "1.0"
    },
    "data": {
        "type": "booking",
        "id": "booking_id",
        "attributes": {
            "attendee": "attendee_email_address",
            "subject": "subject",
            "location": "location",
            "status": "status",
            "startTime": "utc_time_format",
            "endTime": "utc_time_format",
            "referenceCode": "reference_code",
            "responseType": "Unknown"
        }
    }
}
```

### CREATE BOOKING

#### Request Type

`POST`

#### Endpoint

`/booking`

#### JSON Payload

```
{
  "attendee": "attendee_email_address",
  "startTime": "utc_time_format",
  "endTime": "utc_time_format",
  "subject": "subject",
  "body": "htmltext",
  "location": "location",
  "referenceCode": "reference_code"
}
```

#### Expected JSON Response

```
{
    "jsonapi": {
        "version": "1.0"
    },
    "data": {
        "type": "booking",
        "id": "booking_id"
    }
}
```
### CANCEL BOOKING

#### Request Type

`DELETE`

#### Endpoint

`/booking/{bookingId}`

#### JSON Payload

`N/A`

#### Expected JSON Response

```
{
  "jsonapi": {
      "version": "1.0"
  },
  "data": {
      "bookingId": "booking_id"
  }
}
```

### UPDATE BOOKING

#### Request Type

`PATCH`

#### Endpoint

`/booking/{bookingId}`

#### JSON Payload

```
{
  "attendee": "attendee_email_address",
  "startTime": "utc_time_format",
  "endTime": "utc_time_format",
  "subject": "subject",
  "body": "htmltext",
  "location": "location",
  "referenceCode": "reference_code"
}
```

#### Expected JSON Response

```
{
  "jsonapi": {
      "version": "1.0"
  },
  "data": {
      "type": "booking",
      "id": "booking_id"
  }
}
```
