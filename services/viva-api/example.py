try:
    import unzip_requirements
except ImportError:
    pass

import json
from libs.my_pages import MyPages


def hello(event, context):

    myPages = MyPages(
        usr="19701010T8095",
        pnr="19701010T8095"
    )

    body = {
        "personInfo": myPages.person_info,
        "personCases": myPages.person_cases
    }

    response = {
        "statusCode": 200,
        "body": json.dumps(body)
    }

    return response
