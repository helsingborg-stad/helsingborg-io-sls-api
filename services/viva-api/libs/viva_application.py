from libs.viva import Viva


class VivaApplication(Viva):

    def __init__(self, wsdl="VivaApplication", my_pages=object):
        super(VivaApplication, self).__init__()
        self._service = self._get_service(wsdl)
        self._my_pages = my_pages
        self.person_cases = self._get_person_cases()

    def _get_person_cases(self):
        return self._my_pages.person_cases

    def new_application(self, key, user, application, ip="127.0.0.1"):
        response_new_application = self._service.NEWAPPLICATION(
            KEY=key,        # Externt ID. Lagras som ID på ansökan. Kan lämnas tomt
            USER=user,      # Aktuell användares personnummer
            IP=ip,          # Aktuell användares IP-adress
            CASETYPE="",    # Ärendetyp. Lämna tomt för "01" = ekonomiskt bistånd
            SYSTEM=1,
            APPLICATION=application,
        )

        return self._helpers.serialize_object(response_new_application)

    def new_re_application(self, key, user, person_case, period, re_application, ip="127.0.0.1"):

        response_new_re_application = self._service.NEWREAPPLICATION(
            # Externt ID. Lagras som ID på ansökan. Kan lämnas tomt
            KEY=key,

            # Aktuell användares personnummer
            USER=user,

            # Aktuell användares IP-adress
            IP=ip,

            # Identifierar ärendet i Viva med servernamn, databassökväg och unikt id
            # See MyPages.PersonCases
            SSI={
                "SERVER": "Pluto/ILAB Development",
                "PATH": "Demo\\Viva\\IFO\\docstore0003.nsf",
                "ID": "B93A7F13A2B72A13C12572830042D1B6"
            },

            # Identifierar Ansökanperioden (Fortsatt ansökan)
            # See MyPages.PersonCases
            WORKFLOWID="5444FD68F42714E2C12582B7003353D3",

            # Period som ansökan avser
            PERIOD={
                "START": "2018-06-01",
                "END": "2018-06-30"
            },

            REAPPLICATION=re_application,
        )

        return self._helpers.serialize_object(response_new_re_application)
