<h1> HELSINGBORG IO SLS FORM SERVICE, updated and simplified</h1> <br>

## Purpose

The Form Service purpose is to provide templates of forms that describes the content, behavior and structure which a client can consume.

## Description

The Form Service is a RESTful API that allows you to create, update, read and delete (not implemented yet) Form templates.

## Requirements

Read the global requirements for this repo, can be found [here](https://github.com/helsingborg-stad/helsingborg-io-sls-api/blob/dev/README.md)

### AWS API GATEWAY

A running instance of a API GATEWAY on AWS that includes a gateway resource named /forms. You can find and deploy this in our [resource](https://github.com/helsingborg-stad/helsingborg-io-sls-resources/tree/dev/services/gateway) repository.

### AWS DYNAMODB

A running instance of a DYNAMODB. You can find and deploy this in our [resource](https://github.com/helsingborg-stad/helsingborg-io-sls-resources/tree/dev/services/dynamos/forms2) repository.

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

### GET ALL FORMS

#### Request Type

`GET`

#### Endpoint

`/forms3`

#### Excpected Response

```
{
    "jsonapi": {
        "version": "1.0"
    },
    "data": [
      { form1 },
      {form2 },
      ...
      ]
}
```

### READ FORM

#### Request Type

`GET`

#### Endpoint

`/forms3/{id}`

#### Expected Response

```
{
    "jsonapi": {
        "version": "1.0"
    },
    "data": [
        {
            "description": "A nice form",
            "id": "c04d7b00-c1eb-11ea-8e48-57bbdcb70948",
            "PK": "FORM#c04d7b00-c1eb-11ea-8e48-57bbdcb70948",
            "name": "Form Name"
            "updatedAt": 1594302887600,
            "createdAt": 1594302887600,
            "steps": [
                {
                    "title": "first step",
                    "description": "A good beginning"
                    "questions": [
                        {
                            "type": "text",
                            "id": "123123",
                            "label": "Good stuff"
                        }
                    ],
                }
            ],
        }
    ]
}
```

### CREATE FORM

#### Request Type

`POST`

#### Endpoint

`/forms3`

#### JSON Payload

```
{
    "description": "A nice form",
    "name": "Form Name",
    "steps": [
        {
            "title": "first step",
            "description": "A good beginning",
            "questions": [
                {
                    "type": "text",
                    "id": "123123",
                    "label": "Good stuff"
                }
            ]
        }
    ]
}
```

#### Expected JSON Response

```
{
    "jsonapi": {
        "version": "1.0"
    },
    "data": {
        "Item": {
            "id": "c04d7b00-c1eb-11ea-8e48-57bbdcb70948",
            "PK": "FORM#c04d7b00-c1eb-11ea-8e48-57bbdcb70948",
            "createdAt": 1594302887600,
            "updatedAt": 1594302887600,
            "steps": [
                {
                    "title": "first step",
                    "description": "A good beginning",
                    "questions": [
                        {
                            "id": "123123",
                            "type": "text",
                            "label": "Good stuff"
                        }
                    ]
                }
            ],
            "description": "A nice form",
            "name": "Form Name"
        }
    }
}
```

### UPDATE FORM

#### Request Type

`PUT`

#### Endpoint

`/forms3/{formId}`

#### JSON Payload

```
{
            "description": "A nice form",
            "name": "Form Name"
            "steps": [
                {
                    "title": "first step",
                    "description": "A good beginning"
                    "questions": [
                        {
                            "type": "text",
                            "id": "newId",
                            "label": "newLabel"
                        },
                        {
                            "type": "number",
                            "id": "newId",
                            "label": "newLabel"
                        }
                    ],
                }
            ],
        }
```

#### Expected JSON Response

```
{
    "jsonapi": {
        "version": "1.0"
    },
    "data": {
        "Item": {
            "id": "c04d7b00-c1eb-11ea-8e48-57bbdcb70948",
            "PK": "FORM#c04d7b00-c1eb-11ea-8e48-57bbdcb70948",
            "createdAt": 1594302887600,
            "updatedAt": 1594302887600,
            "steps": [
                {
                    "title": "first step",
                    "description": "A good beginning"
                    "questions": [
                        {
                            "type": "text",
                            "id": "newId",
                            "label": "newLabel"
                        },
                        {
                            "type": "number",
                            "id": "newId",
                            "label": "newLabel"
                        }
                    ],
                }
            ],
            "description": "A nice form",
            "name": "Form Name"
        }
    }
}
```

### DELETE FORM

#### Request Type

`DELETE`

#### Endpoint

`/forms3/{id}`

#### Expected Response

```
{
    "jsonapi": {
        "version": "1.0"
    },
    "data": {}
}
```
