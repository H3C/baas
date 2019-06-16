import React, { PureComponent, Fragment } from 'react';
import { routerRedux } from 'dva/router';
import { Form, Card, Button, Table, Drawer, Col, Row, Select, Input, DatePicker } from 'antd';
import { Resizable } from 'react-resizable';
import styles from './index.less';
import { connect } from 'dva';
import Ellipsis from '../../components/Ellipsis'
import { stringify } from "qs";
import moment from 'moment';
import {defineMessages, IntlProvider} from "react-intl";
import {getLocale} from "../../utils/utils";

const FormItem = Form.Item;
const { RangePicker } = DatePicker;

const pStyle = {
    fontSize: 16,
    color: 'rgba(0,0,0,0.85)',
    lineHeight: '24px',
    display: 'block',
    marginBottom: 16
};

const messages = defineMessages({
    hash:{
        id: 'Overview.Txlist.Hash',
        defaultMessage: 'Proposal Hash',
    },
    ccName:{
        id: 'Overview.Txlist.CCName',
        defaultMessage: 'Chain Code',
    },
    ccVersion:{
        id: 'Overview.Txlist.CCVersion',
        defaultMessage: 'Chain Code Version',
    },
    endorse:{
        id: 'Overview.Txlist.Endorse',
        defaultMessage: 'Endorser',
    },
    chaincode:{
        id: 'Overview.Txlist.ChainCode',
        defaultMessage: 'Chain Code',
    },
    write:{
        id: 'Overview.Txlist.Write',
        defaultMessage: 'Write Set',
    },
    read:{
        id: 'Overview.Txlist.Read',
        defaultMessage: 'Read Set',
    },
    txId:{
        id: 'Overview.Txlist.TxId',
        defaultMessage: 'Tx Id',
    },
    msp:{
        id: 'Overview.Txlist.Msp',
        defaultMessage: 'Creator MSP',
    },
    txTime:{
        id: 'Overview.Txlist.TxTime',
        defaultMessage: 'Tx Time',
    },
    txType:{
        id: 'Overview.Txlist.TxType',
        defaultMessage: 'Tx Type',
    },
    channel:{
        id: 'Overview.Txlist.Channel',
        defaultMessage: 'Select Channel',
    },
    selChannel:{
        id: 'Overview.Txlist.SelChannel',
        defaultMessage: 'Please select the channel',
    },
    peer:{
        id: 'Overview.Txlist.Peer',
        defaultMessage: 'Select Node',
    },
    selPeer:{
        id: 'Overview.Txlist.SelPeer',
            defaultMessage: 'Select Node',
    },
    select:{
        id: 'Overview.Txlist.Select',
        defaultMessage: 'please select',
    },
    condition:{
        id: 'Overview.Txlist.Condition',
        defaultMessage: 'Condition',
    },
    selCondition:{
        id: 'Overview.Txlist.SelCondition',
        defaultMessage: 'Please select the condition',
    },
    sixhtx:{
        id: 'Overview.Txlist.6Htxinfo',
        defaultMessage: 'Transactions within 6 hours',
    },
    block:{
        id: 'Overview.Txlist.Block',
        defaultMessage: 'Block Number',
    },
    startTime:{
        id: 'Overview.Txlist.StartTime',
        defaultMessage: 'Starting Time',
    },
    endTime:{
        id: 'Overview.Txlist.EndTime',
        defaultMessage: 'End Time',
    },
    selTime:{
        id: 'Overview.Txlist.SelTime',
        defaultMessage: 'Select Time',
    },
    blocknum:{
        id: 'Overview.Txlist.BlockNum',
        defaultMessage: 'Latest Block Number',
    },
    inputQuery:{
        id: 'Overview.Txlist.InputQuery',
        defaultMessage: 'Please input the Block Number',
    },
    input:{
        id: 'Overview.Txlist.Input',
        defaultMessage: 'please input',
    },
    query:{
        id: 'Overview.Txlist.Query',
        defaultMessage: 'Query',
    },
    list:{
        id: 'Overview.Txlist.List',
        defaultMessage: 'Transaction List',
    },
    txinfo:{
        id: 'Overview.Txlist.Txinfo',
        defaultMessage: 'Tx info',
    },
    name:{
        id: 'Overview.Txlist.Name',
        defaultMessage: 'Channel Name',
    },
});

