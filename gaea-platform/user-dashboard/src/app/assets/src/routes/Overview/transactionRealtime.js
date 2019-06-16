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
    peer:{
        id: 'Overview.Txlist.Peer',
        defaultMessage: 'Select Node',
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
            channelSel: '',
            peerName: '',
            minutes: 60
        }
    }

    componentDidMount() {
        const {
            txForRealtime,
        } = this.props;

        const channelId = typeof(txForRealtime.channel_id) === 'undefined' ? '' : txForRealtime.channel_id;
        const peerName = typeof(txForRealtime.peerName) === 'undefined' ? '' : txForRealtime.peerName;
        
        this.setState({
            channel: channelId,
            channelSel: channelId,
            peerName: peerName
        });
        
        const loop = setInterval(() => {
            if (this.state.channel !== ''
                && this.state.peerName !== ''
            ) {
                this.props.dispatch({
                    type: 'overview/fetchTransactionRealtime',
                    payload: {
                        channel_id: this.state.channel,
                        peerName: this.state.peerName,
                        minutes: this.state.minutes
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
        this.props.form.setFieldsValue({peerName: ''});
        this.setState({
            channelSel: value.toString(),
        });
    };
    
    onPeerChange = (peer) => {
        this.setState({
            peerName: peer,
            channel: this.state.channelSel
        });
        this.props.dispatch({
            type: 'overview/fetchTransactionRealtime',
            payload: {
                channel_id: this.state.channelSel,
                peerName: peer,
                minutes: this.state.minutes
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
    
        const data = Array.isArray(txForRealtime.txList) ? txForRealtime.txList : [];
        const channelId = this.state.channelSel;
        const peerName = typeof(txForRealtime.peerName) === 'undefined' ? '' : txForRealtime.peerName;
        const ChannelObj = channelInfo.filter(channel => channel.id === channelId);
        const peersInChannel = ChannelObj.length > 0 ? ChannelObj[0].peers : [];
        let peerVal = '';
        const peerOptions = peersInChannel.map(peer => {
            if (peer.roles.ledgerQuery) {
                if (peerName === peer.name) {
                    peerVal = peerName;
                }
                return (
                    <Option key={peer.name} value={peer.name}>
                        <span>{peer.name}</span>
                    </Option>
                )
            }
        });
        
        let max = 10;
        
        data.map(tx => {
            if (tx.count > max) {
                max = tx.count
            }
        });

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
                            initialValue: channelId
                        })(
                            <Select
                                placeholder = { intl.formatMessage(messages.select) }
                                style={{maxWidth: 515, width: '100%'}}
                                onChange = {(value)=>this.setChannel(value)}
                            >
                                {channelOptions}
                            </Select >
                        )}
                    </FormItem>
                    <FormItem {...formItemLayout} label={ intl.formatMessage(messages.peer) }>
                        {getFieldDecorator('peerName',
                            {
                                initialValue: peerVal,
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
