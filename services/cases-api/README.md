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

## Example json payload (POST)

```
{
	"personalNumber": 198602011212,
	"type": "VIVA_CASE",
	"data": {
		"id1": "value12",
		"id2": "value23",
		"id3": "value34",
		"id4": [1323,3566,6443,2345,23321]
	}
}
```

## Expected json response

```
{
    "jsonapi": {
        "version": "1.0"
    },
    "data": {
        "type": "cases",
        "id": "5a2b4280-b09d-11ea-9184-a1fb18d8d4ae",
        "attributes": {
            "personalNumber": 198602011212,
            "type": "VIVA_CASE",
            "data": {
                "id1": "value12",
                "id2": "value23",
                "id3": "value34",
                "id4": [
                    1323,
                    3566,
                    6443,
                    2345,
                    23321
                ]
            }
        }
    }
}
```
