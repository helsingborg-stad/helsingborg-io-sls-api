try:
    import unzip_requirements
except ImportError:
    pass

import json
from libs.my_pages import MyPages


def hello(event, context):

    my_pages = MyPages(
        usr="19701010T8095",
        pnr="19701010T8095"
    )

    body = {
        "personInfo": my_pages.person_info,
        "personCases": my_pages.person_cases
    }

    response = {
        "statusCode": 200,
        "body": json.dumps(body)
    }

    return response
