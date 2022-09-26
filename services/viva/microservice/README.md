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

## Viva submit new application sequence diagram

```mermaid
sequenceDiagram
  autonumber
  participant App
  participant Lambda BankId
  participant Lambda SubmitApplication
  participant SQS
  participant VADA/Viva
  participant Lambda SyncWorkflowId
  participant DynamoDB Cases

  App->>+Lambda SubmitApplication: Submit
  Lambda SubmitApplication-->>-App: OK
  Lambda SubmitApplication->>+SQS: Put in queue
  SQS->>+VADA/Viva: POST
  VADA/Viva-->>-Lambda SubmitApplication: OK
  App->>+Lambda BankId: Login
  Lambda BankId-->>-App: OK
  Lambda BankId->>+Lambda SyncWorkflowId: BankId collect
  Lambda SyncWorkflowId->>-VADA/Viva: GET workflow/latest
  VADA/Viva-->>+Lambda SyncWorkflowId: workflow
  Lambda SyncWorkflowId->>+DynamoDB Cases: {workflowId}
  DynamoDB Cases-->>-Lambda SyncWorkflowId: Update success
```

---
