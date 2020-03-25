import json
from libs.viva import Viva

viva = Viva()


def hello(event, context):

    body = {
        "cookie": viva.get_cookie()
    }

    response = {
        "statusCode": 200,
        "body": json.dumps(body)
    }

    return response