const currentLocale = getLocale();
const intlProvider = new IntlProvider(
    { locale: currentLocale.locale, messages: currentLocale.messages },
    {}
);
const { intl } = intlProvider.getChildContext();

const ResizeableTitle = (props) => {
    const { onResize, width, ...restProps } = props;

    if (!width) {
        return <th {...restProps} />;
    }
    return (
        <Resizable width={width} height={0} onResize={onResize}>
            <th {...restProps} />
        </Resizable>
    );
};

const DescriptionItem = ({title, content}) => (
    <div

    >
        <Row gutter = {16}>
            <Col span={4}>
                <p
                    style={{
                        marginRight: 8,
                        display: 'inline-block',
                        color: '#720754',
                        fontWeight: 'bolder'
                    }}
                >
                    { title }:
                </p>
            </Col>
            <Col span={20}>
                {content}
            </Col>
        </Row>
    </div>
);

const Actions = ( {number, proposal_hash, endorsements, chaincode, rwsets} ) => (
    <div
        style = {{
            fontSize: 14,
            lineHeight: '22px',
            marginBottom: 7,
            color: 'rgba(0,0,0,0.65)'
        }}
    >
        <Row gutter={16}>
            <Col span={24} style={{backgroundColor: '#a4578e'}}>
                <div className={styles.textCenter} >
                    { 'action ' + number }:
                </div>
            </Col>
        </Row>
        <Row gutter={16} style={{borderLeft: 'solid', borderRight: 'solid', borderColor:'#a4578e'}}>
            <Col span={4}>
                <p
                    style={{
                        marginRight: 8,
                        display: 'inline-block',
                        color: '#720754',
                        fontWeight: 'bolder'
                    }}
                >
                    {  intl.formatMessage(messages.hash)  }:
                </p>
            </Col>
            <Col>
                {proposal_hash}
            </Col>
        </Row>
        <Row gutter={16} style={{borderLeft: 'solid', borderRight: 'solid', borderColor:'#a4578e'}}>
            <Col span={4}>
                <p
                    style={{
                        marginRight: 8,
                        display: 'inline-block',
                        color: '#720754',
                        fontWeight: 'bolder'
                    }}
                >
                    { intl.formatMessage(messages.ccName) }:
                </p>
            </Col>
            <Col span={20}>
                { chaincode.name }
            </Col>
        </Row>
        <Row gutter={16} style={{borderLeft: 'solid', borderRight: 'solid', borderColor:'#a4578e'}}>
            <Col span={4}>
                <p
                    style={{
                        marginRight: 8,
                        display: 'inline-block',
                        color: '#720754',
                        fontWeight: 'bolder'
                    }}
                >
                    { intl.formatMessage(messages.ccVersion) }:
                </p>
            </Col>
            <Col span={20}>
                { chaincode.version }
            </Col>
        </Row>
        <Row gutter={16} style={{borderLeft: 'solid', borderRight: 'solid', borderColor:'#a4578e'}}>
            <Col span={4}>
                <p
                    style={{
                        marginRight: 8,
                        display: 'inline-block',
                        color: '#720754',
                        fontWeight: 'bolder'
                    }}
                >
                    { intl.formatMessage(messages.endorse) }:
                </p>
            </Col>
            <Col span={20}>
                { endorsements.join(',') }
            </Col>
        </Row>
        <Row gutter={16} style={{borderLeft: 'solid', borderRight: 'solid', borderColor:'#a4578e'}}>
            <Col span={4}>
                <p
                    style={{
                        marginRight: 8,
                        display: 'inline-block',
                        color: '#720754',
                        fontWeight: 'bolder',
                    }}
                >
                    { intl.formatMessage(messages.read) }:
                </p>
            </Col>
            <Col span={20}>
                { rwsets.map( rwset => {
                    return (<div>
                        { intl.formatMessage(messages.chaincode) }: { rwset.namespace }<br/>
                        {rwset.reads.map( read => {
                            return (<div>
                                {JSON.stringify(read)}
                            </div>)
                        } )}
                        <br/>
                    </div>);
                } ) }
            </Col>
        </Row>
        <Row gutter={16} style={{borderLeft: 'solid', borderBottom: 'solid', borderRight: 'solid', borderColor:'#a4578e'}}>
            <Col span={4}>
                <p
                    style={{
                        marginRight: 8,
                        display: 'inline-block',
                        color: '#720754',
                        fontWeight: 'bolder',
                    }}
                >
                    { intl.formatMessage(messages.write) }:
                </p>
            </Col>
            <Col span={20}>
                { rwsets.map( rwset => {
                    return (<div>
                        { intl.formatMessage(messages.chaincode) }: { rwset.namespace }<br/>
                        {rwset.writes.map( write => {
                            return (<div>
                                {JSON.stringify(write)}
                            </div>)
                        } )}
                        <br/>
                    </div>);
                } ) }
            </Col>
        </Row>
    </div>
);

