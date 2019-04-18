

import os
import yaml
from modules.blockchain_network import CELLO_MASTER_FABRIC_DIR
from common.api_exception import BadRequest, NotFound
import logging
from common import log_handler, LOG_LEVEL
logger = logging.getLogger(__name__)


logger.setLevel(LOG_LEVEL)
logger.addHandler(log_handler)

class FileOperaterFailed(Exception):

    """*-1* `FileOperaterFailed`

    Raise if a resource open failed or read/write failed.
    """
    code = -1
    description = (
        'File Operater Failed '
    )


def commad_create_path(network_id):

    filepath = '{}{}'.format(CELLO_MASTER_FABRIC_DIR,network_id)

    logger.info("before commad_create_path: {}".format(filepath))
    try:
        os.system('mkdir -p {}'.format(filepath))
    except:
        error_msg='Network file create failed, networkid={}'.format(network_id)
        raise BadRequest(msg=error_msg)

    isSuccess = os.path.exists(filepath)
    logger.info(" is = {}".format(isSuccess))
    if not isSuccess:
        message = "commad_create_path: {} failed, is = {}".format(filepath,isSuccess)
        raise NotFound(msg = message)

    return filepath


def load_yaml_file():
    try:
        f = open('agent/docker/_compose_files/fabric-1.0/crypto-config.yaml')
        dataMap = yaml.load(f)
    except:
        raise BadRequest(msg = "load crypto-config.yaml file to data failed!")
    finally:
        f.close()
    return dataMap


def dump_crypto_config_yaml_file(filepath,peer_org_dicts,orderer_org_dicts):
    listOrderer = []
    listPeer = []

    try:
        dataNetwork = dict(OrdererOrgs=listOrderer,PeerOrgs=listPeer)

        for each_peer in peer_org_dicts:
            if each_peer['ca']:
                ca = dict(Country=each_peer['ca']['country'],Locality=each_peer['ca']['locality'],
                          Province=each_peer['ca']['province'])
            else:
                ca = {}
            listPeer.append(dict(Domain='{}.{}'.format(each_peer['name'], each_peer['domain']),
                                 Name=each_peer['name'][0:1].upper()+each_peer['name'][1:], CA=ca,
                            Template=dict(Count=each_peer['peerNum']), EnableNodeOUs=each_peer['enableNodeOUs']))

        for each_orderer in orderer_org_dicts:
            if each_orderer['ca']:
                ca = dict(Country=each_orderer['ca']['country'], Locality=each_orderer['ca']['locality'],
                          Province=each_orderer['ca']['province'])
            else:
                ca = {}
            specs = []
            for orderhost in each_orderer['ordererHostnames']:
                specs.append(dict(Hostname=orderhost))
            listOrderer.append(dict(Domain=each_orderer['domain'],
                                    Name=each_orderer['name'][0:1].upper()+each_orderer['name'][1:], CA=ca, Specs=specs))

        filename = '{}/crypto-config.yaml'.format(filepath)
    except:
        raise BadRequest(msg="cryptoconfit.yaml datas set error")

    try:
        f = open(filename,'w',encoding = 'utf-8')
    except IOError:
        error_msg='File open filed, can not open yaml file: {}.'.format(filename)
        raise BadRequest(msg=error_msg)

    try:
        yaml.dump(dataNetwork,f)
    except:
        error_msg = 'Yaml file dump filed, can not write date to  yaml file: {}.'.format(filename)
        raise BadRequest(msg=error_msg)

    f.close()

def dump_crypto_config_yaml_file_k8s(filepath,peer_org_dicts,orderer_org_dicts):
    listOrderer = []
    listPeer = []

    try:
        dataNetwork = dict(OrdererOrgs=listOrderer,PeerOrgs=listPeer)

        for each_peer in peer_org_dicts:
            if each_peer['ca']:
                ca = dict(Country=each_peer['ca']['country'],Locality=each_peer['ca']['locality'],Province=each_peer['ca']['province'])
            else :
                ca={}

            peer_specs = []
            for i in range(each_peer['peerNum']):
                hostname = 'peer{}'.format(i)
                svc_name = '{}-{}'.format(hostname, each_peer['name'])
                one_spec = dict(Hostname=hostname, SANS=[svc_name])
                peer_specs.append(one_spec)
            listPeer.append(dict(Domain='{}.{}'.format(each_peer['name'], each_peer['domain']),
                                 Name=each_peer['name'][0:1].upper()+each_peer['name'][1:], CA=ca,
                                 Specs=peer_specs, EnableNodeOUs=each_peer['enableNodeOUs']))

        for each_orderer in orderer_org_dicts:
            if each_orderer['ca']:
                ca = dict(Country=each_orderer['ca']['country'], Locality=each_orderer['ca']['locality'], Province=each_orderer['ca']['province'])
            else :
                ca={}
            specs = []
            for orderhost in each_orderer['ordererHostnames']:
                svc_name = '{}-{}'.format(orderhost, each_orderer['name'])
                specs.append(dict(Hostname=orderhost, SANS=[svc_name]))
            listOrderer.append(dict(Domain=each_orderer['domain'],
                                    Name=each_orderer['name'][0:1].upper()+each_orderer['name'][1:], CA=ca, Specs=specs))

        filename = '{}/crypto-config.yaml'.format(filepath)
    except:
        raise BadRequest(msg="cryptoconfit.yaml datas set error")

    try:
        f = open(filename,'w',encoding = 'utf-8')
    except IOError:
        error_msg='File open filed, can not open yaml file: {}.'.format(filename)
        raise BadRequest(msg=error_msg)

    try:
        yaml.dump(dataNetwork,f)
    except:
        error_msg = 'Yaml file dump filed, can not write date to  yaml file: {}.'.format(filename)
        raise BadRequest(msg=error_msg)

    f.close()

