import React, { PureComponent } from 'react';
import { Form, Card, Select } from 'antd';
import { Chart, Geom, Axis, Tooltip, Legend } from 'bizcharts';
import styles from './index.less';
import { connect } from 'dva';
import {defineMessages, IntlProvider} from "react-intl";
import {getLocale} from "../../utils/utils";

const FormItem = Form.Item;

const messages = defineMessages({
    rtVolume:{
        id: 'Overview.Txrealtime.RTVolume',
        defaultMessage: 'Real-time transaction Volume',
    },
    selChannel:{
        id: 'Overview.Txrealtime.SelChannel',
        defaultMessage: 'Select Channel',
    },
    time:{
        id: 'Overview.Txrealtime.Time',
        defaultMessage: 'Time',
    },
    volume:{
        id: 'Overview.Txrealtime.Volume',
        defaultMessage: 'Volume',
    },
    select:{
        id: 'Overview.Txrealtime.Select',
        defaultMessage: 'select channel',
    },
});

const currentLocale = getLocale();
const intlProvider = new IntlProvider(
    { locale: currentLocale.locale, messages: currentLocale.messages },
    {}
);
const { intl } = intlProvider.getChildContext();

@connect(({ loading }) => ({
    loadingInfo: loading.models.overview,
}))


@Form.create()
export default class OrgList extends PureComponent {
    constructor() {
        super();
        this.state = {
            channel: '',
            maxCount: 20
        }
    }

    componentDidMount() {
        const {
            channelList,
            txForRealtime,
        } = this.props;

        if (txForRealtime.length > 0) {
            channelList.map( channel => {
                if (txForRealtime[0].type === channel.name) {
                    this.setState({
                        channel: channel.id
                    })
                }
            })
        }
        const loop = setInterval(() => {
            if (this.state.channel !== '') {
                this.props.dispatch({
                    type: 'overview/fetchTransactionRealtime',
                    payload: {
                        channel_id: this.state.channel,
                        minutes: 60
                    }
                });
            }
        }, 10000);
        this.setState({
            loop: loop
        })
    }

    componentWillUnmount() {
        clearInterval(this.state.loop);
    }

    setChannel = (value)=> {
        this.setState({
            channel: value.toString()
        });
        this.props.dispatch({
            type: 'overview/fetchTransactionRealtime',
            payload: {
                channel_id: value,
                minutes: 60
            }
        });
    };

    render() {
        const {
            channelList,
            txForRealtime,
        } = this.props;
        const {getFieldDecorator} = this.props.form;

        const channelInfo = Array.isArray(channelList) ? channelList : [];
        const channelOptions = channelInfo.map(channel => (
            <Option key={channel.id} value={channel.id}>
                <span>{channel.name}</span>
            </Option>
        ));

        const data = txForRealtime;
        
        let max = 10;
        
        data.map(tx => {
            if (tx.count > max) {
                max = tx.count
            }
        });

        max += 5;

        const formItemLayout = {
            labelCol: {
                xs: {span: 24},
                sm: {span: 7},
            },
            wrapperCol: {
                xs: {span: 24},
                sm: {span: 12},
                md: {span: 10},
            },
        };
        const scale = {
            time: {
                alias: intl.formatMessage(messages.time) ,
                type: "time",
                mask: "hh:mm",
                tickCount: 10,
                nice: false
            },
            count: {
                alias: intl.formatMessage(messages.volume),
                min: 0,
                max: max
            },
            type: {
                type: "cat"
            }
        };
        let chart;
        return (
            <div>
                <Card
                    title={ intl.formatMessage(messages.rtVolume) }
                    bordered={false}
                >
                    <FormItem {...formItemLayout} label={ intl.formatMessage(messages.selChannel) }>
                        {getFieldDecorator('channel', {
                            initialValue: data.length > 0 ? data[0].type : ''
                        })(
                            <Select
                                placeholder = { intl.formatMessage(messages.select) }
                                style={{maxWidth: 515, width: '100%'}}
                                onSelect = {(value)=>this.setChannel(value)}
                                value = {this.state.channel.toString()}
                            >
                                {channelOptions}
                            </Select >
                        )}
                    </FormItem>
                    <Chart
                        height={500}
                        data={data}
                        scale={scale}
                        forceFit
                        onGetG2Instance={g2Chart => {
                            chart = g2Chart;
                        }}
                    >
                        <Tooltip/>
                        {data.length !== 0 ? <Axis/> : ''}
                        <Legend/>
                        <Geom
                            type={'line'}
                            position={'time*count'}
                            color={['type', ['#1ac20c']]}
                            shape='smooth'
                            size={2}
                        />
                    </Chart>
                </Card>
            </div>
        );
    }
}
