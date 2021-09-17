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

A setup of AWS paramterstore on aws. This can be created from the resource api. You can find and deploy this in our [resource](https://github.com/helsingborg-stad/helsingborg-io-sls-resources/tree/dev/services/parameterStore) repository.

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

## API

### BANKID AUTH

#### Request Type

`POST`

#### Endpoint

`/bankid/auth`

#### JSON PAYLOAD

```
  {
    "personalNumber": "203010101010",
    "endUserIp": "0.0.0.0"
  }
```

#### Excpected Response

```
{
  "jsonapi": {
    "version": "1.0"
  },
  "data": {
    "type": "bankIdAuth",
    "attributes": {
      "orderRef": "a-order-ref-id",
      "autoStartToken": "a-auto-start-token"
    }
  }
}
```

### BANKID COLLECT

#### Request Type

`POST`

#### Endpoint

`/bankid/collect`

#### JSON Payload

```
{
	"orderRef": "a-order-ref-id"
}
```

#### Expected JSON Response
While pending:
```
{
  "jsonapi": {
    "version": "1.0"
  },
  "data": {
    "type": "bankIdCollect",
    "attributes": {
      "orderRef": "a-order-ref-id",
      "status": "pending",
      "hintCode": "noClient"
    }
  }
}
```
After completed login:
```
{
  "jsonapi": {
    "version": "1.0"
  },
  "data": {
    "orderRef":"131daac9-16c6-4618-beb0-365768f37288",
    "status":"complete",
    "completionData":{
      "user":{
        "personalNumber":"190000000000",
        "name":"Karl Karlsson",
        "givenName":"Karl",
        "surname":"Karlsson"
      },
      "device":{
        "ipAddress":"192.168.0.1"
      },
      "cert":{
        "notBefore":"1502983274000",
        "notAfter":"1563549674000"
      },
      "signature":"<base64-encoded data>",
      "ocspResponse":"<base64-encoded data>"
    }
  }
}
```

### BANKID CANCEL

#### Request Type

`POST`

#### Endpoint

`/bankid/cancel`

#### JSON Payload

```
{
	"orderRef": "a-order-ref-id"
}
```

#### Expected JSON Response

```
{
  "jsonapi": {
    "version": "1.0"
  },
  "data": {
    "type": "bankidCancel",
    "id": "a-order-ref-id",
    "attributes": {
      "message": "cancelled",
    }
  }
}
```

### BANKID SIGN

#### Request Type

`POST`

#### Endpoint

`/bankid/sign`

#### JSON Payload

```
{
	"personalNumber": "190101010101",
	"endUserIp": "0.0.0.0",
	"userVisibleData": "example-message"
}
```

#### Expected JSON Response

```
{
  "jsonapi": {
    "version": "1.0"
  },
  "data": {
    "type": "bankIdSign",
    "attributes": {
      "orderRef": "a-order-ref-id",
      "autoStartToken": "an-auto-start-token"
    }
  }
}
```
