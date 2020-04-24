import json
import xmltodict
from libs.viva import Viva


class VivaApplication(Viva):

    def __init__(self, wsdl="VivaApplication"):
        super(VivaApplication, self).__init__()

        self._service = self._get_service(wsdl)

    def new_application(self, key, user, application, ip="127.0.0.1"):
        response_new_application = self._service.NEWAPPLICATION(
            KEY=key,            # Externt ID. Lagras som ID på ansökan. Kan lämnas tomt
            USER=user,          # Aktuell användares personnummer
            IP=ip,              # Aktuell användares IP-adress
            CASETYPE="",        # Ärendetyp. Lämna tomt för "01" = ekonomiskt bistånd
            SYSTEM=1,
            APPLICATION=application,
        )

        return xmltodict.parse(response_new_application)
