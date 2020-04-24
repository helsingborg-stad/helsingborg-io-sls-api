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
        user="19450817T5959",
        application={
            "RAWDATA": "Testing CREATE NEW APPLICATION",
            "RAWDATATYPE": "",
            "CLIENT": {
                "PNUMBER": "19450817T5959",
                "FNAME": "Ole",
                "LNAME": "Doff",
                "ADDRESSES": [
                    {
                        "ADDRESS": {
                            "TYPE": "FB",
                            "ADDRESS": "Galagatan 20",
                            "CO": "",
                            "ZIP": "222 20",
                            "CITY": "Helsingborg"
                        }
                    }
                ],
                "EMAIL": {
                    "EMAIL": "vegard@nodomain.com",
                    "NOTIFY": True
                },
                "FOREIGNCITIZEN": False,
                "RESIDENCEPERMITTYPE": "",
                "RESIDENCEPERMITDATE": "",
                "CIVILSTATUS": "",
                "ALTCIVILSTATUS": ""
            },
            "OTHER": "HEPP"
        }
    )

    body = {
        "data": new_application_repsonse,
    }

    response = {
        "statusCode": 200,
        "body": json.dumps(body)
    }

    return response
