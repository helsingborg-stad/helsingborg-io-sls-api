import json

def main(event, context):

    body = {
        "data": 'park_application'
    }

    response = {
        "statusCode": 200,
        "body": json.dumps(body)
    }

    return response
