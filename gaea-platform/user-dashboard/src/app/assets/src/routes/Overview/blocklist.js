import React, { PureComponent, Fragment } from 'react';
import { Form, Card, Button, Table, Drawer, Col, Row, Select, Input, DatePicker } from 'antd';
import { Resizable } from 'react-resizable';
import styles from './index.less';
import { connect } from 'dva';
import Ellipsis from '../../components/Ellipsis'
import moment from 'moment';
import {defineMessages, IntlProvider} from "react-intl";
import {getLocale} from "../../utils/utils";
import {Actions, DescriptionItem} from './transactionlist';

const FormItem = Form.Item;
const pStyle = {
    fontSize: 16,
    color: 'rgba(0,0,0,0.85)',
    lineHeight: '24px',
    display: 'block',
    marginBottom: 16
};
const messages = defineMessages({
    list:{
        id: 'Overview.Blocklist.List',
        defaultMessage: 'Block List',
    },
    txList:{
        id: 'Overview.Txlist.List',
        defaultMessage: 'Transaction List',
    },
    number:{
        id: 'Overview.Blocklist.Number',
        defaultMessage: 'Block Number',
    },
    hash:{
        id: 'Overview.Blocklist.Hash',
        defaultMessage: 'Block Hash',
    },
    txCount:{
        id: 'Overview.Blocklist.TxCount',
        defaultMessage: 'Tx Count',
    },
    dataHash:{
        id: 'Overview.Blocklist.DataHash',
        defaultMessage: 'Data Hash',
    },
    preHash:{
        id: 'Overview.Blocklist.PreHash',
        defaultMessage: 'Previous Hash',
    },
    channel:{
        id: 'Overview.Blocklist.Channel',
        defaultMessage: 'Channel',
    },
    selChannel:{
        id: 'Overview.Blocklist.SelChannel',
        defaultMessage: 'Please select the channel',
    },
    blockNum:{
        id: 'Overview.Blocklist.BlockNum',
        defaultMessage: 'Latest Block Number',
    },
    select:{
        id: 'Overview.Blocklist.Select',
        defaultMessage: 'please select',
    },
    inputQuery:{
        id: 'Overview.Blocklist.InputQuery',
        defaultMessage: 'Please input the Block Number',
    },
    input:{
        id: 'Overview.Blocklist.Input',
        defaultMessage: 'please input',
    },
    see:{
        id: 'Overview.Blocklist.See',
        defaultMessage: 'Detail',
    },
    query:{
        id: 'Overview.Blocklist.Query',
        defaultMessage: 'Query',
    },
    blockInfo:{
        id: 'Overview.Blocklist.BlockInfo',
        defaultMessage: 'Block Information',
    },
    peer:{
        id: 'Overview.Txlist.Peer',
        defaultMessage: 'Select Node',
    },
    selPeer:{
        id: 'Overview.Txlist.SelPeer',
        defaultMessage: 'Select Node',
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
    name:{
        id: 'Overview.Txlist.Name',
        defaultMessage: 'Channel Name',
    },
    txinfo:{
        id: 'Overview.Txlist.Txinfo',
        defaultMessage: 'Tx info',
    },
    condition:{
        id: 'Overview.Txlist.Condition',
        defaultMessage: 'Condition',
    },
    selCondition:{
        id: 'Overview.Txlist.SelCondition',
        defaultMessage: 'Please select the condition',
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
    selEndTime:{
        id: 'Overview.Txlist.SelEndTime',
        defaultMessage: 'Please select end time',
    },
    blocknum:{
        id: 'Overview.Txlist.BlockNum',
        defaultMessage: 'Latest Block Number',
    },
    timeRange:{
        id: 'Overview.Blocklist.TimeRange',
        defaultMessage: 'Time',
    }
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

const blockListItem = (title, content) => (
    <div
        style = {{
            fontSize: 14,
            lineHeight: '22px',
            marginBottom: 7,
            color: 'rgba(0,0,0,0.65)'
        }}
    >
        <p
            style={{
                marginRight: 8,
                display: 'inline-block',
                color: 'rgba(0.0.0.0.85)'
            }}
        >
            { title }:
        </p>
        {content}
    </div>
);

@connect(({ loading }) => ({
    submitting: loading.effects['overview/fetchBlock'],
}))

@Form.create()
export default class BlockList extends PureComponent {
    constructor() {
        super();
        this.state = {
            visible: false,
            txVisible: false,
            columns: [{
                title: intl.formatMessage(messages.number),
                dataIndex: 'number',
                key: 'number',
                width: 100,
                render: val => <Ellipsis tooltip lines={1}>{val}</Ellipsis>
            },
            {
                title: intl.formatMessage(messages.hash),
                dataIndex: 'currentBlockHash',
                key: 'currentBlockHash',
                width: 120,
                render: val => <Ellipsis tooltip lines={1}>{val}</Ellipsis>,
            },
            {
                title:  intl.formatMessage(messages.txCount) ,
                dataIndex: 'txCount',
                width: 120,
                render: val => <Ellipsis tooltip lines={1}>{val}</Ellipsis>,
            },
            {
                title: '',
                width: 250,
                render: (row) => (
                    <Fragment>
                        <a onClick={() => this.showDrawer(row)}>{intl.formatMessage(messages.see)}</a>
                    </Fragment>
                ),
            }],
            
            txsColumns: [
                {
                    title: intl.formatMessage(messages.txList),
                    width: 100,
                    render: (row) => (
                        <Fragment>
                            <a onClick={() => this.showTxDrawer(row)}>{row.type === 1 ? 'CONFIG' : row.id }</a>
                        </Fragment>
                    ),
                }
            ],
            channel:'',
            type: '0',
            channelSel: '',
            peerName: '',
            txInfo: {},
            txs: [],
            actions: []
        }
    }

    showDrawer = (row) => {
        this.setState({
            visible: true,
            currentBlockHash: row.currentBlockHash,
            dataHash: row.dataHash,
            blockNumber: row.number,
            previousHash: row.previousHash,
            txCount: row.txCount,
            txs: row.txs
        });
    };
    
    showTxDrawer = row => {
        this.setState({
            txVisible: true,
            txInfo: row,
            actions: row.type === 3 ? row.actions : []
        })
    };

    onClose = () => {
        this.setState({
            visible: false
        });
    };
    
    onTxClose = () => {
        this.setState({
            txVisible: false
        });
    };

    components = {
        header: {
            cell: ResizeableTitle,
        },
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
                const startTime = new Date(values.startTime);
                const endTime = new Date(values.endTime);
                values.startTime = startTime.getTime();
                values.endTime = endTime.getTime();
            }

            dispatch({
                type: 'overview/fetchBlock',
                payload: values,
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
        const { form, channelList, submitting, blocks } = this.props;
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
        const startTime = blocks.startTime ? moment(blocks.startTime) : '';
        const endTime = blocks.endTime ? moment(blocks.endTime) : '';
        const typeVal = blocks.type ? blocks.type : this.state.type;

        return (
            <Form onSubmit={this.handleSearch} layout="inline">
                <Row gutter={{ md: 8, lg: 24, xl: 48 }}>
                    <Col md={8} sm={24}>
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
                    <Col md={8} sm={24}>
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
                    <Col md={8} sm={24}>
                        <FormItem label={ intl.formatMessage(messages.condition) }>
                            {getFieldDecorator('type',{
                                initialValue: typeVal,
                                rules: [{
                                    required: true,
                                    message: intl.formatMessage(messages.selCondition),
                                }],
                            })(
                                <Select
                                    placeholder={ intl.formatMessage(messages.select) }
                                    style={{ width: '100%', minWidth: 'auto' }}
                                >
                                    <Option value="0">{ intl.formatMessage(messages.block) }</Option>
                                    <Option value="1">{ intl.formatMessage(messages.timeRange) }</Option>
                                </Select>
                            )}
                        </FormItem>
                    </Col>
                </Row>
                <Row gutter={{ md: 8, lg: 24, xl: 48 }}>
                    <Col md={8} sm={24}>
                        {
                            getFieldValue('type') === '0' ?
                                <FormItem label={ intl.formatMessage(messages.blockNum) }>
                                    {getFieldDecorator('blockNum',{
                                        initialValue: this.state.number,
                                        rules: [{
                                            required: true,
                                            message:  intl.formatMessage(messages.inputQuery) ,
                                        }],
                                    })(<Input placeholder={ intl.formatMessage(messages.input) } />)}
                                </FormItem> :
                                <FormItem
                                    label={ intl.formatMessage(messages.startTime) }
                                >
                                    {getFieldDecorator('startTime',{
                                        initialValue: startTime,
                                        rules: [{
                                            required: true,
                                            message: intl.formatMessage(messages.selTime),
                                        }],
                                    })(<DatePicker
                                        format='YYYY-MM-DD HH:mm:ss'
                                        style={{ width: '100%', minWidth: 'auto' }}
                                        showTime={{}}
                                    />)}
                                </FormItem>
                        }
                    </Col>
                    {
                        getFieldValue('type') !== '0' &&
                        <Col md={8} sm={24}>
                            <FormItem
                                label={ intl.formatMessage(messages.endTime) }
                            >
                                {getFieldDecorator('endTime',{
                                    initialValue: endTime,
                                    rules: [{
                                        required: true,
                                        message: intl.formatMessage(messages.selEndTime),
                                    }],
                                })(<DatePicker
                                    format='YYYY-MM-DD HH:mm:ss'
                                    style={{ width: '100%', minWidth: 'auto' }}
                                    showTime={{}}
                                />)}
                            </FormItem>
                        </Col>
                    }
                    <Col md={8} sm={24}>
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
            blocks,
        } = this.props;

        const paginationProps = {
            showSizeChanger: true,
            showQuickJumper: true,
        };
        
        if (typeof(blocks.channel) !== 'undefined') {
            this.setState({
                channel: blocks.channel,
                number: blocks.number,
                peerName: blocks.peerName
            });
        }

        const columns = this.state.columns.map((col, index) => ({
            ...col,
            onHeaderCell: column => ({
                width: column.width,
                onResize: this.handleResize(index),
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
                                dataSource={blocks.blocks}
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
                        <div>
                            <p style={{ ...pStyle, marginBottom: 24, color: '#c21eb8'}}>{ intl.formatMessage(messages.blockInfo) }</p>
                            { blockListItem(intl.formatMessage(messages.number),this.state.blockNumber) }
                            { blockListItem(intl.formatMessage(messages.hash),this.state.currentBlockHash) }
                            { blockListItem(intl.formatMessage(messages.dataHash),this.state.dataHash) }
                            { blockListItem(intl.formatMessage(messages.preHash),this.state.previousHash) }
                            { blockListItem(intl.formatMessage(messages.txCount),this.state.txCount) }
                        </div>
                        <div>
                            <Table
                                components={this.components}
                                className={styles.table}
                                dataSource={this.state.txs}
                                columns={this.state.txsColumns}
                                pagination={paginationProps}
                            />
                        </div>
                        <Drawer
                            width = {640}
                            placement = "right"
                            closable = {false}
                            onClose={this.onTxClose}
                            visible={this.state.txVisible}
    
                        >
                            <p style={{ ...pStyle, marginBottom: 24, color: '#c21eb8'}}>{ intl.formatMessage(messages.txinfo) }</p>
                            <DescriptionItem title = { intl.formatMessage(messages.txId) } content = {this.state.txInfo.id}/>
                            <DescriptionItem title = { intl.formatMessage(messages.txTime) } content = {moment(this.state.txInfo.time).format('YYYY-MM-DD HH:mm:ss')}/>
                            <DescriptionItem title = { intl.formatMessage(messages.msp) } content = {this.state.txInfo.creatorMSP}/>
                            <DescriptionItem title = { intl.formatMessage(messages.txType) } content = {this.state.txInfo.typeString}/>
                            <DescriptionItem title = { intl.formatMessage(messages.name) } content = {this.state.txInfo.channelName}/>
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
                    </Drawer>
                </Card>
            </div>
        );
    }
}
