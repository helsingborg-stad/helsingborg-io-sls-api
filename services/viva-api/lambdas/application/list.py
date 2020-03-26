import json

def main(event, context):

    body = {
        "data": 'list'
    }

    response = {
        "statusCode": 200,
        "body": json.dumps(body)
    }

    return response
