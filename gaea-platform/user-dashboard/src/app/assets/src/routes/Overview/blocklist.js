import React, { PureComponent, Fragment } from 'react';
import { routerRedux } from 'dva/router';
import { Form, Card, Button, Table, Drawer, Col, Row, Select, Input } from 'antd';
import { Resizable } from 'react-resizable';
import styles from './index.less';
import { connect } from 'dva';
import Ellipsis from '../../components/Ellipsis'
import { stringify } from "qs";
import {defineMessages, IntlProvider} from "react-intl";
import {getLocale} from "../../utils/utils";

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
    submitting: loading.effects['overview/fetchBlockByNumber'],
}))

@Form.create()
export default class BlockList extends PureComponent {
    constructor() {
        super();
        this.state = {
            visible: false,
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
                        <a   onClick={() => this.showDrawer(row)}>{intl.formatMessage(messages.see)}</a>
                    </Fragment>
                ),
            }],
            channel:'',
            type: '',
            channelSel: '',
            peerName: ''
        }
    }

    showDrawer = (row) => {
        this.setState({
            visible: true,
            currentBlockHash: row.currentBlockHash,
            dataHash: row.dataHash,
            blockNumber: row.number,
            previousHash: row.previousHash,
            txCount: row.txCount
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

            dispatch({
                type: 'overview/fetchBlockByNumber',
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
        const { form, channelList, submitting } = this.props;
        const { getFieldDecorator } = form;
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
                        <FormItem label={ intl.formatMessage(messages.blockNum) }>
                            {getFieldDecorator('blockNum',{
                                initialValue: this.state.number,
                                rules: [{
                                required: true,
                                message:  intl.formatMessage(messages.inputQuery) ,
                                }],
                            })(<Input placeholder={ intl.formatMessage(messages.input) } />)}
                        </FormItem>
                    </Col>
                </Row>
                <Row gutter={{ md: 8, lg: 24, xl: 48 }}>
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
                        <span className={styles.submitButtons}>
                            <Button type="primary" htmlType="submit" loading={submitting}>
                              { intl.formatMessage(messages.query) }
                            </Button>
                        </span>
                    </Col>
                </Row>
                <Row gutter={{ md: 8, lg: 24, xl: 48 }}>
                  {/*<Col md={8} sm={24}>

                        <FormItem label="搜索条件">
                            {getFieldDecorator('type',{
                              initialValue: this.state.type,
                              rules: [{
                                required: true,
                                message: '请选择搜索条件',
                              }],
                            })(
                                <Select
                                    placeholder="请选择"
                                    style={{ width: '100%' }}
                                >
                                    <Option value="0">块数</Option>
                                    <Option value="1">时间</Option>
                                </Select>
                            )}
                        </FormItem>
                    </Col>*/}
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
                        <p style={{ ...pStyle, marginBottom: 24, color: '#c21eb8'}}>{ intl.formatMessage(messages.blockInfo) }</p>
                        <Row>
                            <Col span={24}>
                                <DescriptionItem title = { intl.formatMessage(messages.number) } content = {this.state.blockNumber}/>
                            </Col>
                        </Row>
                        <Row>
                            <Col span={24}>
                                <DescriptionItem title = { intl.formatMessage(messages.hash) } content = {this.state.currentBlockHash}/>
                            </Col>
                        </Row>
                        <Row>
                            <Col span={24}>
                                <DescriptionItem title = { intl.formatMessage(messages.dataHash) } content = {this.state.dataHash}/>
                            </Col>
                        </Row>
                        <Row>
                            <Col span={24}>
                                <DescriptionItem title = { intl.formatMessage(messages.preHash) } content = {this.state.previousHash}/>
                            </Col>
                        </Row>
                        <Row>
                            <Col span={24}>
                                <DescriptionItem title = { intl.formatMessage(messages.txCount) } content = {this.state.txCount}/>
                            </Col>
                        </Row>
                    </Drawer>
                </Card>
            </div>
        );
    }
}
