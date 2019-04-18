FROM _NS_/cello-baseimage:_TAG_

COPY src /app
RUN  mkdir /root/.pip
COPY libltdl.so.7 /usr/lib/x86_64-linux-gnu/libltdl.so.7
RUN     cd /app/ && \
	pip install -r requirements.txt && \
        rm -rf /tmp/cello
RUN mkdir -p /opt/fabric_tools/v1_1 && mkdir -p /opt/fabric_tools/v1_4
COPY hyperledger-fabric-linux-amd64-1.1.0.tar.gz /tmp
COPY hyperledger-fabric-linux-amd64-1.4.0.tar.gz /tmp
RUN cd /tmp \
 && tar -zxvf hyperledger-fabric-linux-amd64-1.1.0.tar.gz && cp bin/* /opt/fabric_tools/v1_1
RUN cd /tmp \
 && tar -zxvf hyperledger-fabric-linux-amd64-1.4.0.tar.gz && cp bin/* /opt/fabric_tools/v1_4


CMD if [ "$DEBUG" = "True" ]; then python dashboard.py ; else gunicorn -w 1 --worker-class eventlet --no-sendfile  -b 0.0.0.0:8071 dashboard:app --timeout 120;fi
