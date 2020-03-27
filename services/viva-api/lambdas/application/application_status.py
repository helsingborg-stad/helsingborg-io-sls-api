import json

def main(event, context):

    body = {
        "data": 'appliaction_status'
    }

    response = {
        "statusCode": 200,
        "body": json.dumps(body)
    }

    return response
