import React, { PureComponent } from 'react';
import { connect } from 'dva';
import PropTypes from 'prop-types';
import { Form, Card, Button, Icon } from 'antd';
import { routerRedux } from 'dva/router';
import DescriptionList from 'components/DescriptionList';
import PageHeaderLayout from '../../layouts/PageHeaderLayout';
import moment from 'moment';
import styles from './networkdetail.less';
import StandardTable from 'components/StandardTableForNetWork';
import { defineMessages, IntlProvider } from "react-intl";
import { getLocale } from "../../utils/utils";

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
});
const currentLocale = getLocale();
const intlProvider = new IntlProvider(
    { locale: currentLocale.locale, messages: currentLocale.messages },
    {}
);
const { intl } = intlProvider.getChildContext();
const { Description } = DescriptionList;
const ButtonGroup = Button.Group;

@connect(({ networklist, loading}) => ({
    networklist,
    loading: loading.models.networklist,
}))

@Form.create()
export default class NetworkDetail extends PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            selectedRows: [],
            flash: false
        }
    }

    componentDidMount() {
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

    static contextTypes = {
        routes: PropTypes.array,
        params: PropTypes.object,
        location: PropTypes.object,
    };

    render() {
        const {
            networklist : {blockchain_networks},
            loading
        } = this.props;

        const columns = [
            {
                title: intl.formatMessage(messages.colName),
                dataIndex: 'name',
            },
            {
                title: intl.formatMessage(messages.colDescription),
                dataIndex: 'description',
            },
            {
                title: intl.formatMessage(messages.colType),
                dataIndex: 'type',
            },
        ];

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
                        <Description term={intl.formatMessage(messages.description)}>{curnetwork.description}</Description>
                        <Description term={intl.formatMessage(messages.fabricVersion)}>{curnetwork.fabric_version}</Description>
                        <Description term={intl.formatMessage(messages.consensus)}>{curnetwork.consensus_type}</Description>
                        <Description term={intl.formatMessage(messages.status)}>{curnetwork.status}</Description>
                        <Description term={intl.formatMessage(messages.host)}>{curnetwork.hostname}</Description>
                        <Description term={intl.formatMessage(messages.healthy)}>{curnetwork.healthy ? intl.formatMessage(messages.healthyNormal) : intl.formatMessage(messages.healthyFault)}</Description>
                        <Description term={intl.formatMessage(messages.createTime)}>{moment(curnetwork.create_ts).format('YYYY-MM-DD HH:mm:ss')}</Description>
                    </DescriptionList>
                </Card>
                <Card bordered={false} title={intl.formatMessage(messages.listName)}>
                    <StandardTable
                        loading={loading}
                        data={curnetwork}
                        columns={columns}
                    />
                </Card>
            </PageHeaderLayout>
        );
      }
  }
