import React, { PureComponent } from 'react';
import { connect } from 'dva';
import PropTypes from 'prop-types';
import { Form, Card, Button, Icon, Row, Col, Menu, Divider } from 'antd';
import { Chart, Geom, Axis, Tooltip, Legend } from 'bizcharts';
import { routerRedux } from 'dva/router';
import DescriptionList from 'components/DescriptionList';
import PageHeaderLayout from '../../layouts/PageHeaderLayout';
import moment from 'moment';
import styles from './networkdetail.less';
import StandardTable from 'components/StandardTableForNetWork';
import { defineMessages, IntlProvider } from "react-intl";
import { getLocale } from "../../utils/utils";
import { Modal } from "antd/lib/index";
import request from "../../utils/request";

const SubMenu = Menu.SubMenu;
const MenuItemGroup = Menu.ItemGroup;
const messages = defineMessages({
    pageTitle: {
        id: 'Network.DetailPageTitle',
        defaultMessage: 'Network Detail'
    },
    backButton: {
        id: 'Network.DetailBackButton',
        defaultMessage: 'Back'
    },
    description: {
        id: 'Network.DetailDescription',
        defaultMessage: 'Description'
    },
    fabricVersion: {
        id: 'Network.DetailFabricVersion',
        defaultMessage: 'Fabric Version'
    },
    consensus: {
        id: 'Network.DetailConsensus',
        defaultMessage: 'Consensus'
    },
    status: {
        id: 'Network.DetailStatus',
        defaultMessage: 'Status'
    },
    host: {
        id: 'Network.DetailHost',
        defaultMessage: 'Host'
    },
    healthy: {
        id: 'Network.DetailHealthy',
        defaultMessage: 'Healthy'
    },
    healthyNormal: {
        id: 'Network.DetailHealthyNormal',
        defaultMessage: 'Normal'
    },
    healthyFault: {
        id: 'Network.DetailHealthyFault',
        defaultMessage: 'Fault'
    },
    createTime: {
        id: 'Network.DetailCreationTime',
        defaultMessage: 'Creation Time'
    },
    listName: {
        id: 'Network.DetailListName',
        defaultMessage: 'Organizations List'
    },
    colName: {
        id: 'Network.DetailColName',
        defaultMessage: 'Organization Name'
    },
    colDescription: {
        id: 'Network.DetailColDesc',
        defaultMessage: 'Description'
    },
    colType: {
        id: 'Network.DetailColType',
        defaultMessage: 'Type'
    },
    mId: {
        id: 'Organization.Id',
        defaultMessage: 'ID'
    },
    mName: {
        id: 'Organization.Col.Name',
        defaultMessage: 'Name'
    },
    mDesc: {
        id: 'Organization.Col.Desc',
        defaultMessage: 'Description'
    },
    mDomain: {
        id: 'Organization.Col.Domain',
        defaultMessage: 'Domain'
    },
    mOrderHosts: {
        id: 'Organization.OrdererHostnames',
        defaultMessage: 'Orderer Host Name'
    },
    mPeerNumber: {
        id: 'Organization.PeerNumber',
        defaultMessage: 'Peer Number'
    },
    mType: {
        id: 'Organization.Col.Type',
        defaultMessage: 'Type'
    },
    mCountry: {
        id: 'Organization.Country',
        defaultMessage: 'Country'
    },
    mProvince: {
        id: 'Organization.Province',
        defaultMessage: 'Province'
    },
    mCity: {
        id: 'Organization.City',
        defaultMessage: 'City'
    },
    mTitle: {
        id: 'Organization.Info',
        defaultMessage: 'Organization Information'
    },
    mButtonOk: {
        id: 'Button.Ok',
        defaultMessage: 'Ok'
    }
});
const currentLocale = getLocale();
const intlProvider = new IntlProvider(
    { locale: currentLocale.locale, messages: currentLocale.messages },
    {}
);
const { intl } = intlProvider.getChildContext();
const { Description } = DescriptionList;
const ButtonGroup = Button.Group;
const orgDetail = ( keyVal, content ) => (
    <Row style={{borderBottom: 'solid', width: '450px'}}>
        <Col span={8}>
            <p style={{
                marginRight: 8,
                display: 'inline-block',
                color: '#720754',
                fontWeight: 'bolder',
            }}
            >
                {keyVal}
            </p>
        </Col>
        <Col span={16}>
            <p>{content}</p>
        </Col>
    </Row>
);

