import React, { PureComponent, Fragment } from 'react';
import { connect } from 'dva';
import { stringify } from 'qs';
import { Form, Card, Button, Table, Drawer, Col, Row, Select, Input, DatePicker, Icon } from 'antd';
import { routerRedux } from 'dva/router';
import PageHeaderLayout from '../../layouts/PageHeaderLayout';
import styles from './loglist.less';
import STable from 'components/StandardTableForNetWork';
import { defineMessages, IntlProvider } from "react-intl";
import { getLocale } from "../../utils/utils";
import moment from 'moment';
import { Resizable } from 'react-resizable';
import Ellipsis from '../../components/Ellipsis'
import { Modal } from "antd/lib/index";

const messages = defineMessages({
    colNumber: {
        id: 'Log.index',
        defaultMessage: 'Number',
    },
    colOpObject: {
        id: 'Log.OptObject',
        defaultMessage: 'Operation Object',
    },
    colOpName: {
        id: 'Log.OptName',
        defaultMessage: 'Operation Name',
    },
    colOperator: {
        id: 'Log.Operator',
        defaultMessage: 'Operator',
    },
    colResDes: {
        id: 'Log.ResDes',
        defaultMessage: 'Result Description',
    },
    colResCode: {
        id: 'Log.ResCode',
        defaultMessage: 'Result Code',
    },
    ResErrMsg: {
        id: 'Log.ResErrMsg',
        defaultMessage: 'Error Message',
    },
    colDate: {
        id: 'Log.OptDate',
        defaultMessage: 'Time',
    },
    startTime: {
        id: 'Log.StartTime',
        defaultMessage: 'Starting time',
    },
    endTime: {
        id: 'Log.EndTime',
        defaultMessage: 'End time',
    },
    startTimeSel: {
        id: 'Log.StartTimeSel',
        defaultMessage: 'Please choose the starting time',
    },
    endTimeSel: {
        id: 'Log.EndTimeSel',
        defaultMessage: 'Please choose the end time',
    },
    search: {
        id: 'Log.Search',
        defaultMessage: 'Search',
    },
    list: {
        id: 'Log.List',
        defaultMessage: 'Log List',
    },
    pageTitle: {
        id: 'Log.Title',
        defaultMessage: 'Log Management',
    },
    pageDesc: {
        id: 'Log.Description',
        defaultMessage: 'Operating log information',
    },
    timeWarning: {
        id: 'Log.TimeWarning',
        defaultMessage: 'The end time must be after the starting time',
    },
    detailTitle: {
        id: 'Log.DetailTitle',
        defaultMessage: 'Log Details',
    },
    detailInfo: {
        id: 'Log.DetailInfo',
        defaultMessage: 'Operation Details',
    }
});
const currentLocale = getLocale();
const intlProvider = new IntlProvider(
    { locale: currentLocale.locale, messages: currentLocale.messages },
    {}
);
const { intl } = intlProvider.getChildContext();

const FormItem = Form.Item;
const { RangePicker } = DatePicker;

const pStyle = {
    fontSize: 16,
    color: 'rgba(0,0,0,0.85)',
    lineHeight: '24px',
    display: 'block',
    marginBottom: 16
};

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

