import logging
import os
import re

import yaml
from common import log
from agent.blockchain_network_base import BlockchainNetworkBase
import agent.docker.fabric_dockerservice_models as fabricModels
from modules.models import modelv2
from uuid import uuid4
from compose.cli.command import get_project as compose_get_project

logger = logging.getLogger(__name__)
logger.setLevel(log.LOG_LEVEL)
logger.addHandler(log.log_handler)

# CELLO_WORKER_FABRIC_DIR mounts '/' of nfs container
CELLO_WORKER_FABRIC_DIR = '/opt/cello/'
# CELLO_MASTER_FABRIC_DIR is mounted by nfs container as '/'
CELLO_MASTER_FABRIC_DIR = '/opt/fabric/'

fabric_image_version = {
    'v1.1': '1.1.0',
    'v1.4': '1.4.0'
}

couchdb_image_version = {
    'v1.1': '2.1.1',
    'v1.4': '2.1.1',
}

# fabric-ca container variables
FABRIC_CA_SERVER_STARTCOMMAND = "sh -c 'fabric-ca-server start -b admin:adminpw -d \
               --config /etc/hyperledger/fabric-ca-server-config/fabric-ca-server-config.yaml'"

FABRIC_CA_IMAGE_PREFIX = 'hyperledger/fabric-ca:'

# orderer container variables
FABRIC_ORDERER_IMAGE_PREFIX = 'hyperledger/fabric-orderer:'
ORDERER_START_COMMAND = "orderer"

#peer container variables
FABRIC_PEER_IMAGE_PREFIX = 'hyperledger/fabric-peer:'
PEER_START_COMMAND = 'peer node start'

#couchdb container variables
FABRIC_COUCHDB_IMAGE_PREFIX = 'hyperledger/fabric-couchdb:'

#zookeeper container variables
FABRIC_ZOOKEEPER_IMAGE_PREFIX = 'hyperledger/fabric-zookeeper:'
#kafka container variables
FABRIC_KAFKA_IMAGE_PREFIX = 'hyperledger/fabric-kafka:'

KAFKA_CLUSTER_SIZE = 4
ZOOKEEPER_CLUSTER_SIZE = 3

ImageType_none = 0
ImageType_local = 1
ImageType_all = 2

PEER_PORT_GRPC = 'grpc'
PEER_PORT_EVENT = 'event'

