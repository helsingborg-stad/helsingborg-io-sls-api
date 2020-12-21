#!/usr/bin/env bash

aws events put-events --entries file://putevents.json

exit 0
