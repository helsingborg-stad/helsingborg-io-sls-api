import json
from libs.viva import Viva

class MyPages(Viva):

    def __init__(self, usr, pnr, wsdl="MyPages"):
        super(MyPages, self).__init__()

        self._service = self._get_service(wsdl)
        self.person_info = self.get_person_info(usr, pnr)
        self.person_cases = self.get_person_cases(usr, pnr)

    def get_person_info(self, usr, pnr):
        response = self._service.PERSONINFO(
            USER=usr,
            PNR=pnr,
            RETURNAS="xml"
        )

        return response

    def get_person_cases(self, usr, pnr):
        raise NotImplementedError()
