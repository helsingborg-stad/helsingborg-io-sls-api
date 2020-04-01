import requests
import json
import os
from zeep import Client
from zeep.transports import Transport
from ssm_parameter_store import SSMParameterStore


class Viva(object):

    def __init__(self, envs="/vivaEnvs"):
        self._params = self._get_params(envs)
        cookie = self._get_cookie()
        self._cookie_jar = self._set_cookie_jar(cookie)

    def _get_params(self, prefix):
        store = SSMParameterStore(prefix=prefix)
        return json.loads(store[os.getenv("stage")])

    def _set_cookie_jar(self, cookie):
        jar = requests.cookies.RequestsCookieJar()
        jar.set(self._params["cookie_auth_name"], cookie)
        return jar

    def _get_session(self):
        session = requests.Session()
        return session

    def _get_client(self, wsdl):
        session = self._get_session()
        session.cookies = self._cookie_jar
        transport = Transport(session=session)

        wsdl_url = self._params["wsdl_url"] + "/" + wsdl + "?WSDL"
        client = Client(wsdl=wsdl_url, transport=transport)

        return client.service

    def _get_service(self, service_wsdl):
        return self._get_client(service_wsdl)

    def _get_cookie(self):
        response = requests.post(
            self._params["login_post_url"],
            data={
                "username": self._params["auth"]["username"],
                "password": self._params["auth"]["password"],
            },
            allow_redirects=False
        )

        return response.cookies[self._params["cookie_auth_name"]]
