import React, { PureComponent, Fragment } from 'react';
import { Resizable } from 'react-resizable';
import { connect, } from 'dva';
import { routerRedux } from 'dva/router';
import {
    Card,
    Form,
    Button,
    Divider,
    Table,
    Icon,
    Modal,
    Switch,
} from 'antd';
import { stringify } from 'qs';
import PageHeaderLayout from '../../layouts/PageHeaderLayout';
import Ellipsis from '../../components/Ellipsis'
import styles from './OrgUserList.less';
import {defineMessages, IntlProvider} from "react-intl";
import {getLocale} from "../../utils/utils";

const messages = defineMessages({
    updateUser:{
        id: 'User.UpUser.UpdateUser',
        defaultMessage: 'Update User',
    },
    userName:{
        id: 'User.UpUser.UserName',
        defaultMessage: 'User Name',
    },
    userState:{
        id: 'User.UpUser.State',
        defaultMessage: 'State',
    },
    name:{
        id: 'User.UserName',
        defaultMessage: 'User Name',
    },
    role:{
        id: 'User.UserRole',
        defaultMessage: 'Role',
    },
    relationship:{
        id: 'User.Relationship',
        defaultMessage: 'Department',
    },
    net:{
        id: 'User.BlockNet',
        defaultMessage: 'Network',
    },
    state:{
        id: 'User.State',
        defaultMessage: 'Status',
    },
    operate:{
        id: 'User.Operate',
        defaultMessage: 'Operation',
    },
    update:{
        id: 'User.Update',
        defaultMessage: 'Update',
    },
    reauth:{
        id: 'User.Reauth',
        defaultMessage: 'State',
    },
    del:{
        id: 'User.Del',
        defaultMessage: 'Delete',
    },
    description:{
        id: 'User.DescriptionUser',
        defaultMessage: 'The user list shows the operator information under the current user.',
    },
    userList:{
        id: 'User.UserList',
        defaultMessage: 'User List',
    },
    createUser:{
        id: 'User.CreateUser',
        defaultMessage: 'Create User',
    },
    reauthenticate:{
        id: 'User.ReAuth.Enquire',
        defaultMessage: 'Whether to re-authenticate',
    },
    delete:{
        id: 'User.Delete.Enquire',
        defaultMessage: 'Are you sure to delete',
    },
    successofreauth:{
        id: 'User.ReAuth.Success',
        defaultMessage: 'successful re-authentication',
    },
    active: {
        id: 'User.Active',
        defaultMessage: 'Active',
    },
    inactive: {
        id: 'User.Inactive',
        defaultMessage: 'Inactive',
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

const FormItem = Form.Item;

const CreateForm = Form.create()(props => {
    const { modalVisible, form, handleAdd,activeState,onChangeSwitch,orgUserName,ModalVisible } = props;
    const okHandle = () => {
        form.validateFields((err, fieldsValue) => {
            if (err) return;
            form.resetFields();
            handleAdd(fieldsValue);
        });
    };

    const submitFormLayout = {
        wrapperCol: {
            xs: { span: 24, offset: 0 },
            sm: { span: 10, offset: 7 },
        },
    };

    return (
        <Modal
            title={ intl.formatMessage(messages.updateUser) }
            visible={modalVisible}
            onOk={okHandle}
            onCancel={() => ModalVisible()}
        >
            <FormItem
                labelCol={{ span: 5 }} wrapperCol={{ span: 15 }} label={ intl.formatMessage(messages.userName) } >
                {form.getFieldDecorator('name', {
                    initialValue: orgUserName,
                })(<span>{orgUserName}</span>)}
            </FormItem>
            <FormItem labelCol={{ span: 5 }} wrapperCol={{ span: 15 }} label={ intl.formatMessage(messages.userState) }>
                {form.getFieldDecorator('state', {

                })(<Switch checkedChildren={<Icon type="check"/>} unCheckedChildren={<Icon type="close"/>} checked={activeState} onChange={onChangeSwitch}/>)}
            </FormItem>
        </Modal>
    );
});


@connect(({ OrgUserList,loading }) => ({
    OrgUserList,
    loading: loading.models.OrgUserList,
  //  loadingInfo:loading.effects['peerList/fetch'],
}))
@Form.create()
export default class OrgUserList extends PureComponent {
    state = {
        columns: [
            {
                title:  intl.formatMessage(messages.name) ,
                dataIndex: 'username',
                width: 120,
            },
            {
                title: intl.formatMessage(messages.role),
                dataIndex: 'roles',
                width: 80,
            },
            {
                title: intl.formatMessage(messages.relationship),
                dataIndex: 'affiliation',
                width: 80,
            },
            {
                title: intl.formatMessage(messages.net),
                dataIndex: 'network_name',
                key: 'net_name',
                width: 100,
            },
            {
                title: intl.formatMessage(messages.state),
                dataIndex: 'active',
                key: 'active',
                width: 80,
                render: val => <Ellipsis tooltip lines={1}>{val === 'true' ? intl.formatMessage(messages.active) : intl.formatMessage(messages.inactive)}</Ellipsis>,
            },
            {
                title: intl.formatMessage(messages.operate),
                width: 250,
                render: (row) => (
                    <Fragment>
                        <a  onClick={() => this.handleModalVisible(true,row)}> {intl.formatMessage(messages.update)} </a>
                        <Divider type="vertical" />
                        <a  onClick={() => this.reEnrollOrgUser(row)}>{intl.formatMessage(messages.reauth)} </a>
                        <Divider type="vertical" />
                        <a  onClick={() => this.deleteOrgUser(row)}> {intl.formatMessage(messages.del)} </a>
                    </Fragment>
                ),
            }],
    };


    componentDidMount() {
             const { dispatch } = this.props;
             dispatch({
                 type: 'OrgUserList/fetch',
             });
    }


    handleModalVisible = (flag,row) => {
        this.setState({
            modalVisible: !!flag,
            activeState: row.active==="false"?false:true,
            orgUserName:row.username,
        });
    };

    ModalVisible = () => {
        this.setState({
            modalVisible: false,
        });
    };

    onChangeSwitch=(checked)=>{
        this.setState({
            activeState: checked,
        });
    };

    handleAdd = (fields) => {
        const {dispatch} = this.props;
        const orguser={name};
         orguser.name=fields.name;
         orguser.active=`${(this.state.activeState)}`;
        dispatch({
            type: 'OrgUserList/updateOrgUser',
            payload: {
                orguser: orguser,
                dispatch: dispatch
            },
        });
        this.setState({
            modalVisible: false,
        });
    };

    reEnrollOrgUser =(row) => {
        const { dispatch } = this.props;
        const orguser={
            name:row.username,
            reason:"cacompromise",
        };

        Modal.confirm({
            title: `${intl.formatMessage(messages.reauthenticate)}‘${row.username}’?`,
            onOk() {
                dispatch({
                    type: 'OrgUserList/reEnrollOrgUser',
                    payload: { orguser, msg: intl.formatMessage(messages.successofreauth)},

                });
            },
        });
    };


    deleteOrgUser =(row) => {
        const { dispatch } = this.props;
        const orguser={
            name:row.username,
            reason:"cacompromise",
        };

        Modal.confirm({
            title: `${intl.formatMessage(messages.delete)}‘${row.username}’?`,
            onOk() {
                dispatch({
                    type: 'OrgUserList/removeOrgUser',
                    payload: { orguser },
                });
            },
        });
    };



    /* handleSelectRows = rows => {
       this.setState({
         selectedRows: rows,
       });
     };  */


    onAddNewOrgUser = () =>{
        this.props.dispatch(
            routerRedux.push({
                pathname: 'NewOrgUser',
            })
        )
    };

    components = {
        header: {
            cell: ResizeableTitle,
        },
    };

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
            OrgUserList: { orgusers },
            loading,
        } = this.props;

        const {  modalVisible } = this.state;

        const paginationProps = {
            showSizeChanger: true,
            showQuickJumper: true,
        };

        const parentMethods = {
            handleAdd: this.handleAdd,
            handleModalVisible: this.handleModalVisible,
            activeState:this.state.activeState,
            onChangeSwitch:this.onChangeSwitch,
            orgUserName:this.state.orgUserName,
            ModalVisible:this.ModalVisible,
        };

        const columns = this.state.columns.map((col, index) => ({
            ...col,
            onHeaderCell: column => ({
                width: column.width,
                onResize: this.handleResize(index),
            }),
        }));


        return (
            <PageHeaderLayout title={ intl.formatMessage(messages.userList) }
                              content={ intl.formatMessage(messages.description) }
                              logo={<Icon type="user" style={{fontSize: 30, color: '#722ed1'}} />}   >
                <Card bordered={false}>
                    <div className={styles.tableList}>
                        <div className={styles.tableListOperator}>
                                <Button icon="plus" type="primary" onClick={this.onAddNewOrgUser}>
                                    { intl.formatMessage(messages.createUser) }
                                </Button>
                        </div>
                        <Table
                            components={this.components}
                            className={styles.table}
                            loading={loading}
                            dataSource={orgusers}
                            columns={columns}
                            pagination={paginationProps}
                            onChange={this.handleTableChange}
                        />
                    </div>
                </Card>
                <CreateForm {...parentMethods} modalVisible={modalVisible} />
            </PageHeaderLayout>
        );

    }
}
