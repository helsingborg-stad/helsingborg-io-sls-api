import requests
import json
import os
from libs.ssm_parameter_store import SSMParameterStore


class Viva():
    """
    Makes is possible get the Viva auth cookie
    """

    def __init__(self):
        store = SSMParameterStore(prefix="/vivaEnvs")
        self.params = json.loads(store[os.getenv("stage")])

    def get_cookie(self):
        response = requests.post(
            self.params["login_post_url"],
            data={
                "username": self.params["auth"]["username"],
                "password": self.params["auth"]["password"],
            },
            allow_redirects=False
        )

        return response.cookies[self.params["cookie_auth_name"]]