const CreateForm = Form.create()(props => {
    const {
        modalVisible,
        handleModalVisible,
        orgInfo,
    } = props;
    return (
        <Modal
            title={intl.formatMessage(messages.mTitle)}
            visible={modalVisible}
            onCancel={() => handleModalVisible()}
            destroyOnClose={true}
            footer={<Button type={'primary'} onClick={() => handleModalVisible()}>{intl.formatMessage(messages.mButtonOk)}</Button>}
        >
            <div>
                {orgDetail(intl.formatMessage(messages.mId), orgInfo.id)}
                {orgDetail(intl.formatMessage(messages.mName), orgInfo.name)}
                {orgDetail(intl.formatMessage(messages.mDesc), orgInfo.description)}
                {orgDetail(intl.formatMessage(messages.mDomain), orgInfo.domain)}
                {orgDetail(intl.formatMessage(messages.mType), orgInfo.type)}
                {
                    orgInfo.type === 'peer' ?
                        orgDetail(intl.formatMessage(messages.mPeerNumber), orgInfo.peerNum) :
                        orgDetail(intl.formatMessage(messages.mOrderHosts), orgInfo.ordererHostnames)
                }
                {orgDetail(intl.formatMessage(messages.mCountry), orgInfo.country)}
                {orgDetail(intl.formatMessage(messages.mProvince), orgInfo.province)}
                {orgDetail(intl.formatMessage(messages.mCity), orgInfo.locality)}
            </div>
        </Modal>
    )
});


@connect(({ networklist, loading}) => ({
    networklist,
    loading: loading.models.networklist,
}))

