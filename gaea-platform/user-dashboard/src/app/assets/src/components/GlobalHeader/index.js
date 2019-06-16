/*
 SPDX-License-Identifier: Apache-2.0
*/
import React, { PureComponent } from 'react';
import { Menu,Form, Modal,Icon,Input,Row,Col, Spin, Dropdown, Avatar, Divider,message, Button } from 'antd';
import Debounce from 'lodash-decorators/debounce';
import { Link } from 'dva/router';
import styles from './index.less';
import { getLang, getLocale } from '../../utils/utils';
import reqwest from 'reqwest';
import Gaea from '../../assets/Gaea.png';
import Ver from '../../../../../package.json'
import { defineMessages, IntlProvider } from "react-intl";

const currentLocale = getLocale();

const intlProvider = new IntlProvider(
    { locale: currentLocale.locale, messages: currentLocale.messages },
    {}
);
const { intl } = intlProvider.getChildContext();

const messages = defineMessages({
    menus: {
        personalCenter: {
            id: 'Head.personalCenter',
            defaultMessage: 'Personal Center',
        },
        changePassword: {
            id: 'Head.ChangePassword',
            defaultMessage: 'Change Password',
        },
        inputNewPassword: {
            id: 'Head.InputNewPassword',
            defaultMessage: 'Please input new password',
        },
        inputNewPasswordAgain: {
            id: 'Head.InputNewPasswordAgain',
            defaultMessage: 'Please input new password again',
        },
        diffPassword: {
            id: 'Head.DiffPassword',
            defaultMessage: 'Two new passwords are inconsistent',
        },
        abortGaea: {
            id: 'Head.AbortGaea',
            defaultMessage: 'Abort Gaea',
        },
        version: {
            id: 'Head.Version',
            defaultMessage: 'Version',
        },
        newBeginning: {
            id: 'Head.NewBeginning',
            defaultMessage: 'New Beginning New Future',
        },
        logOut: {
            id: 'Head.LogOut',
            defaultMessage: 'Log Out',
        },
        changeSuccess: {
            id: 'Head.ChangeSuccess',
            defaultMessage: 'Successful password modification',
        }
    },
});

const FormItem = Form.Item;

const CreateForm = Form.create()(props => {

    const {
        modalVisible,
        form,
        handleAdd,
        handleModalVisible,
        isClose
    } = props;

    const okHandle = () => {
        form.validateFields((err, fieldsValue) => {
            if (err) return;
            form.resetFields();
            handleAdd(fieldsValue);
        });
    };

    const formItemLayout = {
        labelCol: {
            xs: { span: 24 },
            sm: { span: 12 },
        },
        wrapperCol: {
            xs: { span: 24 },
            sm: { span: 12 },
        },
    };

    return (
        isClose ? null :
        <Modal
            title={intl.formatMessage(messages.menus.changePassword)}
            visible={modalVisible}
            onOk={okHandle}
            onCancel={() => handleModalVisible(false)}
            width={600}
        >
            <div style={{ width: 500}}>
                <Form {...formItemLayout}>
        
                    <FormItem {...formItemLayout} label={intl.formatMessage(messages.menus.inputNewPassword) + ':'} >
                        {form.getFieldDecorator('new_password', {
                            initialValue: '',
                            rules: [
                                {
                                    required: true,
                                    message: intl.formatMessage(messages.menus.inputNewPassword),
                                },
                            ],
                        })(<Input type="password" placeholder={intl.formatMessage(messages.menus.inputNewPassword)} />)}
                    </FormItem>
                    <FormItem {...formItemLayout} label={intl.formatMessage(messages.menus.inputNewPasswordAgain) + ':'} >
                        {form.getFieldDecorator('reNewPass', {
                            initialValue: '',
                            rules: [
                                {
                                    required: true,
                                    message: intl.formatMessage(messages.menus.inputNewPasswordAgain),
                                },
                            ],
                        })(<Input type="password" placeholder={intl.formatMessage(messages.menus.inputNewPasswordAgain)} />)}
                    </FormItem>
                </Form>

            </div>
        </Modal>
    );
});

