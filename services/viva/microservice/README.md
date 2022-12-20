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

### Request type

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

## Sync workflow

```mermaid
sequenceDiagram
  autonumber
  participant EventBridge
  participant Lambda syncWorkflow
  participant DynamoDB Cases
  participant VADA/Viva

  EventBridge-)+Lambda syncWorkflow: {user: {personalNumber}}
  Lambda syncWorkflow->>-DynamoDB Cases: {personalNumber, statusType[]}
  DynamoDB Cases-->>Lambda syncWorkflow: {case[]}

  loop case[]
    Lambda syncWorkflow->>VADA/Viva: POST {personalNumber, workflowId}
    VADA/Viva-->>+Lambda syncWorkflow: {workflow}
    Lambda syncWorkflow->>DynamoDB Cases: Update case {caseKeys, workflow}
    Lambda syncWorkflow-)-EventBridge: {caseKeys, workflow}
  end
```

## Decide case status

```mermaid
sequenceDiagram
  autonumber
  participant EventBridge
  participant Lambda decideCaseStatus
  participant DynamoDB Cases

  EventBridge-)+Lambda decideCaseStatus: {caseKeys, workflow}
  Lambda decideCaseStatus->>DynamoDB Cases: {caseKeys, newStatus}
  Lambda decideCaseStatus-)-EventBridge: {caseKeys}
```

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
  participant Lambda SyncNewCaseWorkflowId
  participant VADA/Viva
  participant DynamoDB Cases

  EventBridge-)+Lambda SyncNewCaseWorkflowId: {event: application status}

  Lambda SyncNewCaseWorkflowId->>-VADA/Viva: GET mypages/{hashId}/workflow/latest

  alt workflow exists
    VADA/Viva-->>+Lambda SyncNewCaseWorkflowId: {workflow}
    Lambda SyncNewCaseWorkflowId->>DynamoDB Cases: {workflowId}
  end

  Lambda SyncNewCaseWorkflowId-)-EventBridge: {user, caseKeys, vivaApplicantStatusCodeList}
```
