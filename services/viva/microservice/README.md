# HELSINGBORG IO SLS VIVA MICROSERVICE

## Purpose

The purpose of the Viva Microserivce is to provide the data flow between AWS and the Viva api adapter - VADA.

## Requirements

Read the global requirements for this repo, can be found [here](https://github.com/helsingborg-stad/helsingborg-io-sls-api/blob/dev/README.md)

### Installation Viva Microservice

```bash
cd microservice
yarn install
```

### Installation Viva Api

```bash
cd api/cases
yarn install
```

### Deploy and run on AWS

Deploy command:

```bash
sls deploy
```

## Viva Api

#### Request type

`POST`

#### Endpoint

`/viva-cases/{caseId}/persons`

#### JSON payload

```json
{
  "personalNumber": "203010101010"
}
```

#### Excpected response

```json
{
  "jsonapi": {
    "version": "1.0"
  },
  "data": {
    "type": "viva-cases",
    "attributes": "[case]"
  }
}
```

---

## Viva submit application sequence diagram

```mermaid
sequenceDiagram
  autonumber
  participant EventBridge
  participant SQS
  participant Lambda SubmitApplication
  participant VADA/Viva
  participant DynamoDB Cases

  EventBridge-)+SQS: {event}

  loop retry if not success
    SQS-)-Lambda SubmitApplication: {SQSEvent}
    Lambda SubmitApplication->>+VADA/Viva: POST application
  end

  VADA/Viva-->>+Lambda SubmitApplication: {status, workflowId}
  Lambda SubmitApplication->>DynamoDB Cases: {workflowId}

  Lambda SubmitApplication-)-EventBridge: {personalNumber}
```

---

## Sync case with latest workflow id (new application)

```mermaid
sequenceDiagram
  autonumber
  participant EventBridge
  participant Lambda SyncWorkflowId
  participant VADA/Viva
  participant DynamoDB Cases

  EventBridge-)+Lambda SyncWorkflowId: {event: bankId collect}

  Lambda SyncWorkflowId->>-VADA/Viva: GET mypages/{hashId}/workflow/latest

  alt workflow exists
    VADA/Viva-->>+Lambda SyncWorkflowId: {workflow}
    Lambda SyncWorkflowId->>DynamoDB Cases: {workflowId}
  end

  Lambda SyncWorkflowId-)-EventBridge: {personalNumber}
```
