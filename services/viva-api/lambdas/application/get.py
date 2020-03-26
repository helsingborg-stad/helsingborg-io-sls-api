import json

def main(event, context):

    body = {
        "data": 'get'
    }

    response = {
        "statusCode": 200,
        "body": json.dumps(body)
    }

    return response
