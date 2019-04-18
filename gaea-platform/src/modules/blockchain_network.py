from threading import Thread
import time
import socket
import shutil

from agent.docker.blockchain_network import NetworkOnDocker
from agent.k8s.blockchain_network import NetworkOnKubenetes
from modules.models import modelv2
from modules.organization import organizationHandler as org_handler
import datetime
from common import fabric_network_define as file_define
from common import CLUSTER_PORT_START, CLUSTER_PORT_STEP, WORKER_TYPE_K8S

import logging
import os
from subprocess import call
from common import log_handler, LOG_LEVEL
logger = logging.getLogger(__name__)


logger.setLevel(LOG_LEVEL)
logger.addHandler(log_handler)

PEER_NODE_HOSTPORT_NUM = 2
ORDERER_NODE_HOSTPORT_NUM = 1
CA_NODE_HOSTPORT_NUM = 1
COUCHDB_NODE_HOSTPORT_NUM = 1
PEER_NODE_HOSTPORT_NUM_WITH_CCLISTEN = 3

agent_cls = {
    'docker': NetworkOnDocker,
    'kubenetes': NetworkOnKubenetes
}

# CELLO_MASTER_FABRIC_DIR is mounted by nfs container as '/'
CELLO_MASTER_FABRIC_DIR = '/opt/fabric/'

