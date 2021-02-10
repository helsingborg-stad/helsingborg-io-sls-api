# Cases - list, create, get, delete, update

## Requirements

Dynamodb table named {stage}-cases
see resources repo

## Endpoints

### Create case

`/cases`

Request type: POST

Headers
Authorization: {user id}

### Get case by id

`/cases/{caseId}`

Request type: GET

Headers
Authorization: {user id}

### List cases by user id

`/cases`

Request type: GET

Headers
Authorization: {user id}

## Example json payload (PUT)

```
{
  "status": {
    "type": "active:ongoing",
    "name": "Pågående",
    "description": "Du har påbörjat en ansökan. Du kan öppna din ansökan och fortsätta där du slutade."
  },
  "currentFormId": "123",
  "currentPosition": {
    "currentMainStep": 10,
    "currentMainStepIndex": 0,
    "index": 0,
    "level": 0
  },
  "answers": [
    {
      "field": {
        "id": "someNewId",
        "tags": [
          "expenses",
          "rent",
          "date"
        ]
      },
      "value": 1614162400000
    }
  ]
}
```

## Expected json response

```
{
  "jsonapi": {
    "version": "1.0"
  },
  "data": {
    "type": "getCase",
    "attributes": {
      "id": "39a3ed65-c7dd-4cd8-b152-753e39a4e4f3",
      "provider": "VIVA",
      "currentFormId": "123",
      "status": {
        "type": "active:submitted:viva",
        "name": "Inskickat",
        "description": "Ansökan är inskickad. Du kommer att få besked om ansökan när din handläggare har granskat och bedömt den."
      },
      "details": {
        "administrators": [
          {
            "name": "Oscar Lundström",
            "title": "Socialsekreterare",
            "phone": "042102237",
            "email": "oscar.lundstrom@helsingborg.se"
          }
        ]
      },
      "expirationTime": 1613239675,
      "forms": {
        "123": {
          "answers": [
            {
              "field": {
                "id": "someNewId",
                "tags": [
                  "expenses",
                  "rent",
                  "date"
                ]
              },
              "value": 1614162400000
            }
          ],
          "currentPosition": {
            "currentMainStepIndex": 0,
            "index": 0,
            "level": 0,
            "currentMainStep": 10
          }
        },
        "d5204940-3a36-11eb-bcf6-2f6b7e1aae28": {
          "answers": [
            {
              "field": {
                "id": "someId",
                "tags": [
                  "expenses",
                  "rent",
                  "date"
                ]
              },
              "value": 1614164400000
            }
          ],
          "currentPosition": {
            "currentMainStepIndex": 0,
            "index": 0,
            "level": 0,
            "currentMainStep": 0
          }
        }
      },
      "updatedAt": 1612980474917,
      "createdAt": 1612288964688
    }
  }
}
```
