import json

def main(event, context):

    body = {
        "data": 'notification'
    }

    response = {
        "statusCode": 200,
        "body": json.dumps(body)
    }

    return response
