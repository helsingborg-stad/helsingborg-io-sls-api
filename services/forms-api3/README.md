<h1> HELSINGBORG IO SLS FORM SERVICE</h1> <br>

## Purpose

The Form Service purpose is to provide templates of forms that describes the content, behavior and structure which a client can consume.

## Description

The Form Serivce is a RESTful API that allows you to create, update, read and delete Form templates.

## Requirements

Read the global requierments for this repo, can be found [here](https://github.com/helsingborg-stad/helsingborg-io-sls-api/blob/dev/README.md)

### AWS API GATEWAY

A running instance of a API GATEWAY on AWS that includes a gateway resource named /forms. You can find and deploy this in our [resource](https://github.com/helsingborg-stad/helsingborg-io-sls-resources/tree/dev/services/gateway) repository.

### AWS DYNAMODB

A running instance of a DYNAMODB. You can find and deploy this in our [resource](https://github.com/helsingborg-stad/helsingborg-io-sls-resources/tree/dev/services/dynamos/forms) repository.

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

### READ FORM

#### Request Type

`GET`

#### Endpoint

`/forms/{id}`

#### Excpected Response

```
{
  "jsonapi": {
    "version": "1.0"
  },
  "data": {
    "type": "forms",
    "id": "4bc10130-af17-11ea-b35b-c9388ccd1548",
    "attributes": {
      "ITEM_TYPE": "FORM",
      "updatedAt": 1592232517827,
      "createdAt": 1592232517827,
      "description": "cool",
      "name": "cool"
    },
    "relationships": {
      "STEP#4ce70fc0-afc9-11ea-a66e-cba35ef5b2c3": {
        "ITEM_TYPE": "STEP",
        "updatedAt": 1592308970251,
        "createdAt": 1592308970251,
        "description": "This is some step",
        "id": "4ce70fc0-afc9-11ea-a66e-cba35ef5b2c3",
        "show": true,
        "title": "Cool title",
        "children": {
          "QUESTION#5de98640-afdd-11ea-8c83-bff51a1c0f37": {
            "ITEM_TYPE": "QUESTION",
            "updatedAt": 1592317588731,
            "createdAt": 1592317588731,
            "description": "Number",
            "id": "5de98640-afdd-11ea-8c83-bff51a1c0f37",
            "type": "number"
          },
          "QUESTION#7821fe50-afd5-11ea-b501-a7f243db1d17": {
            "ITEM_TYPE": "QUESTION",
            "updatedAt": 1592314196693,
            "createdAt": 1592314196693,
            "description": "Color",
            "id": "7821fe50-afd5-11ea-b501-a7f243db1d17",
            "type": "string"
          },
          "QUESTION#aa448d60-b090-11ea-8e4e-dd547c5c6f4a": {
            "ITEM_TYPE": "QUESTION",
            "updatedAt": 1592394596763,
            "createdAt": 1592394596763,
            "description": "Number",
            "id": "aa448d60-b090-11ea-8e4e-dd547c5c6f4a",
            "type": "asdf"
          }
        }
      }
    }
  }
}
```

### CREATE FORM

#### Request Type

`POST`

#### Endpoint

`/forms`

#### JSON Payload

```
{
	"name": "example_form_name",
	"description": "Some description of the form"
}
```

#### Expected JSON Response

```
{
  "jsonapi": {
    "version": "1.0"
  },
  "data": {
    "type": "forms",
    "id": "4bc10130-af17-11ea-b35b-c9388ccd1548",
    "attributes": {
      "name": "example_form_name",
      "description": "Some description of the form"
    }
  }
}
```

### CREATE FORM STEP

#### Request Type

`POST`

#### Endpoint

`/form/{formId}/steps`

#### JSON Payload

```
{
	"show": true,
	"title": "An example title",
	"description": "Example description"
}
```

#### Expected JSON Response

```
{
  "jsonapi": {
    "version": "1.0"
  },
  "data": {
    "type": "forms",
    "id": "90ddeb80-b48e-11ea-b7d9-15a29e63554c",
    "attributes": {
      "message": "ok",
      "description": "Example description"
    }
  }
}
```

### CREATE FORM STEP QUESTION

#### Request Type

`POST`

#### Endpoint

`/form/{formId}/steps/{stepId}/questions`

#### JSON Payload

```
{
	"label": "some bullshit request",
	"description": "some example question description",
	"show": true,
	"type":"multiple_choice",
}
```

#### Expected JSON Response

```
{
  "jsonapi": {
    "version": "1.0"
  },
  "data": {
    "type": "forms",
    "id": "4bc10130-af17-11ea-b35b-c9388ccd1548",
    "attributes": {
      "description": "some example question description",
      "fieldType": "multiple_choice"
    }
  }
}
```