@connect(({ loading }) => ({
    submitting: loading.effects['overview/fetchTransactions'],
}))

@Form.create()
export default class TransactionList extends PureComponent {
    constructor() {
        super();
        this.state = {
            visible: false,
            columns: [{
                    title:  intl.formatMessage(messages.txId) ,
                    width: 100,
                    render: (row) => (
                        <Fragment>
                            <a onClick={() => this.showDrawer(row)}>{row.id}</a>
                        </Fragment>
                    ),
                },
                {
                    title: intl.formatMessage(messages.msp),
                    dataIndex: 'creatorMSP',
                    key: 'creatorMSP',
                    width: 120,
                    render: val => <Ellipsis tooltip lines={1}>{val}</Ellipsis>,
                },
                {
                    title: intl.formatMessage(messages.txTime),
                    dataIndex: 'time',
                    key: 'time',
                    width: 120,
                    render: val => <Ellipsis tooltip lines={1}>{moment(val).format('YYYY-MM-DD HH:mm:ss')}</Ellipsis>,
                },
                {
                    title: intl.formatMessage(messages.txType),
                    dataIndex: 'typeString',
                    key: 'typeString',
                    width: 250,
                    render: val => <Ellipsis tooltip lines={1}>{val}</Ellipsis>,
                }],
            channel:'',
            type: '1',
            startTime: '',
            endTime: '',
            actions: [],
            channelSel: '',
            peerName: ''
        }
    }

    showDrawer = (row) => {
        this.setState({
            visible: true,
            id: row.id,
            channelName: row.channelName,
            time: row.time,
            creatorMSP: row.creatorMSP,
            typeString: row.typeString,
            actions: row.actions
        });
    };

    onClose = () => {
        this.setState({
            visible: false
        });
    };

    components = {
        header: {
            cell: ResizeableTitle,
        },
    };

    onSelectTime = time => {
        const start = new Date(time);

        const end = new Date(start.getTime());

        end.setTime(end.getTime() + 6 * 60 * 60 * 1000);
        this.setState({
            startTime: start,
            endTime: end,
        });
    };

    handleSearch = e => {
        e.preventDefault();

        const { dispatch, form } = this.props;

        form.validateFields((err, fieldsValue) => {
            if (err)
                return;

            const values = {
                ...fieldsValue,
                updatedAt: fieldsValue.updatedAt && fieldsValue.updatedAt.valueOf(),
            };

            if (values.type === '1') {
                values.startTime = this.state.startTime.getTime();
                values.endTime = this.state.endTime.getTime();
            }

            dispatch({
                type: 'overview/fetchTransactions',
                payload: values
            });
        });
    };
    
