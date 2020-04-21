try:
    import unzip_requirements
except ImportError:
    pass

import json
from libs.my_pages import MyPages


def hello(event, context):

    mypages = MyPages(
        usr="19701010T8095",
        pnr="19701010T8095"
    )

    body = {
        "personInfo": mypages.person_info,
        "personCases": mypages.person_cases
    }

    response = {
        "statusCode": 200,
        "body": json.dumps(body)
    }

    return response
