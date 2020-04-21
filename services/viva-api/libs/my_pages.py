import json
import xmltodict
from libs.viva import Viva


class MyPages(Viva):

    def __init__(self, usr, pnr, wsdl="MyPages"):
        super(MyPages, self).__init__()

        self.usr = usr
        self.pnr = pnr

        self._service = self._get_service(wsdl)
        self.person_info = self.get_person_info()
        self.person_cases = self.get_person_cases()

    def get_person_info(self):
        response_info = self._service.PERSONINFO(
            USER=self.usr,
            PNR=self.pnr,
            RETURNAS="xml"
        )

        return xmltodict.parse(response_info)

    def get_person_cases(self):
        response_cases = self._service.PERSONCASES(
            USER=self.usr,
            PNR=self.pnr,
            RETURNAS="xml",
            SYSTEM=1
        )

        return xmltodict.parse(response_cases)