    onChannelChange = (channel) => {
        this.props.form.setFieldsValue({peerName: ''});
        this.setState({
            'channelSel': channel,
            'peerName': ''
        });
    };
    
    onPeerChange = (peer) => {
        this.setState({
            'peerName': peer
        })
    };

    renderSimpleForm() {
        const { form, channelList, submitting } = this.props;
        const { getFieldDecorator, getFieldValue } = form;
        const channelInfo = Array.isArray(channelList) ? channelList : [];
        const channelOptions = channelInfo.map(channel => (
            <Option key={channel.id} value={channel.id}>
                <span>{channel.name}</span>
            </Option>
        ));
        const { channelSel } = this.state;
        const ChannelObj = channelInfo.filter(channel => channel.id === channelSel);
        const peersInChannel = ChannelObj.length > 0 ? ChannelObj[0].peers : [];
        const peerOptions = peersInChannel.map(peer => (
            peer.roles.ledgerQuery ?
            <Option key={peer.name} value={peer.name}>
                <span>{peer.name}</span>
            </Option> : null
        ));
        
        return (
            <Form onSubmit={this.handleSearch} layout="inline">
                <Row gutter={{ md: 8, lg: 24, xl: 48 }}>
                    <Col md={8} sm={8}>
                        <FormItem label={ intl.formatMessage(messages.channel) }>
                            {getFieldDecorator('channel',
                                {
                                    initialValue: this.state.channel,
                                    rules: [{
                                        required: true,
                                        message:  intl.formatMessage(messages.selChannel) ,
                                    }],
                                })
                            (
                                <Select
                                    placeholder={ intl.formatMessage(messages.select) }
                                    style={{ width: '100%' }}
                                    onChange={value => this.onChannelChange(value)}
                                >
                                    {channelOptions}
                                </Select>
                            )}
                        </FormItem>
                    </Col>
                    <Col md={8} sm={16}>
                        <FormItem label={ intl.formatMessage(messages.peer) }>
                            {getFieldDecorator('peerName',
                                {
                                    initialValue: this.state.peerName,
                                    rules: [{
                                        required: true,
                                        message:  intl.formatMessage(messages.selPeer) ,
                                    }],
                                })
                            (
                                <Select
                                    placeholder={ intl.formatMessage(messages.select) }
                                    style={{ width: '100%' }}
                                    onChange={value => this.onPeerChange(value)}
                                >
                                    {peerOptions}
                                </Select>
                            )}
                        </FormItem>
                    </Col>
                </Row>
                <Row gutter={{ md: 8, lg: 24, xl: 48 }}>
                    <Col md={8} sm={24} span={8}>
                        <FormItem label={ intl.formatMessage(messages.condition) }>
                            {getFieldDecorator('type',{
                                initialValue: this.state.type,
                                rules: [{
                                    required: true,
                                    message: intl.formatMessage(messages.selCondition),
                                }],
                            })(
                                <Select
                                    placeholder={ intl.formatMessage(messages.select) }
                                    style={{ width: '100%' }}
                                >
                                    <Option value="0">{ intl.formatMessage(messages.block) }</Option>
                                    <Option value="1">{ intl.formatMessage(messages.sixhtx) }</Option>
                                </Select>
                            )}
                        </FormItem>
                    </Col>
                    <Col md={8} sm={30} span={12}>
                        {
                            getFieldValue('type') !== '0' ?
                                <FormItem
                                    label={ intl.formatMessage(messages.startTime) }
                                >
                                    {getFieldDecorator('timeInterval',{
                                        rules: [{
                                            required: true,
                                            message: intl.formatMessage(messages.selTime),
                                        }],
                                    })(<DatePicker
                                        format='YYYY-MM-DD HH:mm:ss'
                                        showTime={{

                                        }}
                                        onChange={time => this.onSelectTime(time)}
                                    />)}
                                    {<div style={{marginLeft: '-78px'}}>
                                        { intl.formatMessage(messages.endTime) }: <span style={{marginLeft: '28px'}}>{ this.state.endTime === '' ? '' : moment(this.state.endTime).format('YYYY-MM-DD HH:mm:ss')}</span>
                                    </div>}
                                </FormItem>
                                :
                                <FormItem label={ intl.formatMessage(messages.blocknum) }>
                                    {getFieldDecorator('blockNum',{
                                        initialValue: this.state.number,
                                        rules: [{
                                            required: true,
                                            message: intl.formatMessage(messages.inputQuery),
                                        }],
                                    })(<Input placeholder={ intl.formatMessage(messages.input) } />)}
                                </FormItem>
                        }
                    </Col>
                    <Col md={8} sm={18} span={4}>
                        <span className={styles.submitButtons}>
                            <Button type="primary" htmlType="submit" loading={submitting}>
                              { intl.formatMessage(messages.query) }
                            </Button>
                        </span>
                    </Col>
                </Row>
            </Form>
        );
    }

