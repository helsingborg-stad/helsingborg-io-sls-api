import json

def main(event, context):

    body = {
        "data": 'deleted_parked_application'
    }

    response = {
        "statusCode": 200,
        "body": json.dumps(body)
    }

    return response
