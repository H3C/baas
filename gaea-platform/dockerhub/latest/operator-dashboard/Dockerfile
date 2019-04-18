# Copyright IBM Corp, All Rights Reserved.
#
# SPDX-License-Identifier: Apache-2.0
#
FROM node:8.11 as build_js
MAINTAINER haitao yue "hightall@me.com"
RUN cd /tmp && git clone https://github.com/hyperledger/cello.git
RUN cp -r /tmp/cello/src/static /var/www
RUN cd /var/www/dashboard && npm install && npm run build

FROM hyperledger/cello-baseimage:x86_64-latest

COPY --from=build_js /var/www/dist /app/static/dist
CMD if [ "$DEBUG" = "True" ]; then python dashboard.py ; else gunicorn -w 1 --worker-class eventlet -b 0.0.0.0:8071 dashboard:app ;fi
