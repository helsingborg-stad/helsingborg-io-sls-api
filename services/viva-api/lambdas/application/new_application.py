try:
    import unzip_requirements
except ImportError:
    pass

import json
from libs.viva_application import VivaApplication


def main(event, context):

    vivaApplication = VivaApplication()

    new_application_repsonse = vivaApplication.new_application(
        key="123",
        user="19701010T8095",
        application={
            "RAWDATA": "Testing CREATE NEW APPLICATION",
            "RAWDATATYPE": "",
            "CLIENT": {
                "PNUMBER": "19701010T8095",
                "FNAME": "Ahmad",
                "LNAME": "Saloui",
                "ADDRESSES": [
                    {
                        "ADDRESS": {
                            "TYPE": "FB",
                            "ADDRESS": "Vinkelgatan 25",
                            "CO": "",
                            "ZIP": "252 25",
                            "CITY": "Helsingborg",
                        },
                    },
                ],
                "EMAIL": {
                    "EMAIL": "vegard@nodomain.com",
                    "NOTIFY": True,
                },
                "FOREIGNCITIZEN": True,
                "CIVILSTATUS": "SA",
                "OTHER": "Lite text från Övriga upplysningar...",
                "BANKACCOUNT": {
                    "HOLDER": "Frugan",
                    "BANKNAME": "SEB",
                    "CLEARINGNUMBER": "1234",
                    "ACCOUNTNUMBER": "12345678",
                },
            },
        },
    )

    body = {
        "data": new_application_repsonse,
    }

    response = {
        "statusCode": 200,
        "body": json.dumps(body)
    }

    return response
