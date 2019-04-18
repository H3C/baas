/*
 SPDX-License-Identifier: Apache-2.0
*/
import React, { Component, Fragment } from 'react';
import { Row, Col, Card, Radio, Icon } from 'antd';
import { connect } from 'dva';
import { Pie } from '../../components/Charts';
import styles from './index.less';
import PageHeaderLayout from '../../layouts/PageHeaderLayout';
import ChannelOverview from './channelOverview';
import ChaincodeOverview from './chaincodeOverview';
import TransactionRealtime from './transactionRealtime';
import TransactionList from './transactionlist';
import BlockList from './blocklist';
import {defineMessages, IntlProvider} from "react-intl";
import {getLocale} from "../../utils/utils";

const messages = defineMessages({
    overview:{
        id: 'Overview.Overview',
        defaultMessage: 'System Overview',
    },
    description:{
        id: 'Overview.Description',
        defaultMessage: 'The status of channels and chain codes in block chain system.',
    },
    txrealtime:{
        id: 'Overview.Txrealtime',
        defaultMessage: 'Real-time Transaction',
    },
    txlist:{
        id: 'Overview.Txlist',
        defaultMessage: 'Transaction',
    },
    blocklist:{
        id: 'Overview.Blocklist',
        defaultMessage: 'Block',
    },
    channeloverview:{
        id: 'Overview.ChannelOverview',
        defaultMessage: 'Channel',
    },
    chaincodeoverview:{
        id: 'Overview.ChaincodeOverview',
        defaultMessage: 'Chain Code',
    },
});

const currentLocale = getLocale();
const intlProvider = new IntlProvider(
    { locale: currentLocale.locale, messages: currentLocale.messages },
    {}
);
const { intl } = intlProvider.getChildContext();

const tabList = [
    {
        key: 'txrealtime',
        tab: intl.formatMessage(messages.txrealtime),
    },
    {
        key: 'txlist',
        tab: intl.formatMessage(messages.txlist),
    },
    {
        key: 'blocklist',
        tab: intl.formatMessage(messages.blocklist),
    },
    {
        key: 'channelOverview',
        tab: intl.formatMessage(messages.channeloverview),
    },
    {
        key: 'chaincodeOverview',
        tab: intl.formatMessage(messages.chaincodeoverview),
    },
];


@connect(({ overview, loading }) => ({
    overview,
    loadingChannels: loading.effects['overview/fetchChannels'],
    loadingChainCodes: loading.effects['overview/fetchChainCodes'],
}))
export default class Overview extends Component {
    state = {
        operationKey: 'txrealtime',
        hostTypeValue: 'type',
        networkTypeValue: 'type',
        operateStep: 0,
    };

    componentDidMount() {
        this.props.dispatch({
            type: 'overview/fetchChannels',
        });
        this.props.dispatch({
            type: 'overview/fetchChainCodes',
        });
    }

    onOperationTabChange = key => {
        this.setState({
            operationKey: key,
            operateStep: 0,
        });
    };

    render() {
        const {
            overview,
            loadingChannels,
            loadingChainCodes,
        } = this.props;

        const {
            allChannels,
            userCtCls,
            UploadCCs,
            installCCs,
            instantCCs,
            channels,
            txRealtime,
            channelIds,
            blocks,
            transactions
        } = overview;

        const allCls = Array.isArray(allChannels) ? allChannels : [];
        const userCls = Array.isArray(userCtCls) ? userCtCls : [];
        const UploadCcs = Array.isArray(UploadCCs) ? UploadCCs : [];
        const installCcs = Array.isArray(installCCs) ? installCCs : [];
        const instantCcs = Array.isArray(instantCCs) ? instantCCs : [];
        const txForRealtime = Array.isArray(txRealtime) ? txRealtime : [];
        //const blocksInfo = Array.isArray(blocks) ? blocks : [];
        //const txInfo = Array.isArray(transactions.trans) ? transactions.trans : [];
        const channelList = [];
        channels.map(channel => {
            if (-1 !== channelIds.indexOf(channel.id)) {
                channelList.push(channel);
            }
        });

        const channelProps = {
            allCls,
            userCls,
            loadingChannels
        };

        const chaincodeProps = {
            UploadCcs,
            installCcs,
            instantCcs,
            loadingChainCodes
        };

        const txlistProps = {
            channelList,
            transactions
        };

        const txrealtimeProps = {
            channelList,
            txForRealtime
        };

        const blocklistProps = {
            channelList,
            blocks
        };

        const contentList = {
            txlist: (
                <TransactionList {...txlistProps} />
            ),
            txrealtime: (
                <TransactionRealtime {...txrealtimeProps} />
            ),
            blocklist: (
                <BlockList {...blocklistProps}/>
            ),
            channelOverview: (
                <ChannelOverview {...channelProps}/>
            ),
            chaincodeOverview: (
                <ChaincodeOverview {...chaincodeProps}/>
            ),
        };

        return (
            <PageHeaderLayout
                title={ intl.formatMessage(messages.overview) }
                logo={<Icon type="home" style={{fontSize: 30, color: '#722ed1'}} />}
                content={ intl.formatMessage(messages.description) }
                tabList={tabList}
                tabActiveKey={this.state.operationKey}
                onTabChange={this.onOperationTabChange}
            >
                <Card bordered={false}>
                    {contentList[this.state.operationKey]}
                </Card>
            </PageHeaderLayout>
        );
    }
}
