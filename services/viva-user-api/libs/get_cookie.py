import requests
from zeep import Client
from zeep.transports import Transport

# Viva Services
application_wsdl = 'VivaApplication'
mypages_wsdl = 'MyPages'

# Setup
login_username = 'hbgworks'
login_password = 'b8wMH26tYS'
base_url = 'http://a001025.hbgadm.hbgstad.se/Test/Viva/'
wsdl_base_url = base_url + 'db3609.nsf/'
cookie_auth_name = 'DomAuthSessId'

# Get auth cookie
login_post_url = 'names.nsf?Login'

login_post_response = requests.post(
    base_url + login_post_url,
    data={
        'username': login_username,
        'password': login_password,
    }
)

cookie_auth = login_post_response.request.headers.get(
    'cookie'
).split(cookie_auth_name + '=', 1)[1]

# Set auth cookie
session = requests.Session()
transport = Transport(session=session)
jar = requests.cookies.RequestsCookieJar()
jar.set(cookie_auth_name, cookie_auth)
session.cookies = jar


# MyPages Service
client = Client(
    wsdl=wsdl_base_url + mypages_wsdl + '?WSDL',
    transport=transport
)

person_info_xml = client.service.PERSONINFO(
    USER='19701010T8095',
    PNR='19701010T8095',
    RETURNAS='xml'
)

print(person_info_xml)

person_cases_xml = client.service.PERSONCASES(
    USER='19701010T8095',
    PNR='19701010T8095',
    RETURNAS='xml',
    SYSTEM=1
)

print(person_cases_xml)