def dump_configtx_yaml_file(filepath,consensus_type,peer_org_dicts,orderer_org_dicts,fabric_version):
    DictApplication = {'Organizations':None}
    ListPeerOrganizations = []
    ListOrdererOrganizations = []
    OrdererAddress = []
    try:
        for each in orderer_org_dicts:
            for eachOrder in each['ordererHostnames']:
                OrdererAddress.append('{}.{}:7050'.format(eachOrder,each['domain']))

        DictOrderer={'BatchTimeout':'2s','Organizations':None,'Addresses':OrdererAddress,\
                        'OrdererType':consensus_type,'BatchSize':{'AbsoluteMaxBytes':'98 MB','MaxMessageCount':10,'PreferredMaxBytes':'512 KB'}}

        if consensus_type == 'kafka':
            DictOrderer['Kafka']=dict(Brokers=['kafka0:9092', 'kafka1:9092', 'kafka2:9092', 'kafka3:9092'])

        Va = fabric_version.replace('v','V')
        Vb = Va.replace('.', '_')

        #网络起不来，orderer的capabilities不支持V1_4. orderer目前只支持V1_1. 先写死。
        DictCapabilities = {'Global': {Vb: True}, 'Orderer': {'V1_1': True}, 'Application': {'V1_1': True}}

        for each in orderer_org_dicts:
            ListOrdererOrganizations.append(dict(MSPDir='crypto-config/ordererOrganizations/{}/msp'.format(each['domain']),
                                            Name='{}Org'.format(each['name'][0:1].upper()+each['name'][1:]),
                                                 ID='{}MSP'.format(each['name'][0:1].upper()+each['name'][1:])))

        for each in peer_org_dicts:
            ListPeerOrganizations.append(dict(MSPDir='crypto-config/peerOrganizations/{}.{}/msp'.format(each['name'], each['domain']),AnchorPeers=[{'Port': 7051, 'Host': 'peer0.{}.{}'.format(each['name'],each['domain'])}],
                                      Name='{}MSP'.format(each['name'][0:1].upper()+each['name'][1:]),
                                              ID='{}MSP'.format(each['name'][0:1].upper()+each['name'][1:])))

        ListOrganizations = ListOrdererOrganizations + ListPeerOrganizations

        #'TwoOrgsChannel':{'Application': {'Capabilities':{Vb:True},'Organizations':ListPeerOrganizations},'Consortium':'SampleConsortium'}
        #网络起不来，orderer的capabilities不支持V1_4. orderer目前只支持V1_1. 先写死。
        DictProfiles={'TwoOrgsOrdererGenesis':{'Orderer':{'BatchTimeout':'2s','Organizations':ListOrdererOrganizations,'Addresses':DictOrderer['Addresses'],\
                        'OrdererType':consensus_type,'Capabilities':{'V1_1':True},'BatchSize':DictOrderer['BatchSize']}, \
                            'Consortiums':{'SampleConsortium':{'Organizations':ListPeerOrganizations}}}}
        if consensus_type == 'kafka':
            DictProfiles['TwoOrgsOrdererGenesis']['Orderer']['Kafka']=dict(Brokers=['kafka0:9092', 'kafka1:9092', 'kafka2:9092', 'kafka3:9092'])

        dataConfig = dict(Application=DictApplication,Orderer=DictOrderer,Capabilities=DictCapabilities,Profiles=DictProfiles,Organizations=ListOrganizations)

        filename = '{}/configtx.yaml'.format(filepath)
    except:
        raise BadRequest(msg="configtx.yaml datas set error")

    try:
        f = open(filename, 'w', encoding='utf-8')
    except IOError:
        error_msg = 'File open filed, can not open yaml file: {}.'.format(filename)
        raise BadRequest(msg=error_msg)

    try:
        yaml.dump(dataConfig, f)
    except:
        error_msg = 'Yaml file dump filed, can not write date to  yaml file: {}.'.format(filename)
        raise BadRequest(msg=error_msg)

    f.close()

    return

