try:
    import unzip_requirements
except ImportError:
    pass

import json

from libs.viva_application import VivaApplication
from libs.my_pages import MyPages


def main(event, context):

    usr = "19450817T5959"
    pnr = "19450817T5959"

    vivaApplication = VivaApplication(
        usr, pnr, my_pages=MyPages(
            usr=usr, pnr=pnr

        )
    )

    person_cases = vivaApplication.person_cases
    print(f"Person cases:{person_cases}")

    # new_re_application_repsonse = vivaApplication.new_re_application(
    #     key="123",
    #     user=usr,
    #     person_case="",
    #     period={
    #         "START": "2020-04-01",
    #         "END": "2020-04-30"
    #     },
    #     re_application={
    #         "RAWDATA": "Testing CREATE NEW APPLICATION",
    #         "RAWDATATYPE": "",
    #         "CLIENT": {
    #             "PNUMBER": "19450817T5959",
    #             "FNAME": "Ole",
    #             "LNAME": "Doff",
    #             "ADDRESSES": [
    #                 {
    #                     "ADDRESS": {
    #                         "TYPE": "FB",
    #                         "ADDRESS": "Galagatan 20",
    #                         "CO": "",
    #                         "ZIP": "222 20",
    #                         "CITY": "Helsingborg"
    #                     }
    #                 }
    #             ],
    #             "EMAIL": {
    #                 "EMAIL": "vegard@nodomain.com",
    #                 "NOTIFY": True
    #             },
    #             "FOREIGNCITIZEN": False,
    #             "RESIDENCEPERMITTYPE": "",
    #             "RESIDENCEPERMITDATE": "",
    #             "CIVILSTATUS": "",
    #             "ALTCIVILSTATUS": ""
    #         },
    #         "OTHER": "HEPP"
    #     }
    # )

    body = {
        "data": "new_re_application_repsonse",
    }

    response = {
        "statusCode": 200,
        "body": json.dumps(body)
    }

    return response
