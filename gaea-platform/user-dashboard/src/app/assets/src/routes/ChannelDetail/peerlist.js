
import React, { PureComponent, Fragment } from 'react';
import { routerRedux } from 'dva/router';
import {
    Card,
    Button,
    Table,
    Badge,
} from 'antd';
import { connect } from 'dva';
import styles from './ChannelDetail.less';
import {stringify} from "qs";
import { defineMessages, IntlProvider } from "react-intl";
import { getLocale } from "../../utils/utils";

const messages = defineMessages({
    pageTitle: {
        id: 'Channel.Detail.NodeList.pageTitle',
        defaultMessage: 'Node List',
    },
    colContainerName: {
        id: 'Channel.Detail.NodeList.colContainerName',
        defaultMessage: 'Container Name',
    },
    colNodeName: {
        id: 'Channel.Detail.NodeList.colNodeName',
        defaultMessage: 'Node Name',
    },
    healthy: {
        id: 'Channel.Detail.NodeList.healthy',
        defaultMessage: 'healthy',
    },
    buttonAdd: {
        id: 'Channel.Detail.NodeList.buttonAdd',
        defaultMessage: 'Add Node',
    },
    buttonBack: {
        id: 'Channel.Detail.NodeList.buttonBack',
        defaultMessage: 'Back',
    },
    nodeRole: {
        id: 'Channel.Detail.NodeList.nodeRole',
        defaultMessage: 'Node Role',
    },
});

const currentLocale = getLocale();
const intlProvider = new IntlProvider(
    { locale: currentLocale.locale, messages: currentLocale.messages },
    {}
);
const { intl } = intlProvider.getChildContext();

@connect(({ ChannelDetail, ChannelList, loading }) => ({
    ChannelDetail,
    loadingInfo: loading.models.ChannelDetail,
}))

export default class PeerList extends PureComponent {


    clickCancel = () => {
        this.props.dispatch(
            routerRedux.push({
                pathname: 'ChannelList',
            })
        );
    };

    onAddPeer = ()  =>{
        const {channelId}=this.props;
        this.props.dispatch(
            routerRedux.push({
                pathname: 'AddPeer',
                search: stringify({
                    id: channelId,
                })
            })
        )

    };


    render() {

        const {
            peers,
            loadingPeers,
        } = this.props;

        const deployColumns = [
            {
                title: intl.formatMessage(messages.colContainerName),
                dataIndex: 'docker',
                key: 'docker',
            },
            {
                title: intl.formatMessage(messages.colNodeName),
                dataIndex: 'name',
                key: 'peer',
            },
            {
                title: intl.formatMessage(messages.healthy),
                dataIndex: 'healthyState',
                key: 'healthyState',
                render: val => <Badge status={'success'} text={val} />,
            },
            {
                title: intl.formatMessage(messages.nodeRole),
                dataIndex: 'role',
                key: 'peerRole',
            },
        ];
        return (
            <div>
                <Card
                    title={intl.formatMessage(messages.pageTitle)}
                    bordered={false}
                >

                    <div className={styles.tableList}>
                        <Table
                            pagination={false}
                            loading={loadingPeers}
                            columns={deployColumns}
                            dataSource={peers}
                        />
                    </div>
                    <Button icon="rollback" type="primary" style={{ marginTop: 20 }} onClick={this.clickCancel}>
                        {intl.formatMessage(messages.buttonBack)}
                    </Button>
                    <Button icon="plus" type="primary" style={{ marginLeft: 8 }} onClick={this.onAddPeer}>
                        {intl.formatMessage(messages.buttonAdd)}
                    </Button>
                </Card>
            </div>
        );
    }
}
