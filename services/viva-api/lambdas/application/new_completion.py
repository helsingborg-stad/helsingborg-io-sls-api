import json

def main(event, context):

    body = {
        "data": 'new_completion'
    }

    response = {
        "statusCode": 200,
        "body": json.dumps(body)
    }

    return response
