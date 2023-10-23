#!/usr/bin/env bash

aws events put-events --region eu-north-1 --entries file://putevents.json

exit 0