const Detail = ( {keyVal, content} ) => (
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
            <div>{console.log('keyVal', keyVal)}</div>
        </Col>
    </Row>
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
                    { '请求哈希' }:
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
                    { '链码名称' }:
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
                    { '链码版本' }:
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
                    { '背书' }:
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
                    { '读集' }:
                </p>
            </Col>
            <Col span={20}>
                { rwsets.map( rwset => {
                    return (<div>
                        链码: { rwset.namespace }<br/>
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
                    { '写集' }:
                </p>
            </Col>
            <Col span={20}>
                { rwsets.map( rwset => {
                    return (<div>
                        链码: { rwset.namespace }<br/>
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

@connect(({ loglist, loading }) => ({
    loglist,
    submitting: loading.effects['loglist/fetch'],
    loading: loading.models.loglist
}))
@Form.create()
export default class LogList extends PureComponent {
    constructor() {
        super();
        this.state = {
            visible: false,
            columns: [{
                    title: intl.formatMessage(messages.colNumber),
                    width: 20,
                    render: (text, record, index) => (
                        <Fragment>
                            <a onClick={() => this.showDrawer(record)}>{`${index + 1}`}</a>
                        </Fragment>),
                },
                {
                    title: intl.formatMessage(messages.colOpObject),
                    dataIndex: 'opObject',
                    key: 'opObject',
                    width: 100,
                    render: val => <Ellipsis tooltip lines={1}>{val}</Ellipsis>,
                },
                {
                    title: intl.formatMessage(messages.colOpName),
                    dataIndex: 'opName',
                    key: 'opName',
                    width: 120,
                    render: val => <Ellipsis tooltip lines={1}>{val}</Ellipsis>,
                },
                {
                    title: intl.formatMessage(messages.colDate),
                    dataIndex: 'opDate',
                    key: 'opDate',
                    width: 120,
                    render: val => <Ellipsis tooltip lines={1}>{moment(val).format('YYYY-MM-DD HH:mm:ss')}</Ellipsis>,
                },
                {
                    title: intl.formatMessage(messages.colOperator),
                    dataIndex: 'operator',
                    key: 'operator',
                    width: 120,
                    render: val => <Ellipsis tooltip lines={1}>{val}</Ellipsis>,
                },
                {
                    title: intl.formatMessage(messages.colResDes),
                    dataIndex: 'opResult.resDes',
                    key: 'opResult.resDes',
                    width: 120,
                    render: val => <Ellipsis tooltip lines={1}>{val}</Ellipsis>,
                },
                {
                    title: intl.formatMessage(messages.colResCode),
                    dataIndex: 'opResult.resCode',
                    key: 'opResult.resCode',
                    width: 40,
                    render: val => <Ellipsis tooltip lines={1}>{val}</Ellipsis>,
                }],
            startTime: '',
            endTime: '',
        }
    }

    showDrawer = (row) => {
        Modal.info({
            title: intl.formatMessage(messages.detailTitle),
            width: 560,
            content:(
                <div>
                    <Detail keyVal = {intl.formatMessage(messages.colOpObject)} content = {row.opObject}/>
                    <Detail keyVal = {intl.formatMessage(messages.colOpName)} content = {row.opName}/>
                    <Detail keyVal = {intl.formatMessage(messages.colOperator)} content = {row.operator}/>
                    <Detail keyVal = {intl.formatMessage(messages.colDate)} content = {moment(row.opDate).format('YYYY-MM-DD HH:mm:ss')}/>
                    <Detail keyVal = {intl.formatMessage(messages.colResDes)} content = {row.opResult.resDes}/>
                    <Detail keyVal = {intl.formatMessage(messages.colResCode)} content = {row.opResult.resCode}/>
                    <Detail keyVal = {intl.formatMessage(messages.ResErrMsg)} content = {row.opResult.errorMsg}/>
                    <Detail keyVal = {intl.formatMessage(messages.detailInfo)} content = {JSON.stringify(row.opDetails)}/>
                </div>
            )
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

            if (values.startTime >= values.endTime) {
                Modal.warning({title: intl.formatMessage(messages.timeWarning)});
                return;
            }

            const reg = /^\s*|\s*$/g;

            if (typeof(values.nameForSel) !== 'undefined') {
                values.nameForSel = values.nameForSel.replace(reg, '');
            }
            if (typeof(values.objectForSel) !== 'undefined') {
                values.objectForSel = values.objectForSel.replace(reg, '');
            }
            if (typeof(values.operatorForSel) !== 'undefined') {
                values.operatorForSel = values.operatorForSel.replace(reg, '');
            }

            const startTime = new Date(values.startTime);
            const endTime = new Date(values.endTime);
            values.STime = startTime.getTime();
            values.ETime = endTime.getTime();

            dispatch({
                type: 'loglist/fetch',
                payload: values
            });
        });
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
        const formItemLayout = {
            labelCol: {
                xs: { span: 24 },
                sm: { span: 7 },
            },
            wrapperCol: {
                xs: { span: 24 },
                sm: { span: 12 },
                md: { span: 10 },
            },
        };
        return (
            <Form onSubmit={this.handleSearch} layout="inline">
                <Row gutter={{ md: 8, lg: 24, xl: 48 }}>
                    <Col span={8} align={'right'}>
                        <FormItem
                            label={intl.formatMessage(messages.startTime)}
                        >
                            {getFieldDecorator('startTime',{
                                rules: [{
                                    required: true,
                                    message: intl.formatMessage(messages.startTimeSel),
                                }],
                            })(<DatePicker
                                format='YYYY-MM-DD HH:mm:ss'
                                showTime={{

                                }}
                            />)}
                        </FormItem>
                        <FormItem
                            label={intl.formatMessage(messages.endTime)}
                        >
                            {getFieldDecorator('endTime',{
                                rules: [{
                                    required: true,
                                    message: intl.formatMessage(messages.endTimeSel),
                                }],
                            })(<DatePicker
                                format='YYYY-MM-DD HH:mm:ss'
                                showTime={{

                                }}
                            />)}
                        </FormItem>
                    </Col>
                    <Col span={8} align={'right'}>
                        <FormItem
                            label={intl.formatMessage(messages.colOpObject)}
                        >
                            {getFieldDecorator('objectForSel')(<Input />)}
                        </FormItem>
                        <FormItem
                            label={intl.formatMessage(messages.colOpName)}
                        >
                            {getFieldDecorator('nameForSel')(<Input />)}
                        </FormItem>
                    </Col>
                    <Col span={8}>
                        <FormItem
                            label={intl.formatMessage(messages.colOperator)}
                        >
                            {getFieldDecorator('operatorForSel')(<Input />)}
                        </FormItem>
                        <FormItem
                        >
                            <Button type="primary" htmlType="submit" loading={submitting}>
                                {intl.formatMessage(messages.search)}
                            </Button>
                        </FormItem>
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
            loglist : {logs},
        } = this.props;

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

        //const data = Array.isArray(list) ? list : [];
        return (
            <PageHeaderLayout
                title={intl.formatMessage(messages.pageTitle)}
                logo={<Icon type="ordered-list" style={{fontSize: 30, color: '#722ed1'}} />}
                content={intl.formatMessage(messages.pageDesc)}
            >
                <div>
                    <Card
                        title={intl.formatMessage(messages.list)}
                        bordered={false}
                    >
                        <div className={styles.tableList}>
                            <div className={styles.tableListForm}>{this.renderForm()}</div>
                            <Table
                                components={this.components}
                                className={styles.table}
                                loading={loadingInfo}
                                dataSource={logs}
                                columns={columns}
                                pagination={paginationProps}
                                rowClassName={(record) => record.opResult.resCode !== 200 ? styles.redFont : styles.greenFont}
                            />
                        </div>
                        {/*
                        <Drawer
                            width = {640}
                            placement = "right"
                            closable = {false}
                            onClose={this.onClose}
                            visible={this.state.visible}

                        >

                            <p style={{ ...pStyle, marginBottom: 24, color: '#c21eb8'}}>交易详情</p>
                            <DescriptionItem title = '交易id' content = {this.state.id}/>
                            <DescriptionItem title = '交易时间' content = {moment(this.state.time).format('YYYY-MM-DD HH:mm:ss')}/>
                            <DescriptionItem title = '发起者MSP' content = {this.state.creatorMSP}/>
                            <DescriptionItem title = '交易类型' content = {this.state.typeString}/>
                            <DescriptionItem title = '通道名称' content = {this.state.channelName}/>
                            {this.state.actions.map( action => {
                                return (<Actions
                                    number = {this.state.actions.indexOf(action) + 1}
                                    proposal_hash = {action.proposal_hash}
                                    endorsements = {action.endorsements}
                                    chaincode = {action.chaincode}
                                    rwsets = {action.rwsets}
                                />);
                            })}
                        </Drawer>*/}
                    </Card>
                </div>
            </PageHeaderLayout>
        );
    }
}