const language = getLang();
@Form.create()
export default class GlobalHeader extends PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            modalVisible:false,
            isClose: false,
        };
    };

  componentWillUnmount() {
    this.triggerResizeEvent.cancel();
  }
  toggle = () => {
    const { collapsed, onCollapse } = this.props;
    onCollapse(!collapsed);
    this.triggerResizeEvent();
  };
  /* eslint-disable*/
  @Debounce(600)
  triggerResizeEvent() {
    const event = document.createEvent('HTMLEvents');
    event.initEvent('resize', true, false);
    window.dispatchEvent(event);
  }
  changeLanguage = () => {
    localStorage.setItem('language', language === 'en' ? 'zh-CN' : 'en');
    window.location.reload();
  };

    handleModalVisible = (flag) => {
        this.setState({
            modalVisible: !!flag,
            isClose: !flag
        });
    };

    abortGaea = () => {
        Modal.info({
            title: intl.formatMessage(messages.menus.abortGaea),
            content: (
                <div>
                    <Row gutter={4}>
                        <Col span={7}>
                            <img width='60px' src={Gaea} />
                        </Col>
                        <Col span={17}>
                            <Row>
                                <Col span={6}>
                                    {intl.formatMessage(messages.menus.version)}
                                </Col>
                                <Col span={18}>
                                    {Ver.version}
                                </Col>
                            </Row>
                            <Row>
                                <Col><h3>{intl.formatMessage(messages.menus.newBeginning)}</h3></Col>
                            </Row>
                        </Col>
                    </Row>
                </div>
            ),
            onOk() {}

        });
    };

      handleAdd = fields => {
            const password=fields.new_password;
            const orguser={password:password};
            if (fields.new_password === fields.reNewPass) {
                const org=window.username.split('@');
                const orgName=org[0];

                if(`${orgName}`=== 'Admin'){
                    const formData = new FormData();
                    formData.append('new_password', fields.new_password);
                    reqwest({
                        url: 'http://' + window.location.hostname + `:8071/api/user/${window.id}/resetPassword`,
                        method: 'post',
                        processData: false,
                        data: formData,
                        success: () => {
                            this.setState({
                                submitting: false,
                                modalVisible: false,
                                isClose: true
                            });
                            message.success(intl.formatMessage(messages.menus.changeSuccess));
                        },
                        error: () => {
                            this.setState({
                                submitting: false,
                                isClose: false,
                            });
                        }
                    });
                }
                else {
                    reqwest({
                        url: window.location.origin + '/v2/orgusers?password='+`${password}`,
                        type: 'json',
                        method: 'put',
                     //   data: orguser,//{'orguser': orguser},
                        success: () => {
                            this.setState({
                                submitting: false,
                                modalVisible: false,
                                isClose: true
                            });
                            message.success(intl.formatMessage(messages.menus.changeSuccess));
                        },
                        error: () => {
                            this.setState({
                                submitting: false,
                                isClose: false,
                            });
                        }
                    });
                }
            }
            else {
                 message.error(intl.formatMessage(messages.menus.diffPassword));
            }

        };

    

  render() {
    const { collapsed, isMobile, logo, onMenuClick } = this.props;
    const {  modalVisible, isClose } = this.state;
    const parentMethods = {
        handleAdd: this.handleAdd,
        handleModalVisible: this.handleModalVisible,
    };

    const menu = (
      <Menu className={styles.menu} selectedKeys={[]} >
          <Menu.Item  key="personalCenter"  onClick={onMenuClick} >
              <Icon type="user" />{intl.formatMessage(messages.menus.personalCenter)}
          </Menu.Item>
        <Menu.Item  key="password"  onClick={() =>this.handleModalVisible(true)} >
          <Icon type="key" />{intl.formatMessage(messages.menus.changePassword)}
        </Menu.Item>
        <Menu.Item  key="abort"  onClick={this.abortGaea} >
           <Icon type="info" />{intl.formatMessage(messages.menus.abortGaea)}
        </Menu.Item>
        <Menu.Item key="logout" onClick={onMenuClick}>
          <Icon type="logout" />{intl.formatMessage(messages.menus.logOut)}
        </Menu.Item>
      </Menu>
    );
    return (
      <div className={styles.header}>
        {isMobile && [
          <Link to="/" className={styles.logo} key="logo">
            <img src={logo} alt="logo" width="32" />
          </Link>,
          <Divider type="vertical" key="line" />,
        ]}
        <Icon
          className={styles.trigger}
          type={collapsed ? 'menu-unfold' : 'menu-fold'}
          onClick={this.toggle}
        />
        <div className={styles.right}>
            {
                <Button size="small" onClick={this.changeLanguage}>
                    {language === 'en' ? '中文' : 'En'}
                 </Button>
            }
          {window.username ? (
            <Dropdown overlay={menu}>
              <span className={`${styles.action} ${styles.account}`}>
                <Avatar size="small" className={styles.avatar} icon="user" />
                <span className={styles.name}>{window.username}</span>
              </span>
            </Dropdown>
          ) : (
            <Spin size="small" style={{ marginLeft: 8 }} />
          )}
        </div>
          <CreateForm {...parentMethods} modalVisible={modalVisible} isClose={isClose} />
      </div>
    );
  }
}