class NetworkOnDocker(BlockchainNetworkBase):

    def __init__(self):
        pass

    def _get_ca_private_key(self, pk_path):

        if not os.path.isdir(pk_path):
             raise IOError("blockchain network ca config couldn't be found")

        result = None
        for file in os.listdir(pk_path):
            result = re.search('_sk$', file)
            if result:
                return file

        if result is None:
            err_msg = "couldn't find ca private key"
            logger.error(err_msg)
            raise Exception(err_msg)

    def _construct_ca_docker_service(self, net_id, org_name, org_domain, ca_key_file,
                                     fabric_version, host_port):

        org_fullDomain_name = org_name +'.'+ org_domain
        ca_service_name = "ca." + org_fullDomain_name
        name_prefix = net_id[:12]
        ca_container_name = name_prefix + '_' + ca_service_name
        ca_image = FABRIC_CA_IMAGE_PREFIX + fabric_image_version[fabric_version]
        ca_container_env = ["FABRIC_CA_HOME=/etc/hyperledger/fabric-ca-server",
                             "FABRIC_CA_SERVER_CA_NAME=ca-{}".format(org_name),
                             "FABRIC_CA_SERVER_CA_CERTFILE=/etc/hyperledger/fabric-ca-server-config/ca.{org_domain}-cert.pem". \
                                 format(org_domain=org_fullDomain_name),
                             "FABRIC_CA_SERVER_CA_KEYFILE=/etc/hyperledger/fabric-ca-server-config/{key_file}". \
                                 format(key_file=ca_key_file),
                             "FABRIC_CA_SERVER_TLS_ENABLED=true",
                             "FABRIC_CA_SERVER_TLS_CERTFILE=/etc/hyperledger/fabric-ca-server-config/ca.{org_domain}-cert.pem". \
                                 format(org_domain=org_fullDomain_name),
                             "FABRIC_CA_SERVER_TLS_KEYFILE=/etc/hyperledger/fabric-ca-server-config/{key_file}". \
                                 format(key_file=ca_key_file)
                             ]
        port_mapping = [(host_port, 7054)]
        net_fabric_path = CELLO_WORKER_FABRIC_DIR + net_id
        host_volume_path = "{hp}/crypto-config/peerOrganizations/{org_domain}/ca/". \
            format(hp=net_fabric_path, org_domain=org_fullDomain_name)
        volume_mapping = [(host_volume_path, '/etc/hyperledger/fabric-ca-server-config')]

        ca_service_model = fabricModels.FabricServiceModel(service_name = ca_service_name,
                                                       image = ca_image,
                                                       container_name = ca_container_name,
                                                       environment = ca_container_env,
                                                       port_mapping = port_mapping,
                                                       volume_mapping = volume_mapping,
                                                       command=FABRIC_CA_SERVER_STARTCOMMAND
                                                       )
        result = ca_service_model.to_dict()
        return result

    def _construct_orderer_docker_service(self, net_id, org_name, org_domain,
                                          orderer_hostname, fabric_version, host_port):
        net_dir = CELLO_WORKER_FABRIC_DIR + net_id
        name_prefix = net_id[:12]
        orderer_fullDomain_name = '.'.join([orderer_hostname, org_domain])
        orderer_service_name = orderer_fullDomain_name
        orderer_container_name = name_prefix +'_' + orderer_service_name
        orderer_hostpath_msp = '{net_dir}/crypto-config/ordererOrganizations/{org_domain}/orderers/{full_domain}/msp'. \
            format(net_dir=net_dir, org_domain=org_domain, full_domain=orderer_fullDomain_name)
        orderer_hostpath_tls = '{net_dir}/crypto-config/ordererOrganizations/{org_domain}/orderers/{full_domain}/tls'. \
            format(net_dir=net_dir, org_domain=org_domain, full_domain=orderer_fullDomain_name)
        orderer_hostpath_genesisblock = '{net_dir}/channel-artifacts/genesis.block'. \
            format(net_dir=net_dir)
        volume_mapping = [(orderer_hostpath_msp, '/var/hyperledger/orderer/msp'),
                                  (orderer_hostpath_tls, '/var/hyperledger/orderer/tls'),
                                  (orderer_hostpath_genesisblock, '/var/hyperledger/orderer/orderer.genesis.block')]
        port_mapping = [(host_port, 7050)]
        orderer_image = FABRIC_ORDERER_IMAGE_PREFIX + fabric_image_version[fabric_version]
        orderer_container_env = ["ORDERER_GENERAL_LOGLEVEL=DEBUG",
               "ORDERER_GENERAL_LISTENADDRESS=0.0.0.0",
               "ORDERER_GENERAL_GENESISMETHOD=file",
               "ORDERER_GENERAL_GENESISFILE=/var/hyperledger/orderer/orderer.genesis.block",
               "ORDERER_GENERAL_LOCALMSPID={}MSP".format(org_name[0:1].upper()+org_name[1:]),
               "ORDERER_GENERAL_LOCALMSPDIR=/var/hyperledger/orderer/msp",
               "ORDERER_GENERAL_TLS_ENABLED=true",
               "ORDERER_GENERAL_TLS_PRIVATEKEY=/var/hyperledger/orderer/tls/server.key",
               "ORDERER_GENERAL_TLS_CERTIFICATE=/var/hyperledger/orderer/tls/server.crt",
               "ORDERER_GENERAL_TLS_ROOTCAS=[/var/hyperledger/orderer/tls/ca.crt]"
              ]

        orderer_service_model = fabricModels.FabricServiceModel(service_name = orderer_service_name,
                                                       image = orderer_image,
                                                       container_name = orderer_container_name,
                                                       environment = orderer_container_env,
                                                       port_mapping = port_mapping,
                                                       volume_mapping = volume_mapping,
                                                       command = ORDERER_START_COMMAND
                                                       )
        result = orderer_service_model.to_dict()
        return result

    def _construct_peer_docker_service(self, net_id, org_name, org_domain, peer_name,\
                                                    fabric_version, host_ports, depends_on):
        net_dir = CELLO_WORKER_FABRIC_DIR + net_id
        name_prefix = net_id[:12]
        #the chaincode node network which is the same with peer and orderer
        cc_container_network = name_prefix + '_celloNet'
        org_fullDomain_name = '.'.join([org_name, org_domain])
        peer_fullDomain_name = '.'.join([peer_name, org_fullDomain_name])
        peer_service_name = peer_fullDomain_name
        peer_container_name = name_prefix + '_' + peer_service_name

        peer_hostpath_docker = '/var/run/'
        peer_hostpath_msp = '{net_dir}/crypto-config/peerOrganizations/{org_domain}/peers/{peer_domain}/msp'. \
            format(net_dir=net_dir, org_domain=org_fullDomain_name, peer_domain=peer_fullDomain_name)
        peer_hostpath_tls = '{net_dir}/crypto-config/peerOrganizations/{org_domain}/peers/{peer_domain}/tls'. \
            format(net_dir=net_dir, org_domain=org_fullDomain_name, peer_domain=peer_fullDomain_name)

        volume_mapping = [(peer_hostpath_docker, '/var/run/'),\
                          (peer_hostpath_msp, '/etc/hyperledger/fabric/msp'),\
                          (peer_hostpath_tls, '/etc/hyperledger/fabric/tls')]
        if host_ports is None or len(host_ports) != 2:
            raise Exception("peer node needs expose two ports to host")
        port_mapping = [(host_ports[0], 7051), (host_ports[1], 7053)]
        peer_image = FABRIC_PEER_IMAGE_PREFIX + fabric_image_version[fabric_version]
        peer_container_env = ["CORE_PEER_ID={}".format(peer_service_name),
                              "CORE_PEER_LOCALMSPID={}MSP".format(org_name[0:1].upper()+org_name[1:]),
                              'CORE_PEER_ADDRESS={}:7051'.format(peer_service_name),
                              "CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE={}".format(cc_container_network),
                              "CORE_LOGGING_LEVEL=DEBUG",
                              "CORE_PEER_GOSSIP_USELEADERELECTION=true",
                              "CORE_PEER_GOSSIP_ORGLEADER=false",
                              "CORE_PEER_GOSSIP_SKIPHANDSHAKE=true",
                              "CORE_PEER_TLS_ENABLED=true",
                              "CORE_PEER_TLS_CERT_FILE=/etc/hyperledger/fabric/tls/server.crt",
                              "CORE_PEER_TLS_KEY_FILE=/etc/hyperledger/fabric/tls/server.key",
                              "CORE_PEER_TLS_ROOTCERT_FILE=/etc/hyperledger/fabric/tls/ca.crt",
                              "GODEBUG=netdns=go",
                              "CORE_LEDGER_STATE_STATEDATABASE=CouchDB",
                              "CORE_LEDGER_STATE_COUCHDBCONFIG_COUCHDBADDRESS=couchdb.{}:5984".format(peer_service_name)
                              ]

        peer_service_model = fabricModels.FabricServiceModel(service_name = peer_service_name,
                                                       image = peer_image,
                                                       container_name = peer_container_name,
                                                       environment = peer_container_env,
                                                       port_mapping = port_mapping,
                                                       volume_mapping = volume_mapping,
                                                       command = PEER_START_COMMAND,
                                                       depends_on = depends_on
                                                       )
        result = peer_service_model.to_dict()
        return result

    # def _construct_zookeeper_docker_service(self, net_id, fabric_version):
    #     image = FABRIC_ZOOKEEPER_IMAGE_PREFIX + fabric_version
    #     zookeeper_service_model = fabricModels.FabricServiceModel(service_name = 'zookeeper',
    #                                                    image = image,
    #                                                    container_name = peer_container_name,
    #                                                    environment = peer_container_env,
    #                                                    port_mapping = port_mapping,
    #                                                    volume_mapping = volume_mapping,
    #                                                    networks = container_networks,
    #                                                    command = PEER_START_COMMAND,
    #                                                    depends_on = depends_on
    #                                                    )
    #     result = peer_service_model.to_dict()
    #     return result
    def _construct_couchdb_docker_service(self, net_id, couchdb_service_name, \
                                       fabric_version, host_port):
        name_prefix = net_id[:12]
        net_dir = CELLO_WORKER_FABRIC_DIR + net_id
        couchdb_container_name = name_prefix + '_' + couchdb_service_name

        if host_port is None :
            raise Exception("couchdb node needs expose a port to host")
        port_mapping = [(host_port, 5984)]
        couchdb_image = FABRIC_COUCHDB_IMAGE_PREFIX + couchdb_image_version[fabric_version]
        couchdb_container_env = ["COUCHDB_USER=",
                                 "COUCHDB_PASSWORD="
                              ]
        couchdb_hostpath_dir = '{net_dir}/chouchdb/{couchdb}'.format(net_dir=net_dir, couchdb=couchdb_service_name)
        volume_mapping = [(couchdb_hostpath_dir, '/opt/couchdb/data')]

        couchdb_service_model = fabricModels.FabricServiceModel(service_name=couchdb_service_name,
                                                             image=couchdb_image,
                                                             container_name=couchdb_container_name,
                                                             environment=couchdb_container_env,
                                                             port_mapping=port_mapping,
                                                             command=None,
                                                             volume_mapping=volume_mapping
        )
        result = couchdb_service_model.to_dict()
        return result



    def create(self, network_config, request_host_ports):

        # only ensure network_files_dir is exist
        # suppose if no exception is raised during crypto generation,
        # then everything is OK.
        # below code is wrong, cause the network_files_dir is on worker node
        # network_files_dir = CELLO_WORKER_FABRIC_DIR + net_id
        # if not os.path.isdir(network_files_dir):
        #     raise IOError("blockchain network crypto-config \
        #                   and genesis block couldn't be found")

        net_id = network_config['id']# use network id 0-12 byte as name prefix
        net_dir = CELLO_MASTER_FABRIC_DIR + net_id
        host = network_config['host']
        composefile_dict = {'version': '3.2', 'networks': {'celloNet': None}, 'services': {}}
        # valid worker_ip in db is like "tcp://x.x.x.x:2375"
        container_service_ip = host.worker_api.split(':')[1][2:]

        service_names = []
        orderer_service_names = []
        couchdb_service_names = []
        #  add for k8s (namespace) and docker deploy
        orderer_service_deploy_names = []
        sevices_dict = {}
        index = 0
        for orderer_org in network_config['orderer_org_dicts']:
            for hostname in orderer_org['ordererHostnames']:
                orderer_domain = orderer_org['domain']
                orderer_service_name = '.'.join([hostname, orderer_domain ])
                service_names.append(orderer_service_name)
                orderer_service_names.append(orderer_service_name)
                org_name = orderer_org['name']
                host_port = request_host_ports[index]
                index = index+1
                orderer_service_dict = self._construct_orderer_docker_service(net_id, org_name, orderer_domain, hostname,\
                                                                              network_config['fabric_version'], \
                                                                              host_port)
                sevices_dict.update(orderer_service_dict)

                # save orderer service endpoint to db
                # if container run failed, then delete network
                # according to reference, corresponding service endpoint
                # would be delete automatically
                orderer_service_endpoint = modelv2.ServiceEndpoint(id = uuid4().hex,
                                                           service_ip = container_service_ip,
                                                           service_port = host_port,
                                                           service_name = orderer_service_name,
                                                           service_type = 'orderer',
                                                           network = modelv2.BlockchainNetwork.objects.get(id=net_id)
                                                           )
                orderer_service_endpoint.save()

        for peer_org in network_config['peer_org_dicts']:
            org_name = peer_org['name']
            org_domain = peer_org['domain']
            for i in range(int(peer_org['peerNum'])):
                peer_name = 'peer{}'.format(i)
                peer_seq = ['couchdb', peer_name, org_name, org_domain]
                couchdb_service_name = '.'.join(peer_seq)
                service_names.append(couchdb_service_name)
                couchdb_service_names.append(couchdb_service_name)
                couch_host_port = request_host_ports[index]
                index = index + 1
                service_names.append(couchdb_service_name)
                couchdb_service_dict = self._construct_couchdb_docker_service(net_id, couchdb_service_name, \
                                                                network_config['fabric_version'],
                                                                couch_host_port)
                sevices_dict.update(couchdb_service_dict)
                peer_service_endpoint = modelv2.ServiceEndpoint(id=uuid4().hex,
                                                                       service_ip=container_service_ip,
                                                                       service_port=couch_host_port,
                                                                       service_name=couchdb_service_name,
                                                                       service_type='couchdb',
                                                                       network=modelv2.BlockchainNetwork.objects.get(id=net_id)
                                                                       )
                peer_service_endpoint.save()
        for peer_org in network_config['peer_org_dicts']:
            org_name = peer_org['name']
            org_domain = peer_org['domain']
            for i in range(int(peer_org['peerNum'])):
                peer_name = 'peer{}'.format(i)
                peer_seq = [peer_name, org_name, org_domain]
                peer_service_name = '.'.join(peer_seq)
                service_names.append(peer_service_name)
                host_ports = [request_host_ports[index], request_host_ports[index+1]]
                index = index+2
                depends_on = orderer_service_names + couchdb_service_names
                peer_service_dict = self._construct_peer_docker_service(net_id, org_name, org_domain, peer_name,\
                                                                              network_config['fabric_version'], \
                                                                              host_ports, depends_on)
                sevices_dict.update(peer_service_dict)
                for i in range(len(host_ports)):
                    peer_service_endpoint = modelv2.ServiceEndpoint(id=uuid4().hex,
                                                                       service_ip=container_service_ip,
                                                                       service_port=host_ports[i],
                                                                       service_name=peer_service_name,
                                                                       service_type='peer',
                                                                       peer_port_proto= PEER_PORT_GRPC if i == 0 else PEER_PORT_EVENT,
                                                                       network=modelv2.BlockchainNetwork.objects.get(id=net_id)
                                                                       )
                    peer_service_endpoint.save()

            ca_service_name = '.'.join(['ca', org_name, org_domain])
            service_names.append(ca_service_name)
            org_full_domain = '.'.join([org_name, org_domain])
            pk_path = '{net_dir}/crypto-config/peerOrganizations/{org_dir}/ca/'.\
                format(net_dir=net_dir, org_dir=org_full_domain)
            ca_key_file = self._get_ca_private_key(pk_path)
            host_port = request_host_ports[index]
            index = index + 1
            ca_service_dict = self._construct_ca_docker_service(net_id, org_name, org_domain, ca_key_file,\
                                        network_config['fabric_version'],
                                        host_port)
            sevices_dict.update(ca_service_dict)
            ca_service_endpoint = modelv2.ServiceEndpoint(id=uuid4().hex,
                                                                       service_ip=container_service_ip,
                                                                       service_port=host_port,
                                                                       service_name=ca_service_name,
                                                                       service_type='ca',
                                                                       network=modelv2.BlockchainNetwork.objects.get(id=net_id)
                                                                       )
            ca_service_endpoint.save()

        # TODO: first test 'solo'
        # if network_config['consensus_type'] == 'kafka':
        #     pass

        composefile_dict['services'].update(sevices_dict)
        deploy_dir = '{}/deploy/'.format(net_dir)
        if not os.path.exists(deploy_dir):
            os.makedirs(deploy_dir)
        composefile = '{}/docker-compose.yaml'.format(deploy_dir)


        with open(composefile, 'w') as f:
            yaml.dump(composefile_dict, f)

        # project = compose_get_project(project_dir = net_dir,
        #                                  host = host.worker_api,
        #                               project_name=net_id[:12])

        project = compose_get_project(project_dir=deploy_dir,
                                       host = host.worker_api,
                                      project_name=net_id[:12])

        containers = project.up(detached=True, timeout=5)

        return containers
    def update(self, network_config, request_host_ports):

        # only ensure network_files_dir is exist
        # suppose if no exception is raised during crypto generation,
        # then everything is OK.
        # below code is wrong, cause the network_files_dir is on worker node
        # network_files_dir = CELLO_WORKER_FABRIC_DIR + net_id
        # if not os.path.isdir(network_files_dir):
        #     raise IOError("blockchain network crypto-config \
        #                   and genesis block couldn't be found")

        net_id = network_config['id']# use network id 0-12 byte as name prefix
        net_dir = CELLO_MASTER_FABRIC_DIR + net_id
        host = network_config['host']
        composefile_dict = {'version': '3.2', 'networks': {'celloNet': None}, 'services': {}}
        # valid worker_ip in db is like "tcp://x.x.x.x:2375"
        container_service_ip = host.worker_api.split(':')[1][2:]

        service_names = []
        orderer_service_names = []
        couchdb_service_names = []
        # add for k8s (namespace) and docker deploy
        orderer_service_deploy_names = []
        sevices_dict = {}
        index = 0
        for orderer_org in network_config['orderer_org_dicts']:
            for hostname in orderer_org['ordererHostnames']:
                orderer_domain = orderer_org['domain']
                orderer_service_name = '.'.join([hostname, orderer_domain ])
                service_names.append(orderer_service_name)
                orderer_service_names.append(orderer_service_name)
                org_name = orderer_org['name']
                host_port = request_host_ports[index]
                index = index+1
                orderer_service_dict = self._construct_orderer_docker_service(net_id, org_name, orderer_domain, hostname,\
                                                                              network_config['fabric_version'], \
                                                                              host_port)
                sevices_dict.update(orderer_service_dict)

                # save orderer service endpoint to db
                # if container run failed, then delete network
                # according to reference, corresponding service endpoint
                # would be delete automatically
                orderer_service_endpoint = modelv2.ServiceEndpoint(id = uuid4().hex,
                                                           service_ip = container_service_ip,
                                                           service_port = host_port,
                                                           service_name = orderer_service_name,
                                                           service_type = 'orderer',
                                                           network = modelv2.BlockchainNetwork.objects.get(id=net_id)
                                                           )
                orderer_service_endpoint.save()

        for peer_org in network_config['peer_org_dicts']:
            org_name = peer_org['name']
            org_domain = peer_org['domain']
            for i in range(int(peer_org['peerNum'])):
                peer_name = 'peer{}'.format(i)
                peer_seq = ['couchdb', peer_name, org_name, org_domain]
                couchdb_service_name = '.'.join(peer_seq)
                service_names.append(couchdb_service_name)
                couchdb_service_names.append(couchdb_service_name)
                couch_host_port = request_host_ports[index]
                index = index + 1
                service_names.append(couchdb_service_name)
                couchdb_service_dict = self._construct_couchdb_docker_service(net_id, couchdb_service_name, \
                                                                              network_config['fabric_version'],
                                                                              couch_host_port)
                sevices_dict.update(couchdb_service_dict)
                peer_service_endpoint = modelv2.ServiceEndpoint(id=uuid4().hex,
                                                                       service_ip=container_service_ip,
                                                                       service_port=couch_host_port,
                                                                       service_name=couchdb_service_name,
                                                                       service_type='couchdb',
                                                                       network=modelv2.BlockchainNetwork.objects.get(id=net_id)
                                                                       )
                peer_service_endpoint.save()
        for peer_org in network_config['peer_org_dicts']:
            org_name = peer_org['name']
            org_domain = peer_org['domain']
            for i in range(int(peer_org['peerNum'])):
                peer_name = 'peer{}'.format(i)
                peer_seq = [peer_name, org_name, org_domain]
                peer_service_name = '.'.join(peer_seq)
                service_names.append(peer_service_name)
                host_ports = [request_host_ports[index], request_host_ports[index+1]]
                index = index+2
                depends_on = orderer_service_names + couchdb_service_names
                peer_service_dict = self._construct_peer_docker_service(net_id, org_name, org_domain, peer_name,\
                                                                              network_config['fabric_version'], \
                                                                              host_ports, depends_on)
                sevices_dict.update(peer_service_dict)
                for i in range(len(host_ports)):
                    peer_service_endpoint = modelv2.ServiceEndpoint(id=uuid4().hex,
                                                                       service_ip=container_service_ip,
                                                                       service_port=host_ports[i],
                                                                       service_name=peer_service_name,
                                                                       service_type='peer',
                                                                       peer_port_proto= PEER_PORT_GRPC if i == 0 else PEER_PORT_EVENT,
                                                                       network=modelv2.BlockchainNetwork.objects.get(id=net_id)
                                                                       )
                    peer_service_endpoint.save()

            ca_service_name = '.'.join(['ca', org_name, org_domain])
            service_names.append(ca_service_name)
            org_full_domain = '.'.join([org_name, org_domain])
            pk_path = '{net_dir}/crypto-config/peerOrganizations/{org_dir}/ca/'.\
                format(net_dir=net_dir, org_dir=org_full_domain)
            ca_key_file = self._get_ca_private_key(pk_path)
            host_port = request_host_ports[index]
            index = index + 1
            ca_service_dict = self._construct_ca_docker_service(net_id, org_name, org_domain, ca_key_file,\
                                        network_config['fabric_version'],
                                        host_port)
            sevices_dict.update(ca_service_dict)
            ca_service_endpoint = modelv2.ServiceEndpoint(id=uuid4().hex,
                                                                       service_ip=container_service_ip,
                                                                       service_port=host_port,
                                                                       service_name=ca_service_name,
                                                                       service_type='ca',
                                                                       network=modelv2.BlockchainNetwork.objects.get(id=net_id)
                                                                       )
            ca_service_endpoint.save()

        # TODO: first test 'solo'
        # if network_config['consensus_type'] == 'kafka':
        #     pass

        composefile_dict['services'].update(sevices_dict)
        deploy_dir = '{}/deploy/'.format(net_dir)

        os.system('cp {}/docker-compose.yaml {}/docker-compose-back.yaml'.format(deploy_dir,deploy_dir))

        composefile = '{}/docker-compose.yaml'.format(deploy_dir)


        with open(composefile, 'w') as f:
            yaml.dump(composefile_dict, f)

        # project = compose_get_project(project_dir = net_dir,
        #                                  host = host.worker_api,
        #                               project_name=net_id[:12])

        project = compose_get_project(project_dir=deploy_dir,
                                       host = host.worker_api,
                                      project_name=net_id[:12])

        containers = project.up(detached=True, timeout=5)

        os.system('cp {}/docker-compose-back.yaml {}/docker-compose.yaml'.format(deploy_dir,deploy_dir))

        composefile_back = '{}/docker-compose.yaml'.format(deploy_dir)

        f = open(composefile_back)
        yamlcomposefile = yaml.load(f)

        services_dict = yamlcomposefile['services']

        services_dict.update(sevices_dict)

        composefile_dict_back = {'version': '3.2', 'networks': {'celloNet': None}, 'services': {}}

        composefile_dict_back['services'].update(services_dict)
        f.close()

        with open(composefile_back, 'w') as f:
            yaml.dump(composefile_dict_back, f)

        return containers

    def delete(self, network):
        net_id = network.id
        host = network.host

        deploy_dir = CELLO_MASTER_FABRIC_DIR + net_id + '/deploy'
        composefile = '{}/docker-compose.yaml'.format(deploy_dir)

        if not os.path.exists(composefile):
            logger.info("network {} has no container running".format(net_id))
            return

        project = compose_get_project(project_dir=deploy_dir,
                                      host=host.worker_api,
                                      project_name=net_id[:12])
        # using project.down() of docker-compose directly
        # will also remove container images, but maybe chaincode
        # image and container will not be removed, because these
        # containers and images are not included in docker-compose.yaml
        project.down(ImageType_none,True)

        # TODO: remove chaincode containers and images
        # reference to docker_swarm.py '_clean_chaincode_images'
        # test if this is neccessary
        









