@Form.create()
export default class NetworkDetail extends PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            timeRange: 60,   //minute
            loop: 0,
            ip: '',
            orgName: '',
            orgInfo: {}
        }
    }

    componentWillMount() {
        const { dispatch } = this.props;
        const location = this.props.location;
        const search = new URLSearchParams(location.search);
        const netId = search.get('id');

        dispatch({
            type: 'networklist/fetchNetworkDetail',
            payload: {netId:netId}
        });
    }
    
    clickCancel = () => {
        this.props.dispatch(
            routerRedux.push({
                pathname: 'networklist',
            })
        );
    };

    menu = (orgs) => (
        orgs.map( org => {
            return (
                <SubMenu
                    title={
                        <span>
                            <Icon type="team" />
                            <span>{org.name}</span>
                        </span>
                    }
                    key={org.name}
                >
                    {
                        typeof(org.ca) !== 'undefined' ?
                            <MenuItemGroup title="ca">
                                {org.ca.map(peer => {
                                    return (
                                        <Menu.Item key={[peer.name, peer.ip]}>{peer.name}</Menu.Item>
                                    )
                                })}
                            </MenuItemGroup> : ''
                    }
                    {
                        typeof(org.peer) !== 'undefined' ?
                            <MenuItemGroup title="peer">
                                {org.peer.map( peer => {
                                    return (
                                        <Menu.Item key={[peer.name, peer.ip]}>{peer.name}</Menu.Item>
                                    )
                                })}
                            </MenuItemGroup> : ''
                    }
                    {
                        typeof(org.couchdb) !== 'undefined' ?
                            <MenuItemGroup title="couchdb">
                                {org.couchdb.map( peer => {
                                    return (
                                        <Menu.Item key={[peer.name, peer.ip]}>{peer.name}</Menu.Item>
                                    )
                                })}
                            </MenuItemGroup> : ''
                    }
                    {
                        typeof(org.orderer) !== 'undefined' ?
                            <MenuItemGroup title="orderer">
                                {org.orderer.map( peer => {
                                    return (
                                        <Menu.Item key={[peer.name, peer.ip]}>{peer.name}</Menu.Item>
                                    )
                                })}
                            </MenuItemGroup> : ''
                    }
                </SubMenu>
            )
        })
    );
    
    requestPeerInfo(networkId, name, ip ) {
        const now = new Date();
    
        const startTime = new Date();
    
        startTime.setTime(startTime.getTime() - ( this.state.timeRange - 1 ) * 60000);
    
        this.props.dispatch({
            type: 'networklist/fetchPeerInfo',
            payload: {
                netId: networkId,
                peerName: name,
                step: 30,
                ip: ip,
                start: Math.round(startTime.getTime() / 1000),
                end: Math.round(now.getTime() / 1000)
            }
        });
    };
    
    handleClick = (e) => {
        clearInterval(this.state.loop);
        const {
            networklist : {blockchain_networks},
        } = this.props;
        
        this.setState({orgName: e.keyPath[1]});
        const ip = e.key.split(',')[1];
        const name = e.key.split(',')[0];
        this.requestPeerInfo(blockchain_networks.id, name, ip);
        console.log('e',e);
        const loop = setInterval(() => {
            this.requestPeerInfo(blockchain_networks.id, name, ip);
        }, 10000);
        this.setState({
            loop: loop
        });
    };
    
    componentWillUnmount() {
        clearInterval(this.state.loop);
        this.props.dispatch({
            type: 'networklist/clearPeerInfo',
        });
    }
    
    onClickIp = () => {
        const { dispatch } = this.props;
        dispatch({
            type: 'networklist/fetchOrgByName',
            payload: { name: this.state.orgName }
        });
        this.handleModalVisible(true);
    };
    
    handleModalVisible = (flag) => {
        this.setState({
            modalVisible: flag
        });
    };
    
    render() {
        const {
            networklist : {blockchain_networks, peerInfo, orgInfo},
            loading
        } = this.props;
        
        this.setState({orgInfo: orgInfo});

        const curnetwork = typeof(blockchain_networks) === 'undefined' ? {
            consensus_type: '',
            create_ts: '',
            description: '',
            fabric_version: '',
            healthy: '',
            id: '',
            name: '',
            status: '',
            hostname: '',
            list: []
        } : blockchain_networks;
    
        const orgs = typeof(curnetwork.list) === 'undefined' ? [] : curnetwork.list;
    
        const { modalVisible } = this.state;
    
        let dataExist = false;
        let cpuForPeer = {};
        let memForPeer = {};
        let netForPeer = [];
        let peerName = '';
        let peerIp = '';
        let netMax = 0;
        let memMax = 0;
        let cpuMax = 0;
        
        if (typeof(peerInfo.cpuForPeer) !== 'undefined') {
            dataExist = true;
            cpuForPeer = peerInfo.cpuForPeer;
            memForPeer = peerInfo.memForPeer;
            netForPeer = peerInfo.netForPeer;
            peerName = peerInfo.name;
            peerIp = peerInfo.ip;
            netMax = peerInfo.netMax;
            memMax = peerInfo.memMax;
            cpuMax = peerInfo.cpuMax;
        }
        else {
            cpuForPeer.data = [];
            cpuForPeer.limit = 0;
            memForPeer.data = [];
            memForPeer.limit = 0;
            netForPeer.data = [];
        }
    
        const parentMethods = {
            handleModalVisible: this.handleModalVisible,
        };
        
        const scaleCPU = {
            time: {
                alias: 'time',
                type: "time",
                mask: "hh:mm",
                tickCount: 10,
                nice: false
            },
            used: {
                alias: 'used',
                min: 0,
                max: cpuMax
            },
            type: {
                type: "cat"
            }
        };
    
        const scaleMem = {
            time: {
                alias: 'time',
                type: "time",
                mask: "hh:mm",
                tickCount: 10,
                nice: false
            },
            used: {
                alias: 'used',
                min: 0,
                max: memMax
            },
            type: {
                type: "cat"
            }
        };
    
        const scaleNet = {
            time: {
                alias: 'time',
                type: "time",
                mask: "hh:mm",
                tickCount: 10,
                nice: false
            },
            used: {
                alias: 'used',
                min: 0,
                max: netMax
            },
            type: {
                type: "cat"
            }
        };
        
        let chart;
        return (
            <PageHeaderLayout
                title={intl.formatMessage(messages.pageTitle)}
                content=''
                logo={<Icon type="cluster" style={{fontSize: 30, color: '#722ed1'}} />}
            >
                <Card bordered={false}>
                    <DescriptionList size="large" style={{ marginBottom: 32 }}>
                        <ButtonGroup>
                            <Button onClick={this.clickCancel}><Icon type="left" />{intl.formatMessage(messages.backButton)}</Button>
                        </ButtonGroup>
                    </DescriptionList>

                    <DescriptionList size="large" title={curnetwork.name} style={{ marginBottom: 32 }}>
                        <Description term={'id'}>{curnetwork.id}</Description>
                        <Description term={intl.formatMessage(messages.description)}>{curnetwork.description}</Description>
                        <Description term={intl.formatMessage(messages.fabricVersion)}>{curnetwork.fabric_version}</Description>
                        <Description term={intl.formatMessage(messages.consensus)}>{curnetwork.consensus_type}</Description>
                        <Description term={intl.formatMessage(messages.status)}>{curnetwork.status}</Description>
                        <Description term={intl.formatMessage(messages.host)}>{curnetwork.hostname}</Description>
                        <Description term={intl.formatMessage(messages.healthy)}>{curnetwork.healthy ? intl.formatMessage(messages.healthyNormal) : intl.formatMessage(messages.healthyFault)}</Description>
                        <Description term={intl.formatMessage(messages.createTime)}>{moment(curnetwork.create_ts).format('YYYY-MM-DD HH:mm:ss')}</Description>
                    </DescriptionList>
                </Card>
                <Card bordered={false} title={intl.formatMessage(messages.listName)} style={{marginTop: 20}}>
                    <Row gutter={30} >
                        <Col span={5}>
                            <div>
                                <Menu onClick={this.handleClick} style={{ width: 'auto' }} mode="vertical">
                                    {this.menu(orgs)}
                                </Menu>
                            </div>
                        </Col>
                        <Col span={19}>
                            <div style={{textAlign: 'center', fontSize: 17, fontWeight: 'bold', color: '#646464', marginBottom: 20}}>
                                <span>
                                  {peerName}
                                </span>
                                {dataExist ? <Divider type="vertical" style={{borderWidth: '3px'}} /> : ''}
                                <a onClick={this.onClickIp}>
                                    {peerIp}
                                </a>
                            </div>
                            <div style={{marginRight: 100}}>
                                <Chart
                                    height={200}
                                    data={cpuForPeer.data}
                                    scale={scaleCPU}
                                    forceFit
                                    onGetG2Instance={g2Chart => {
                                        chart = g2Chart;
                                    }}
                                >
                                    <Tooltip/>
                                    {cpuForPeer.data.length !== 0 ? <Axis/> : ''}
                                    <Legend/>
                                    <Geom
                                        type={'area'}
                                        position={'time*used'}
                                        color={['type', ['#fd8200']]}
                                        shape='smooth'
                                        size={2}
                                    />
                                </Chart>
                            </div>
                            {
                                dataExist ?
                                    <div  style={{backgroundColor: '#fd8200', fontWeight:'bold', color: '#fffbfb'}} >
                                        <span style={{marginLeft: '25%'}}>
                                            core :
                                        </span>
                                                <span style={{marginLeft: 5}}>
                                            {cpuForPeer.limit}
                                        </span>
                                                <span style={{marginLeft: '35%'}}>
                                            used :
                                        </span>
                                                <span style={{marginLeft: 5}}>
                                            {cpuForPeer.data.length > 0 ? cpuForPeer.data[cpuForPeer.data.length - 1].used : ''}
                                        </span>
                                    </div> : ''
                            }
                            
                            <div style={{marginRight: 100, marginTop: 100}}>
                                <Chart
                                    height={200}
                                    data={memForPeer.data}
                                    scale={scaleMem}
                                    forceFit
                                    onGetG2Instance={g2Chart => {
                                        chart = g2Chart;
                                    }}
                                >
                                    <Tooltip/>
                                    {memForPeer.data.length !== 0 ? <Axis/> : ''}
                                    <Legend/>
                                    <Geom
                                        type={'area'}
                                        position={'time*used'}
                                        color={['type', ['#616161']]}
                                        shape='smooth'
                                        size={2}
                                    />
                                </Chart>
                            </div>
                            {
                                dataExist ?
                                    <div  style={{backgroundColor: '#616161', fontWeight:'bold', color: '#fffbfb'}} >
                                        <span style={{marginLeft: '25%'}}>
                                            Memory :
                                        </span>
                                                <span style={{marginLeft: 5}}>
                                            {memForPeer.limit + ' MB'}
                                        </span>
                                                <span style={{marginLeft: '35%'}}>
                                            used :
                                        </span>
                                                <span style={{marginLeft: 5}}>
                                            {memForPeer.data.length > 0 ? memForPeer.data[memForPeer.data.length - 1].used + ' MB' : ''}
                                        </span>
                                    </div> : ''
                            }
                            
                            <div style={{marginTop: 100, marginRight: 100}}>
                                <Chart
                                    height={200}
                                    data={netForPeer.data}
                                    scale={scaleNet}
                                    forceFit
                                    onGetG2Instance={g2Chart => {
                                        chart = g2Chart;
                                    }}
                                >
                                    <Tooltip/>
                                    {netForPeer.data.length !== 0 ? <Axis/> : ''}
                                    <Legend/>
                                    <Geom
                                        type={'area'}
                                        position={'time*used'}
                                        color={['type', ['#7b056f']]}
                                        shape='smooth'
                                        size={2}
                                    />
                                </Chart>
                            </div>
                            {
                                dataExist ?
                                    <div  style={{backgroundColor: '#7b056f', fontWeight:'bold', color: '#fffbfb', marginBottom: 100}} >
                                        <span style={{marginLeft: '25%'}}>
                                            rx :
                                        </span>
                                                <span style={{marginLeft: 5}}>
                                            {netForPeer.data.length > 0 ? netForPeer.data[netForPeer.data.length - 1].used + ' KB' : ''}
                                        </span>
                                    </div> : ''
                            }
                            
                        </Col>
                    </Row>
                </Card>
                <CreateForm {...parentMethods} modalVisible={modalVisible} orgInfo={this.state.orgInfo} />
            </PageHeaderLayout>
        );
    }
}