class BlockchainNetworkHandler(object):
    """ Main handler to operate the cluster in pool

    """
    def __init__(self):
        self.host_agents = {
            'docker': NetworkOnDocker(),
            'kubernetes': NetworkOnKubenetes()
        }


    def _schema(self, doc, many=False):
        network_schema = modelv2.BlockchainNetworkSchema(many=many)
        return network_schema.dump(doc).data

    def schema(self, doc, many=False):
        return self._schema(doc, many)

    def endports_schema(self, doc, many=False):
        endports_schema = modelv2.ServiceEndpointSchema(many=many)
        return endports_schema.dump(doc).data

    # TODO: MODIFY THIS METHOD
    def find_free_start_ports(self, number, host):
        """ Find the first available port for a new cluster api

        This is NOT lock-free. Should keep simple, fast and safe!

        Check existing cluster records in the host, find available one.

        :param host_id: id of the host
        :param number: Number of ports to get
        :return: The port list, e.g., [7050, 7150, ...]
        """
        logger.debug("Find {} start ports ".format(number))


        networks_exists = modelv2.BlockchainNetwork.objects(host=host)
        ports_existed = [service.service_port for service in
                         modelv2.ServiceEndpoint.objects(network__in=networks_exists)]

        logger.debug("The ports existed: {}".format(ports_existed))
        # available host port range is 1~65535, this function adpots
        # start port is 7050, port step is 100, so available port number
        # is (65535-30000)/100=353, considering the network scale,
        # setting the most available host port is 300
        if len(ports_existed) + number >= 300:
            logger.warning("Too much ports are already in used.")
            return []
        candidates = [CLUSTER_PORT_START + i * CLUSTER_PORT_STEP
                      for i in range(len(ports_existed) + number)]

        result = list(filter(lambda x: x not in ports_existed, candidates))

        logger.debug("Free ports are {}".format(result[:number]))
        return result[:number]

    def delete(self, network):
        """ Delete a cluster instance

        Clean containers, remove db entry. Only operate on active host.

        :param id: id of the cluster to delete
        :param forced: Whether to removing user-using cluster, for release
        :return:
        """
        logger.debug("Delete cluster: id={}".format(network.id))
        network.update(set__status='deleting')
        host = network.host
        try:
            self.host_agents[host.type].delete(network)
            # remove cluster info from host
            logger.info("remove network from host, network:{}".format(network.id))
            host.update(pull__clusters=network.id)
            # if org has referenced network, remove
            for peer_org in network.peer_orgs:
                org_obj = modelv2.Organization.objects.get(id=peer_org)
                org_obj.update(unset__network=network.id)
            for orderer_org in network.orderer_orgs:
                org_obj = modelv2.Organization.objects.get(id=orderer_org)
                org_obj.update(unset__network=network.id)

            network.delete()
            filepath = '{}{}'.format(CELLO_MASTER_FABRIC_DIR, network.id)
            os.system('rm -rf {}'.format(filepath))
            return
        except Exception as e:
            logger.info("remove network {} fail from host".format(network.id))
            network.update(set__status = 'error')
            raise e



    def get_by_id(self, id):
        """ Get a host

        :param id: id of the doc
        :return: serialized result or obj
        """
        try:
            ins = modelv2.BlockchainNetwork.objects.get(id=id)
        except Exception:
            logger.warning("No network found with id=" + id)
            return None

        return ins

    def get_endpoints_list(self, filter_data={}):
        """ List orgs with given criteria

        :param filter_data: Image with the filter properties
        :return: iteration of serialized doc
        """
        logger.info("filter data {}".format(filter_data))

        network = modelv2.BlockchainNetwork.objects.get(id=filter_data)
        serviceEndpoints = modelv2.ServiceEndpoint.objects(network=network)
        return self.endports_schema(serviceEndpoints, many=True)

    def refresh_health(self, network):

        service_endpoints = modelv2.ServiceEndpoint.objects(network=network)
        if not service_endpoints:
            network.update(set__healthy=False)
        end_healthy = True
        healthy = False
        for ep in service_endpoints:
            # event port is not needed in fabric 1.4
            # don't do health check on event port to avoid health check fail on fabric 1.3 later
            if ep.service_type == 'peer' and ep.peer_port_proto == 'event':
                continue

            ip = ep.service_ip
            port = ep.service_port
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            try:
                sock.connect((ip, port))
                logger.info("connect {}:{} succeed".format(ip, port))
                healthy = True
                end_healthy = healthy and end_healthy
            except Exception as e:
                logger.error("connect {}:{} fail, reason {}".format(ip, port, e))
                healthy = False
                # break
            finally:
                sock.close()

        if not healthy:
            network.update(set__healthy=False)
            return
        else:
            network.update(set__healthy=True)
            return

    def _create_network(self, network_config, request_host_ports):
        net_id = network_config['id']
        host = network_config['host']
        network = modelv2.BlockchainNetwork.objects.get(id=net_id)

        try:
            self.host_agents[host.type].create(network_config, request_host_ports)
            # # service urls can only be calculated after service is create
            # if host.type == WORKER_TYPE_K8S:
            #     service_urls = self.host_agents[host.type] \
            #         .get_services_urls(net_id)
            # else:
            #     service_urls = self.gen_service_urls(net_id)

            network.update(set__status='running')
            host.update(add_to_set__clusters=[net_id])
            for peer_org in network_config['peer_org_dicts']:
                org_obj = modelv2.Organization.objects.get(id=peer_org['id'])
                org_obj.update(set__network=network)
            for orderer_org in network_config['orderer_org_dicts']:
                org_obj = modelv2.Organization.objects.get(id=orderer_org['id'])
                org_obj.update(set__network=network)
            logger.info("Create network OK, id={}".format(net_id))

            def check_health_work(network):
                time.sleep(180)
                self.refresh_health(network)

            t = Thread(target=check_health_work, args=(network,))
            t.start()
        except Exception as e:
            logger.error("network {} create failed for {}".format(net_id, e))
            # will not call self.delete(network) in case of nested exception
            self.delete(network)
            raise e

    def _update_network(self, network_config, request_host_ports):
        net_id = network_config['id']
        host = network_config['host']
        network = modelv2.BlockchainNetwork.objects.get(id=net_id)

        try:
            self.host_agents[host.type].update(network_config, request_host_ports)
            # # service urls can only be calculated after service is create
            # if host.type == WORKER_TYPE_K8S:
            #     service_urls = self.host_agents[host.type] \
            #         .get_services_urls(net_id)
            # else:
            #     service_urls = self.gen_service_urls(net_id)

            network.update(set__status='running')
            host.update(add_to_set__clusters=[net_id])
            for peer_org in network_config['peer_org_dicts']:
                org_obj = modelv2.Organization.objects.get(id=peer_org['id'])
                org_obj.update(set__network=network)

            logger.info("Create network OK, id={}".format(net_id))


        except Exception as e:
            logger.error("network {} update failed for {}".format(net_id, e))
            # will not call self.delete(network) in case of nested exception
            #self.delete(network)
            raise e
    def create(self, id, name, description, fabric_version,
            orderer_orgs, peer_orgs, host, consensus_type, create_ts):

        couchdb_enabled = False

        network = modelv2.BlockchainNetwork(id=id,
                                            name=name,
                                            description=description,
                                            fabric_version=fabric_version,
                                            orderer_orgs=orderer_orgs,
                                            peer_orgs=peer_orgs,
                                            host=host,
                                            consensus_type=consensus_type,
                                            create_ts=create_ts,
                                            status="creating")
        network.save()

        peer_org_dicts = []
        orderer_org_dicts = []
        for org_id in peer_orgs:
            peer_org_dict = org_handler().schema(org_handler().get_by_id(org_id))
            peer_org_dicts.append(peer_org_dict)
        for org_id in orderer_orgs:
            orderer_org_dict = org_handler().schema(org_handler().get_by_id(org_id))
            orderer_org_dicts.append(orderer_org_dict)

        logger.info(" before function file_define.commad_create_path,and path is")
        # create filepath with network_id at path FABRIC_DIR
        filepath = file_define.commad_create_path(id)
        print("filepath = {}".format(filepath))
        logger.info(" after function file_define.commad_create_path,and path is {}".format(filepath))

        if host.type == 'docker':
            # create crypto-config.yaml file at filepath
            file_define.dump_crypto_config_yaml_file(filepath, peer_org_dicts, orderer_org_dicts)

            # create configtx.yaml file
            file_define.dump_configtx_yaml_file(filepath, consensus_type, peer_org_dicts, orderer_org_dicts,
                                                fabric_version)
        else:
            # create crypto-config.yaml file at filepath
            file_define.dump_crypto_config_yaml_file_k8s(filepath, peer_org_dicts, orderer_org_dicts)

            # create configtx.yaml file
            file_define.dump_configtx_yaml_file_k8s(filepath, consensus_type, peer_org_dicts, orderer_org_dicts,
                                                fabric_version)


        # create channel-artifacts path
        blockGenesis_filepath = '{}{}/channel-artifacts'.format(CELLO_MASTER_FABRIC_DIR, id)
        try:
            os.system('mkdir -p {}'.format(blockGenesis_filepath))
        except:
            error_msg = 'blockGenesis_filepath file create failed.'
            # raise FileOperaterFailed(error_msg)

        try:
            fabric_version_dir = fabric_version.replace('.', '_')
            # change work dir to '/opt'
            # origin_dir = os.getcwd()
            os.chdir(filepath)
            # print(os.getcwd())
            # create certificates
            call(["/opt/fabric_tools/{}/cryptogen".format(fabric_version_dir), "generate", "--config=./crypto-config.yaml"])

            # create genesis.block and channel configuration blocks
            call(["/opt/fabric_tools/{}/configtxgen".format(fabric_version_dir), "-profile", "TwoOrgsOrdererGenesis", "-outputBlock",
                  "./channel-artifacts/genesis.block"])
            # call(["/opt/configtxgen","-profile","TwoOrgsChannel","-outputCreateChannelTx","./channel-artifacts/channel.tx","-channelID","mychannel"])
            # call(["/opt/configtxgen","-profile","TwoOrgsChannel","-outputAnchorPeersUpdate","./channel-artifacts/Org1MSPanchors.tx",\
            #  "-channelID","mychannel","-asOrg","Org1MSP"])
            # call(["/opt/configtxgen","-profile","TwoOrgsChannel","-outputAnchorPeersUpdate","./channel-artifacts/Org2MSPanchors.tx",\
            #  "-channelID","mychannel","-asOrg","Org2MSP"])

            # change back

            # for k8s orderer node to use genesis.block
            shutil.copy('{}/genesis.block'.format(blockGenesis_filepath), '{}{}/crypto-config/ordererOrganizations/'.
                        format(CELLO_MASTER_FABRIC_DIR, id))
            # os.chdir(origin_dir)
        except Exception as e:
            error_msg = 'create certificate or genesis block failed!'
            raise Exception(error_msg)

        try:
            # create fabric-ca-server-config.yaml file
            file_define.fabric_ca_config_files(id, fabric_version, CELLO_MASTER_FABRIC_DIR, peer_org_dicts)
        except:
            error_msg = 'create fabric_ca_config_files failed!.'
            raise Exception(error_msg)


        # use network model to get?
        # no. network models only have org ids, no details needed
        network_config = {'id':id, 'name': name, 'fabric_version': fabric_version,
                          'orderer_org_dicts': orderer_org_dicts, 'peer_org_dicts': peer_org_dicts,
                          'consensus_type': consensus_type, 'host':host}

        ### get fabric service ports
        peer_org_num = len(peer_org_dicts)
        peer_num = 0
        orderer_num = 0
        for org in peer_org_dicts:
            peer_num += org['peerNum']
        for org in orderer_org_dicts:
            orderer_num += len(org['ordererHostnames'])

        if host.type == 'docker':
            request_host_port_num = peer_org_num * CA_NODE_HOSTPORT_NUM + \
                                peer_num * PEER_NODE_HOSTPORT_NUM + \
                                peer_num * COUCHDB_NODE_HOSTPORT_NUM + \
                                orderer_num * ORDERER_NODE_HOSTPORT_NUM
        elif couchdb_enabled is True: # host_type is kubernetes
            request_host_port_num = peer_org_num * CA_NODE_HOSTPORT_NUM + \
                                    peer_num * PEER_NODE_HOSTPORT_NUM + \
                                    peer_num * COUCHDB_NODE_HOSTPORT_NUM + \
                                    orderer_num * ORDERER_NODE_HOSTPORT_NUM
        else:
            request_host_port_num = peer_org_num * CA_NODE_HOSTPORT_NUM + \
                                    peer_num * PEER_NODE_HOSTPORT_NUM + \
                                    orderer_num * ORDERER_NODE_HOSTPORT_NUM


        request_host_ports =  self.find_free_start_ports (request_host_port_num, host)
        if len(request_host_ports) != request_host_port_num:
            error_msg = "no enough ports for network service containers"
            logger.error(error_msg)
            raise Exception(error_msg)

        # create persistent volume path for peer and orderer node
        # TODO : code here

        t = Thread(target=self._create_network, args=(network_config, request_host_ports))
        t.start()

        return self._schema(network)

    def addorgtonetwork(self, id, peer_orgs):
        ins = modelv2.BlockchainNetwork.objects.get(id=id)

        host = ins.host
        consensus_type = ins.consensus_type
        fabric_version = ins.fabric_version
        name = ins.name
        peer_org_dicts = []
        orderer_org_dicts = []
        peer_orgs_temp = ins.peer_orgs

        couchdb_enabled = False

        for org_id in peer_orgs:
            peer_org_dict = org_handler().schema(org_handler().get_by_id(org_id))
            peer_org_dicts.append(peer_org_dict)
            peer_orgs_temp.append(org_id)

        #logger.info(" before function file_define.commad_create_path,and path is")
        # create filepath with network_id at path FABRIC_DIR
        filepath = file_define.commad_create_path(id)
        print("filepath = {}".format(filepath))

        fileorgpath = '{}/{}'.format(filepath,org_id)
        os.system('mkdir -p {}'.format(fileorgpath))
        #logger.info(" after function file_define.commad_create_path,and path is {}".format(filepath))

        if host.type == 'docker':
            # create crypto-config.yaml file at filepath
            file_define.dump_crypto_config_yaml_file(fileorgpath, peer_org_dicts, orderer_org_dicts)

            # create configtx.yaml file
            file_define.dump_configtx_yaml_file(fileorgpath, consensus_type, peer_org_dicts, orderer_org_dicts,
                                                fabric_version)
        else:
            # create crypto-config.yaml file at filepath
            file_define.dump_crypto_config_yaml_file_k8s(fileorgpath, peer_org_dicts, orderer_org_dicts)

            # create configtx.yaml file
            file_define.dump_configtx_yaml_file_k8s(fileorgpath, consensus_type, peer_org_dicts, orderer_org_dicts,
                                                fabric_version)

        try:
            # change work dir to '/opt'
            origin_dir = os.getcwd()
            os.chdir(filepath)
            print(os.getcwd())
            # create certificates
            call("/opt/fabric_tools/v1_1/cryptogen generate --config=%s/crypto-config.yaml" % fileorgpath, shell=True)

            os.chdir(origin_dir)
            os.system('rm -r {}'.format(fileorgpath))
        except:
            error_msg = 'create certificate or genesis block failed!'
            raise Exception(error_msg)

        ins.update(set__peer_orgs=peer_orgs_temp)

        try:
            # create fabric-ca-server-config.yaml file
            file_define.fabric_ca_config_files(id, fabric_version, CELLO_MASTER_FABRIC_DIR, peer_org_dicts)
        except:
            error_msg = 'create fabric_ca_config_files failed!.'
            raise Exception(error_msg)

        # use network model to get?
        # no. network models only have org ids, no details needed
        network_config = {'id':id, 'name': name, 'fabric_version': fabric_version,
                          'orderer_org_dicts': orderer_org_dicts, 'peer_org_dicts': peer_org_dicts,
                          'consensus_type': consensus_type, 'host':host}

        ### get fabric service ports
        peer_org_num = len(peer_org_dicts)
        peer_num = 0
        orderer_num = 0
        for org in peer_org_dicts:
            peer_num += org['peerNum']

        if host.type == 'docker':
            request_host_port_num = peer_org_num * CA_NODE_HOSTPORT_NUM + \
                                    peer_num * PEER_NODE_HOSTPORT_NUM + \
                                    peer_num * COUCHDB_NODE_HOSTPORT_NUM + \
                                    orderer_num * ORDERER_NODE_HOSTPORT_NUM
        elif couchdb_enabled is True:  # host_type is kubernetes
            request_host_port_num = peer_org_num * CA_NODE_HOSTPORT_NUM + \
                                    peer_num * PEER_NODE_HOSTPORT_NUM + \
                                    peer_num * COUCHDB_NODE_HOSTPORT_NUM + \
                                    orderer_num * ORDERER_NODE_HOSTPORT_NUM
        else:
            request_host_port_num = peer_org_num * CA_NODE_HOSTPORT_NUM + \
                                    peer_num * PEER_NODE_HOSTPORT_NUM + \
                                    orderer_num * ORDERER_NODE_HOSTPORT_NUM

        request_host_ports =  self.find_free_start_ports (request_host_port_num, host)
        if len(request_host_ports) != request_host_port_num:
            error_msg = "no enough ports for network service containers"
            logger.error(error_msg)
            raise Exception(error_msg)

        # create persistent volume path for peer and orderer node
        # TODO : code here

        t = Thread(target=self._update_network, args=(network_config, request_host_ports))
        t.start()

        return self._schema(ins)
    def createyamlforneworgs(self, id, peer_orgs):
        ins = modelv2.BlockchainNetwork.objects.get(id=id)

        host = ins.host
        consensus_type = ins.consensus_type
        fabric_version = ins.fabric_version
        peer_org_dicts = []
        orderer_org_dicts = []
        
        filepath = file_define.commad_create_path(id)
        print("filepath = {}".format(filepath))

        for org_id in peer_orgs:
            peer_org_dict = org_handler().schema(org_handler().get_by_id(org_id))
            peer_org_dicts.append(peer_org_dict)

            #logger.info(" before function file_define.commad_create_path,and path is")
            # create filepath with network_id at path FABRIC_DIR

            fileorgpath = '{}/{}'.format(filepath,org_id)
            os.system('mkdir -p {}/crypto-config/peerOrganizations/'.format(fileorgpath))
            #logger.info(" after function file_define.commad_create_path,and path is {}".format(filepath))

            if host.type == 'docker':
                # create crypto-config.yaml file at filepath
                file_define.dump_crypto_config_yaml_file(fileorgpath, peer_org_dicts, orderer_org_dicts)

                # create configtx.yaml file
                file_define.dump_configtx_yaml_file(fileorgpath, consensus_type, peer_org_dicts, orderer_org_dicts,
                                                    fabric_version)
            else:
                # create crypto-config.yaml file at filepath
                file_define.dump_crypto_config_yaml_file_k8s(fileorgpath, peer_org_dicts, orderer_org_dicts)

                # create configtx.yaml file
                file_define.dump_configtx_yaml_file_k8s(fileorgpath, consensus_type, peer_org_dicts, orderer_org_dicts,
                                                    fabric_version)

            try:
                # change work dir to '/opt'
                origin_dir = os.getcwd()
                os.chdir(fileorgpath)
                print(os.getcwd())

                os.system("export FABRIC_CFG_PATH=$PWD")
                mspid = '{}MSP'.format(peer_org_dict['name'][0:1].upper()+peer_org_dict['name'][1:])
                orgname = peer_org_dict['name']
                org_domain = peer_org_dict['domain']
                orgdir = '{}.{}'.format(orgname,org_domain)
                #call("/opt/fabric_tools/v1_1/cryptogen generate --config=%s/crypto-config.yaml" % fileorgpath, shell=True)
                os.system('cp -r {}/crypto-config/peerOrganizations/{} {}/crypto-config/peerOrganizations/'.format(filepath, orgdir, fileorgpath))
                call("/opt/fabric_tools/v1_1/configtxgen -printOrg %s > ../channel-artifacts/%s.json" % (mspid, orgname), shell=True)

                os.chdir(origin_dir)
                os.system('rm -r {}'.format(fileorgpath))
            except:
                error_msg = 'create certificate or genesis block failed!'
                raise Exception(error_msg)

        return self._schema(ins)
    def list(self, filter_data={}):
        logger.info("filter data {}".format(filter_data))
        networks = modelv2.BlockchainNetwork.objects(__raw__=filter_data)
        return self._schema(networks, many=True)





