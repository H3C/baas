import { queryNetworks, removeNetwork, addNetwork, queryNetwork, netAddOrg } from '../services/network_api';
import { routerRedux } from "dva/router";
import { queryHost, queryHosts } from "../services/host.js";
import { queryOrgList } from "../services/orgs_api";
import {Modal} from "antd/lib/index";
import { defineMessages, IntlProvider } from "react-intl";
import { getLocale } from "../utils/utils";

const messages = defineMessages({
    fetchOrgFail: {
        id: 'Network.FetchOrgFail',
        defaultMessage: 'Failed to get organization information',
    },
    fetchNetworkFail: {
        id: 'Network.FetchNetworkFail',
        defaultMessage: 'Failed to get network information',
    },
    fetchHostFail: {
        id: 'Network.FetchHostFail',
        defaultMessage: 'Failed to get host information',
    },
    createNetworkFail: {
        id: 'Network.CreateNetworkFail',
        defaultMessage: 'Failed to create the network',
    },
    deleteNetworkFail: {
        id: 'Network.deleteNetworkFail',
        defaultMessage: 'Failed to delete the network',
    },
    appendOrgFail: {
        id: 'Network.appendOrgFail',
        defaultMessage: 'Failed to append organization',
    },
});

const currentLocale = getLocale();
const intlProvider = new IntlProvider(
    { locale: currentLocale.locale, messages: currentLocale.messages },
    {}
);
const { intl } = intlProvider.getChildContext();

export default {
    namespace: 'networklist',

    state: {
        blockchain_networks: [],
    },

    effects: {
        *fetch({ payload }, { call, put }) {
            const response = yield call(queryNetworks, payload);
            if (typeof(response.error_code) !== 'undefined' && response.error_code) {
                Modal.warning({
                    title:intl.formatMessage(messages.fetchNetworkFail),
                    content: response.msg
                });
            }
            yield put({
                type: 'save',
                payload: response,
            });
        },
        *fetchForAddNetwork({ payload }, { call, put }) {
            const orgs = yield call(queryOrgList);

            if (typeof(orgs.error_code) !== 'undefined' && orgs.error_code) {
                Modal.warning({
                    title:intl.formatMessage(messages.fetchOrgFail),
                    content: orgs.msg
                });
                return;
            }

            //请求主机信息
            const hosts = yield call(queryHosts);
            if (hosts.code !== 200) {
                Modal.warning({
                    title:intl.formatMessage(messages.fetchHostFail),
                });
                return;
            }

            const baseInfor = {
                orgs: orgs.organizations,
                hosts: hosts.data
            };

            yield put({
                type: 'save',
                payload: baseInfor,
            });
        },
        *addnetwork({ payload, callback }, { call, put }) {
            const response = yield call(addNetwork, payload);

            if (typeof(response.error_code) !== 'undefined' && response.error_code) {
                Modal.warning({
                    title:intl.formatMessage(messages.createNetworkFail),
                    content: response.msg
                });
                return;
            }

            yield put(
                routerRedux.push({
                    pathname: 'networklist',
                })
            );
            if (callback) callback();
        },
        *fetchNetworkDetail({ payload }, { call, put }){
            const network = yield call(queryNetwork, payload.netId);
            let networkDetail = {};
            if (typeof(network.error_code) !== 'undefined'){
                Modal.warning({
                    title:intl.formatMessage(messages.fetchNetworkFail),
                    content: network.msg
                });
                networkDetail = {
                    consensus_type: '',
                    create_ts: '',
                    description: '',
                    fabric_version: '',
                    healthy: '',
                    id: '',
                    name: '',
                    status: ''
                };
            }
            else {
                //构造网络详情结构信息
                networkDetail = {
                    consensus_type: network.blockchain_network.consensus_type,
                    create_ts: network.blockchain_network.create_ts,
                    description: network.blockchain_network.description,
                    fabric_version: network.blockchain_network.fabric_version,
                    healthy: network.blockchain_network.healthy,
                    id: network.blockchain_network.id,
                    name: network.blockchain_network.name,
                    status: network.blockchain_network.status
                };
            }


            //请求主机信息
            const host = yield call(queryHost, {id: network.blockchain_network.host_id});

            if (typeof(host.data) === 'undefined'){
                networkDetail.hostname = 'unknown';
                Modal.warning({
                    title:intl.formatMessage(messages.fetchHostFail),
                });
            }
            else {
                networkDetail.hostname = host.data.name;
            }

            //请求orderer组织信息,peer组织信息
            const orgs = yield call(queryOrgList);

            if (typeof(orgs.error_code) !== 'undefined'){
                networkDetail.orderer_orgs = [];
                networkDetail.peer_orgs = [];
                Modal.warning({
                    title:intl.formatMessage(messages.fetchOrgFail),
                    content: orgs.msg
                });
            }
            else {
                const Orgs = [];
                const orgsInfor = orgs.organizations;
                for (const org in orgsInfor){
                    if (orgsInfor[org].blockchain_network_id === network.blockchain_network.id) {
                        Orgs.push(orgsInfor[org]);
                    }
                }

                networkDetail.list = Orgs;
            }

            yield put({
                type: 'save',
                payload: networkDetail
            })
        },
        *remove({ payload, callback }, { call, put }) {
            const response = yield call(removeNetwork, payload);
            if (typeof(response.error_code) !== 'undefined'){
                Modal.warning({
                    title:intl.formatMessage(messages.deleteNetworkFail),
                    content: response.msg
                });
            }
            yield put({type: 'fetch'});
        },
        *netaddorg({ payload, callback }, { call, put }) {
            const response = yield call(netAddOrg, payload);

            if (typeof(response.error_code) !== 'undefined' && response.error_code) {
                Modal.warning({
                    title:intl.formatMessage(messages.appendOrgFail),
                    content: response.msg
                });
                return;
            }

            yield put(
                routerRedux.push({
                    pathname: 'networklist',
                })
            );
            if (callback) callback();
        },
    },

    reducers: {
        save(state, action) {
            return {
                ...state,
                blockchain_networks: action.payload,
            };
        },
    },
};
