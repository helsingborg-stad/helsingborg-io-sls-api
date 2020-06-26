<h1> HELSINGBORG IO SLS BANKID SERVICE</h1> <br>

## Purpose

The BankID Service purpose is to provide integration towards [the swedish bankid](https://www.bankid.com/) api.

## Description

The Bankid Service is a RESTful API that allows you use the following bankid integrations: authentication, sign, collect and cancel.

Complete documentation [Bank ID relying party guidelines (documentation)](https://www.bankid.com/bankid-i-dina-tjanster/rp-info)

## Requirements

Read the global requierments for this repo, can be found [here](https://github.com/helsingborg-stad/helsingborg-io-sls-api/blob/dev/README.md)

### AWS API GATEWAY

A running instance of a API GATEWAY on AWS that includes a gateway resource named /forms. You can find and deploy this in our [resource](https://github.com/helsingborg-stad/helsingborg-io-sls-resources/tree/dev/services/gateway) repository.

### AWS PARAMETERSTORE

A setup of AWS paramterstore on aws. This can be created from the resource api. You can find and deploy this in our [resource](https://github.com/helsingborg-stad/helsingborg-io-sls-resources/tree/dev/services/dynamos/forms) repository.

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

### POST AUTH

#### Request Type

`POST`

#### Endpoint

`/forms/{id}`

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
      "order_ref": "a-order-ref-id",
      "auto_start_token": "a-auto-start-token"
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

```
{
  "jsonapi": {
    "version": "1.0"
  },
  "data": {
    "type": "bankIdCollect",
    "attributes": {
      "order_ref": "a-order-ref-id",
      "status": "pending",
      "hint_code": "noClient"
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

NOT YET IMPLEMENTED