def dump_configtx_yaml_file_k8s(filepath,consensus_type,peer_org_dicts,orderer_org_dicts,fabric_version):
    DictApplication = {'Organizations':None}
    ListPeerOrganizations = []
    ListOrdererOrganizations = []
    OrdererAddress = []
    try:
        for each in orderer_org_dicts:
            for eachOrder in each['ordererHostnames']:
                OrdererAddress.append('{}-{}:7050'.format(eachOrder,each['name']))

        DictOrderer={'BatchTimeout':'2s','Organizations':None,'Addresses':OrdererAddress,\
                        'OrdererType':consensus_type,'BatchSize':{'AbsoluteMaxBytes':'98 MB','MaxMessageCount':10,'PreferredMaxBytes':'512 KB'}}

        if consensus_type == 'kafka':
            DictOrderer['Kafka']=dict(Brokers=['kafka-0.kafka:9092', 'kafka-1.kafka:9092', 'kafka-2.kafka:9092', 'kafka-3.kafka:9092'])

        Va = fabric_version.replace('v','V')
        Vb = Va.replace('.', '_')


        # 网络起不来，orderer的capabilities不支持V1_4. orderer目前只支持V1_1. 先写死。
        DictCapabilities = {'Global': {Vb: True}, 'Orderer': {'V1_1': True}, 'Application': {'V1_1': True}}

        for each in orderer_org_dicts:
            ListOrdererOrganizations.append(dict(MSPDir='crypto-config/ordererOrganizations/{}/msp'.format(each['domain']),
                                      Name='{}Org'.format(each['name'][0:1].upper()+each['name'][1:]),
                                                 ID='{}MSP'.format(each['name'][0:1].upper()+each['name'][1:])))

        for each in peer_org_dicts:
            ListPeerOrganizations.append(dict(MSPDir='crypto-config/peerOrganizations/{}.{}/msp'.format(each['name'],each['domain']),
                                      AnchorPeers=[{'Port': 7051, 'Host': 'peer0-{}'.format(each['name'])}],
                                      Name='{}MSP'.format(each['name'][0:1].upper()+each['name'][1:]),
                                              ID='{}MSP'.format(each['name'][0:1].upper()+each['name'][1:])))

        ListOrganizations = ListOrdererOrganizations + ListPeerOrganizations

        #'TwoOrgsChannel':{'Application': {'Capabilities':{Vb:True},'Organizations':ListPeerOrganizations},'Consortium':'SampleConsortium'}
        DictProfiles={'TwoOrgsOrdererGenesis':{'Orderer':{'BatchTimeout':'2s','Organizations':ListOrdererOrganizations,'Addresses':DictOrderer['Addresses'],\
                        'OrdererType':consensus_type,'Capabilities':{'V1_1':True},'BatchSize':DictOrderer['BatchSize']}, \
                            'Consortiums':{'SampleConsortium':{'Organizations':ListPeerOrganizations}}}}
        if consensus_type == 'kafka':
            DictProfiles['TwoOrgsOrdererGenesis']['Orderer']['Kafka']=dict(Brokers=['kafka-0.kafka:9092', 'kafka-1.kafka:9092', 'kafka-2.kafka:9092', 'kafka-3.kafka:9092'])

        dataConfig = dict(Application=DictApplication,Orderer=DictOrderer,Capabilities=DictCapabilities,Profiles=DictProfiles,Organizations=ListOrganizations)

        filename = '{}/configtx.yaml'.format(filepath)
    except:
        raise BadRequest(msg="configtx.yaml datas set error")

    try:
        f = open(filename, 'w', encoding='utf-8')
    except IOError:
        error_msg = 'File open filed, can not open yaml file: {}.'.format(filename)
        raise BadRequest(msg=error_msg)

    try:
        yaml.dump(dataConfig, f)
    except:
        error_msg = 'Yaml file dump filed, can not write date to  yaml file: {}.'.format(filename)
        raise BadRequest(msg=error_msg)

    f.close()

    return

def fabric_ca_config_files(id, fabric_version, CELLO_MASTER_FABRIC_DIR, peer_org_dicts):
    try:
        fabric_version_dir = fabric_version.replace('.', '_')
        for each in peer_org_dicts:
            orgName = each['name']
            orgDomain = each['domain']
            peerPath = '{}{}/crypto-config/peerOrganizations/{}.{}/ca/'.format(CELLO_MASTER_FABRIC_DIR, id, orgName, orgDomain)
            os.system('cp /opt/fabric_tools/{}/fabric-ca-server-config.yaml {}'.format(fabric_version_dir, peerPath))
    except Exception:
        error_msg = 'cp fabric-ca-server-config.yaml to path {} failed.'.format(peerPath)
        raise BadRequest(msg=error_msg)
    return