    renderForm() {
        return this.renderSimpleForm();
    }

    handleResize = index => (e, { size }) => {
        this.setState(({ columns }) => {
            const nextColumns = [...columns];
            nextColumns[index] = {
                ...nextColumns[index],
                width: size.width,
            };
            return { columns: nextColumns };
        });
    };

    render() {
        const {
            loadingInfo,
            transactions
        } = this.props;

        if (typeof(transactions.channel) !== 'undefined') {
            this.setState({
                channel: transactions.channel,
                type: transactions.type,
                peerName: transactions.peerName
            });

            if (transactions.type === '0') {
                this.setState({
                    number: transactions.number
                })
            }
        }

        const paginationProps = {
            showSizeChanger: true,
            showQuickJumper: true,
        };

        const columns = this.state.columns.map((col, index) => ({
            ...col,
            onHeaderCell: column => ({
                width: column.width,
                onResize: this.handleResize(index)
            }),
        }));

        return (
            <div>
                <Card
                    title={ intl.formatMessage(messages.list) }
                    bordered={false}
                >
                    <div className={styles.tableList}>
                        <div className={styles.tableListForm}>{this.renderForm()}</div>
                        <Table
                            components={this.components}
                            className={styles.table}
                            loading={loadingInfo}
                            dataSource={transactions.trans}
                            columns={columns}
                            pagination={paginationProps}
                        />
                    </div>
                    <Drawer
                        width = {640}
                        placement = "right"
                        closable = {false}
                        onClose={this.onClose}
                        visible={this.state.visible}

                    >
                        <p style={{ ...pStyle, marginBottom: 24, color: '#c21eb8'}}>{ intl.formatMessage(messages.txinfo) }</p>
                        <DescriptionItem title = { intl.formatMessage(messages.txId) } content = {this.state.id}/>
                        <DescriptionItem title = { intl.formatMessage(messages.txTime) } content = {moment(this.state.time).format('YYYY-MM-DD HH:mm:ss')}/>
                        <DescriptionItem title = { intl.formatMessage(messages.msp) } content = {this.state.creatorMSP}/>
                        <DescriptionItem title = { intl.formatMessage(messages.txType) } content = {this.state.typeString}/>
                        <DescriptionItem title = { intl.formatMessage(messages.name) } content = {this.state.channelName}/>
                        {this.state.actions.map( action => {
                            return (<Actions
                                number = {this.state.actions.indexOf(action) + 1}
                                proposal_hash = {action.proposal_hash}
                                endorsements = {action.endorsements}
                                chaincode = {action.chaincode}
                                rwsets = {action.rwsets}
                            />);
                        })}
                    </Drawer>
                </Card>
            </div>
        );
    }
}
