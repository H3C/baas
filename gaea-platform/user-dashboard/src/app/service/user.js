/*
 SPDX-License-Identifier: Apache-2.0
*/
'use strict';

const Service = require('egg').Service;
const Fabric_Client = require('../../packages/fabric-1.1/node_modules/fabric-client');
const Fabric_CA_Client = require('../../packages/fabric-1.1/node_modules/fabric-ca-client');
const path = require('path');
const fs = require('fs');
const roles = ['admin', 'operator', 'user'];

class UserService extends Service {
  async login(user) {
    const { config, ctx } = this;
    const loginUrl = config.operator.url.login;
    const username = user.username;
    const password = user.password;

    if (username.indexOf('@') < 0) {
      return null;
    }

    const orgName = username.split('@')[1].split('.')[0];
    const networkId = await ctx.service.user.getNetworkIdByAdminUser(orgName);
    if((networkId === null) || (networkId === "")){
      console.log("Please create network first!");
      return null;
    }

    if (username.split('@')[0] === 'Admin') {
      const response = await ctx.curl(loginUrl, {
        method: 'POST',
        data: {
          username,
          password,
        },
        dataType: 'json',
      });
      if (response.status === 200) {
        const userModel = await ctx.model.User.findOne({ username });
        if (!userModel) {
          await ctx.service.smartContract.copySystemSmartContract(response.data.id);
          await ctx.model.User.create({
            _id: response.data.id,
            username,
          });
        }
        return {
          username: user.username,
          id: response.data.id,
          role: roles[0],
        };
      }
    } else {
      const orgUser = await ctx.model.OrgUser.findOne({ username });

      if (orgUser.password !== password || orgUser.active === "false") {
        return false;
      }

      let orgRole;
      if (orgUser) {
        if (orgUser.roles === 'org_admin') {
          orgRole = roles[0];
        } else {
          orgRole = roles[1];
        }

        return {
          username: orgUser.username,
          id: orgUser._id,
          role: orgRole,
        };
      }
    }
    return null;

  }

  async getCaInfoByUser(networkId, orgName) {
    const { ctx } = this;
    let caHost;
    let caPort;
    const ca = {};

    const networkUrl = `http://operator-dashboard:8071/v2/blockchain_networks/${networkId}/serviceendpoints`;
    const networkResponse = await ctx.curl(networkUrl, {
      method: 'GET',
    });

    if (networkResponse.status === 200) {
      const serviceData = JSON.parse(networkResponse.data.toString());
      for (const each in serviceData.service_endpoints) {
        if (serviceData.service_endpoints[each].service_type === 'ca') {
          const caOrg = serviceData.service_endpoints[each].service_name.split('.').slice(0)[1];
          if (caOrg === orgName) {
            caHost = serviceData.service_endpoints[each].service_ip;
            caPort = serviceData.service_endpoints[each].service_port;
            break;
          }
        }
      }
    }
    ca.caHost = caHost;
    ca.caPort = caPort;
    return ca;
  }

  async getNetworkIdByAdminUser(orgName) {
    const { ctx } = this;
    const orgUrl = `http://operator-dashboard:8071/v2/organizations?name=${orgName}`;
    let networkId;
    const orgResponse = await ctx.curl(orgUrl, {
      method: 'GET',
    });

    if (orgResponse.status === 200) {
      const data = JSON.parse(orgResponse.data.toString());
      networkId = data.organizations[0].blockchain_network_id;
    }
    return networkId;
  }

  async getCaVersionByNetworkId(blockchain_network_id) {
    const { ctx, config } = this;
    const orgUrl = `http://operator-dashboard:8071/v2/blockchain_networks/${blockchain_network_id}`;
    let fabricVersion;
    const blockResponse = await ctx.curl(orgUrl, {
      method: 'GET',
    });

    if (blockResponse.status === 200) {
      const data = JSON.parse(blockResponse.data.toString());
      fabricVersion = data.blockchain_network.fabric_version;
    }
    fabricVersion = fabricVersion.split('.').join('_');
    const caVersion = config.default.fabricCaVersions[`${fabricVersion}`];
    return caVersion;
  }

  async getCertiExpirationState(userCreateTime, userExpirationDateStr) {
    let flag;
    const nowTime = new Date();
    const timeSpentHour = (nowTime - userCreateTime) / (1000 * 3600);
    const userExpirationDateInt = parseInt(userExpirationDateStr.substring(0, userExpirationDateStr.length - 1));
    console.log('timeSpentHour: ' + timeSpentHour);
    console.log('userExpirationDateInt: ' + userExpirationDateInt);
    if (timeSpentHour > userExpirationDateInt) {
      console.log(' certificate has become invalid , need to reenroll');
      flag = false;
    } else {
      const leftTime = userExpirationDateInt - timeSpentHour;
      console.log(' Validity period remains ' + leftTime);
      flag = true;
    }
    return flag;
  }


  async createOrguser(name, role, password, delegateRoles, affiliation, affiliationMgr, revoker, gencrl) {
    const { ctx, config } = this;
    const userName = ctx.req.user.username;

    const attrs = [
      {
        name: 'hf.Registrar.Roles',
        // value: 'org_admin',
        value: role,
      },
      {
        name: 'hf.Registrar.DelegateRoles',
        // value: 'org_admin',
        value: delegateRoles,
      },
      {
        name: 'hf.Revoker',
        value: revoker,
      },
      {
        name: 'hf.IntermediateCA',
        value: 'true',
      },
      {
        name: 'hf.GenCRL',
        value: gencrl,
      },
      {
        name: 'hf.Registrar.Attributes',
        value: '*',
      },
      {
        name: 'hf.AffiliationMgr',
        value: affiliationMgr,
      },
    ];

    const opName = 'orguser_create';
    const opObject = 'user';
    const opDate = new Date();
    const opDetails = ctx.request.body.orguser;
    const orgName = userName.split('@')[1].split('.')[0];
    const orgDoamin = userName.split('@')[1];
    const mspId = orgName.charAt(0).toUpperCase() + orgName.slice(1) + 'MSP';
    let networkId;
    let caStorePath;
    let caDockerStorePath;
    let ca;
    let ancest;
    try {
      if (userName.split('@')[0] === 'Admin') {
        networkId = await ctx.service.user.getNetworkIdByAdminUser(orgName);
        ancest = 'Admin';
      } else {
        const userInfo = await ctx.model.OrgUser.findOne({ username: userName });
        if (userInfo === null) {
          const err_message = `user ${userName} can not found in db`;
          await ctx.service.log.deposit(opName, opObject, userName, opDate, 400, opDetails, {}, err_message);
          throw new Error(err_message);
        }
        networkId = userInfo.network_id;
        ancest = userInfo.ancestors + '.' + userName.split('@')[0];
      }
      opDetails.network_id = networkId;
      caStorePath = `${config.fabricDir}/${networkId}/crypto-config/peerOrganizations/${orgDoamin}/ca`;
      caDockerStorePath = '/etc/hyperledger/fabric-ca-server-config/';
      ca = await ctx.service.user.getCaInfoByUser(networkId, orgName);
    } catch (err) {
      console.log('func:createOrguser. get networkid or caInfo by orgName Failed, err: ' + err);
      await ctx.service.log.deposit(opName, opObject, userName, opDate, 400, opDetails, {}, err);
      throw new Error(err);
    }

    const caHost = ca.caHost;
    const caPort = ca.caPort;
    const caVersion = await ctx.service.user.getCaVersionByNetworkId(networkId);
    let registerUser;
    try {
      const userAuth = userName.split('@')[0];
      if (userAuth === 'Admin') {
        await ctx.enrollAdmin(caHost, caPort, mspId, caStorePath, caDockerStorePath, userName, caVersion);
        registerUser = 'admin';
      } else {
        registerUser = userName;
      }

      const result = await ctx.registerUser(registerUser, caHost, caPort, mspId, name, role, password, affiliation, `${caStorePath}/Admin@${orgDoamin}`, caDockerStorePath, attrs, caVersion);
      const createTime = new Date();
      if (result === true) {
        await ctx.model.OrgUser.create({
          username: name,
          password,
          roles: role,
          active: true,
          ancestors: ancest,
          orgname: orgName,
          network_id: networkId,
          delegate_roles: delegateRoles,
          affiliation_mgr: affiliationMgr,
          revoker,
          gencrl,
          create_time: createTime,
          expiration_date: '8760h',
          caVersion,
        });
        await ctx.service.log.deposit(opName, opObject, userName, opDate, 200, opDetails, {}, '');
        return true;
      }
      console.log(`register user ${name}@${orgDoamin} failed`);
    } catch (err) {
      console.log(`register user ${name}@${orgDoamin} failed` + err.message);
    }
    const errorMsg = `register user ${name}@${orgDoamin} failed`;
    await ctx.service.log.deposit(opName, opObject, userName, opDate, 400, opDetails, {}, errorMsg);
    return false;
  }

  async deleteOrguser(name, reason) {
    const { ctx, config } = this;
    const operaterName = ctx.req.user.username;
    const opName = 'orguser_delete';
    const opObject = 'user';
    const opDate = new Date();
    const opDetails = {};
    opDetails.name = ctx.req.query.name;
    opDetails.reason = ctx.req.query.reason;
    const orgName = operaterName.split('@')[1].split('.')[0];
    const orgDoamin = operaterName.split('@')[1];
    const operaterAncest = operaterName.split('@')[0];
    let networkId;
    let caStorePath;
    let caDockerStorePath;
    let ca;
    let regUser;
    try {
      if (operaterName.split('@')[0] === 'Admin') {
        networkId = await ctx.service.user.getNetworkIdByAdminUser(orgName);
        regUser = 'admin';
      } else {
        const userInfo = await ctx.model.OrgUser.findOne({ username: operaterName });
        if (userInfo === null) {
          const err_message = `user ${operaterName} can not found in db`;
          await ctx.service.log.deposit(opName, opObject, operaterName, opDate, 400, opDetails, {}, err_message);
          throw new Error(err_message);
        }
        networkId = userInfo.network_id;
        regUser = operaterName;
      }
      opDetails.network_id = networkId;
      caStorePath = `${config.fabricDir}/${networkId}/crypto-config/peerOrganizations/${orgDoamin}/ca/Admin@${orgDoamin}`;
      caDockerStorePath = '/etc/hyperledger/fabric-ca-server-config/';
      ca = await ctx.service.user.getCaInfoByUser(networkId, orgName);
    } catch (err) {
      const errorMsg = 'func:deleteOrguser. get networkid or caInfo by orgName Failed, err: ' + err;
      console.log(errorMsg);
      await ctx.service.log.deposit(opName, opObject, operaterName, opDate, 400, opDetails, {}, errorMsg);
      throw new Error(err);
    }

    const caHost = ca.caHost;
    const caPort = ca.caPort;
    const caVersion = await ctx.service.user.getCaVersionByNetworkId(networkId);
    // 只能删除自己创建的用户
    const userInfo = await ctx.model.OrgUser.findOne({ username: name });
    if (userInfo != null) {
      const userAncest = userInfo.ancestors;
      if (userAncest.split('.').indexOf(operaterAncest) < 0) {
        const err = operaterName + 'can not delete' + name + ', not it\'s ancestors.';
        await ctx.service.log.deposit(opName, opObject, operaterName, opDate, 400, opDetails, {}, err);
        throw new Error(err);
      }
    }

    const result = await ctx.deleteUser(regUser, name, reason, caHost, caPort, caStorePath, caDockerStorePath, caVersion);
    if (result === true) {
      try {
        await ctx.model.OrgUser.remove({ username: name });
      } catch (err) {
        const errMsg = name + 'revoked success but user ' + name + ' data remove from db failed,err:' + err;
        console.log(errMsg);
        await ctx.service.log.deposit(opName, opObject, operaterName, opDate, 400, opDetails, {}, errMsg);
        throw new Error(err);
      }
    }
    await ctx.service.log.deposit(opName, opObject, operaterName, opDate, 200, opDetails, {}, '');
    return result;
  }

  async getOrguser(name) {
    const { ctx } = this;
    let userAncest;
    const user = {};
    const operaterName = ctx.req.user.username;
    // const operaterName = 'new3@org1.ex.com';
    const operaterAncest = operaterName.split('@')[0];
    if (name.split('@')[0] === 'Admin') {
      user.success = false;
      user.reason = 'Admin user not srored in userDashboard DB';
    } else {
      const userInfo = await ctx.model.OrgUser.findOne({ username: name });
      if (userInfo != null) {
        userAncest = userInfo.ancestors;
        if (userAncest.split('.').indexOf(operaterAncest) >= 0) {
          const userIdentity = await ctx.service.user.getIdentity(name, operaterName);
          if (userIdentity.success === true) {
            userInfo._doc.affiliation = userIdentity.result.affiliation;
          }
          user.success = true;
          user.orguser = userInfo;
        } else {
          user.success = false;
          user.reason = 'not authoritied';
        }
      } else {
        user.success = false;
        user.reason = 'not found';
      }
    }

    return user;
  }

  async getOrguserList() {
    const { ctx } = this;
    const user = {};
    user.orgusers = [];
    const operaterName = ctx.req.user.username;
    // const operaterName = 'new3@org2.ex.com';
    const operaterAncest = operaterName.split('@')[0];
    const orgName = operaterName.split('@')[1].split('.')[0];
    let userAncest;
    const userListInOrg = await ctx.model.OrgUser.find({ orgname: orgName });
    if (userListInOrg.length !== 0 || userListInOrg !== null) {
      for (const each in userListInOrg) {
        userAncest = userListInOrg[each].ancestors;
        if (userAncest.split('.').indexOf(operaterAncest) >= 0) {
          const userIdentity = await ctx.service.user.getIdentity(userListInOrg[each].username, operaterName);
          if (userIdentity.success === true) {
            userListInOrg[each]._doc.affiliation = userIdentity.result.affiliation;
          }
          user.orgusers.push(userListInOrg[each]);
        }
      }
      user.success = true;
    } else {
      user.success = false;
    }
    return user;
  }

  async updateOrguserPassword(passwordnew) {
    const { ctx } = this;
    const result = { success: true };
    const operaterName = ctx.req.user.username;
    const opName = 'orguser_password_update';
    const opObject = 'user';
    const opDate = new Date();
    const opDetails = {};
    opDetails.name = operaterName;
    if (operaterName.split('@')[0] === 'Admin') {
      result.success = false;
      result.message = 'can not modify ' + operaterName + 'password!';
      console.log(result.message);
      await ctx.service.log.deposit(opName, opObject, operaterName, opDate, 400, opDetails, {}, result.message);
      return result;
    }
    const reg = /[^A-Za-z0-9\-_]/;
    const isVaild = reg.test(passwordnew);
    if (isVaild !== false) {
      result.success = false;
      result.message = 'password container invalid character';
      console.log(result.message);
      await ctx.service.log.deposit(opName, opObject, operaterName, opDate, 400, opDetails, {}, result.message);
      return result;
    }
    try {
      const userInfo = await ctx.model.OrgUser.findOne({ username: operaterName });
      if (userInfo != null) {
        if ((passwordnew !== '') && (passwordnew !== userInfo.password)) {
          await ctx.model.OrgUser.update({
            username: operaterName,
          }, {'$set': { password: passwordnew } }, { upsert: true });
        }
      } else {
        console.log('User' + operaterName + 'not found!');
        result.success = false;
        result.message = 'Not found ' + operaterName;
      }
    } catch (err) {
      await ctx.service.log.deposit(opName, opObject, operaterName, opDate, 400, opDetails, {}, err);
      throw new Error(err);
    }
    await ctx.service.log.deposit(opName, opObject, operaterName, opDate, 200, opDetails, {}, '');
    return result;
  }

  async updateOrguserState(name, activenew) {
    const { ctx } = this;
    const operaterName = ctx.req.user.username;
    const opName = 'orguser_state_update';
    const opObject = 'user';
    const opDate = new Date();
    const opDetails = {};
    opDetails.user_name = name;
    opDetails.activenew = activenew;

    const operaterAncest = operaterName.split('@')[0];
    const result = { success: true };
    let opCode = 200;
    if (operaterName === name) {
      result.success = false;
      result.message = 'user can not modify self\'s active state';
      opCode = 400;
      await ctx.service.log.deposit(opName, opObject, operaterName, opDate, opCode, opDetails, {}, result.message);
      console.log(result.message);
      return result;
    }
    try {
      const userInfo = await ctx.model.OrgUser.findOne({ username: name });
      if (userInfo != null) {
        const userAncest = userInfo.ancestors;
        if (userAncest.split('.').indexOf(operaterAncest) >= 0) {
          if ((['true', 'false'].indexOf(activenew) >= 0) && (activenew !== userInfo.active)) {
            await ctx.model.OrgUser.update({
              username: name,
            }, {'$set': { active: activenew } }, { upsert: true });
          }
        } else {
          // operator is not name's ancestor.
          result.success = false;
          result.message = 'Not authorthed';
          opCode = 400;
        }
      } else {
        result.success = false;
        result.message = 'User' + name + 'not found!';
        opCode = 400;
        console.log(result.message);
      }
    } catch (err) {
      await ctx.service.log.deposit(opName, opObject, operaterName, opDate, 400, opDetails, {}, err);
      throw new Error(err);
    }
    await ctx.service.log.deposit(opName, opObject, operaterName, opDate, opCode, opDetails, {}, result.message);
    return result;
  }

  async reenrollOrgUser(name) {
    const { ctx, config } = this;
    const operatorName = ctx.req.user.username;
    const opName = 'orguser_reenroll';
    const opObject = 'user';
    const opDate = new Date();
    const opDetails = {};
    opDetails.user_name = name;
    const operatorAncest = operatorName.split('@')[0];
    const orgName = operatorName.split('@')[1].split('.')[0];
    if (orgName !== name.split('@')[1].split('.')[0]) {
      const errorMsg = 'User ' + operatorName + ' and ' + name + ' not in a org';
      await ctx.service.log.deposit(opName, opObject, operatorName, opDate, 400, opDetails, {}, errorMsg);
      throw new Error(errorMsg);
    }
    const orgDoamin = operatorName.split('@')[1];
    const mspId = orgName.charAt(0).toUpperCase() + orgName.slice(1) + 'MSP';
    let ca;
    let networkId;
    let caStorePath;
    let caDockerStorePath;
    let regUser;

    try {
      if (operatorName.split('@')[0] === 'Admin') {
        networkId = await ctx.service.user.getNetworkIdByAdminUser(orgName);
        regUser = 'admin';
      } else {
        const userInfo = await ctx.model.OrgUser.findOne({ username: name });
        if (userInfo === null) {
          const errorMsg = `user ${name} can not found in db`;
          await ctx.service.log.deposit(opName, opObject, operatorName, opDate, 400, opDetails, {}, errorMsg);
          throw new Error(errorMsg);
        }
        if (userInfo != null) {
          const userAncest = userInfo.ancestors;
          if (userAncest.split('.').indexOf(operatorAncest) < 0) {
            const errorMsg = 'User ' + operatorName + ' is not  ' + name + '\'s ancestor, forbidden to enroll';
            await ctx.service.log.deposit(opName, opObject, operatorName, opDate, 400, opDetails, {}, errorMsg);
            throw new Error(errorMsg);
          }
          networkId = userInfo.network_id;
          regUser = operatorName;
        }
      }
      opDetails.network_id = networkId;
      caStorePath = `${config.fabricDir}/${networkId}/crypto-config/peerOrganizations/${orgDoamin}/ca/Admin@${orgDoamin}`;
      caDockerStorePath = '/etc/hyperledger/fabric-ca-server-config/';
      ca = await ctx.service.user.getCaInfoByUser(networkId, orgName);
    } catch (err) {
      const errorMsg = 'func: reenrollOrgUser. get networkid or caInfo by orgName Failed, err: ' + err;
      await ctx.service.log.deposit(opName, opObject, operatorName, opDate, 400, opDetails, {}, errorMsg);
      throw new Error(err);
    }
    let result;
    const caHost = ca.caHost;
    const caPort = ca.caPort;
    const caVersion = await ctx.service.user.getCaVersionByNetworkId(networkId);
    try {
      result = ctx.reenrollUser(regUser, name, mspId, caHost, caPort, caStorePath, caDockerStorePath, caVersion);
    } catch (e) {
      await ctx.service.log.deposit(opName, opObject, operatorName, opDate, 400, opDetails, {}, e);
      throw new Error(e);
    }

    await ctx.service.log.deposit(opName, opObject, operatorName, opDate, 200, opDetails, {}, '');
    return result;
  }

  async createAffiliation(targetName) {
    // const fabric_client = new Fabric_Client();
    const { ctx, config } = this;
    const operatorName = ctx.req.user.username;
    const opName = 'orguser_affiliation_create';
    const opObject = 'user';
    const opDate = new Date();
    const opDetails = {};
    opDetails.name = targetName;

    const orgName = operatorName.split('@')[1].split('.')[0];
    const orgDoamin = operatorName.split('@')[1];
    let networkId = null;
    let caStorePath = '';
    let caDockerStorePath = '';
    let regUser = '';
    let ca = null;

    try {
      if (operatorName.split('@')[0] === 'Admin') {
        networkId = await ctx.service.user.getNetworkIdByAdminUser(orgName);
        regUser = 'admin';
      } else {
        const userInfo = await ctx.model.OrgUser.findOne({ username: operatorName });
        if (userInfo === null) {
          const err_message = `user ${operatorName} can not found in db`;
          await ctx.service.log.deposit(opName, opObject, operatorName, opDate, 400, opDetails, {}, err_message);
          throw new Error(err_message);
        }
        networkId = userInfo.network_id;
        regUser = operatorName;
      }
      caStorePath = `${config.fabricDir}/${networkId}/crypto-config/peerOrganizations/${orgDoamin}/ca/Admin@${orgDoamin}`;
      caDockerStorePath = '/etc/hyperledger/fabric-ca-server-config/';
      ca = await ctx.service.user.getCaInfoByUser(networkId, orgName);
    } catch (err) {
      const err_message = 'func:createAffiliation. get networkid or caInfo by orgName Failed, err: ' + err;
      await ctx.service.log.deposit(opName, opObject, operatorName, opDate, 400, opDetails, {}, err_message);
      throw new Error(err);
    }
    let res;
    try {
      const caVersion = await ctx.service.user.getCaVersionByNetworkId(networkId);
      res = await ctx.createUserAffiliation(regUser, targetName, ca.caHost, ca.caPort, caStorePath, caDockerStorePath, caVersion);
    } catch (e) {
      await ctx.service.log.deposit(opName, opObject, operatorName, opDate, 400, opDetails, {}, e);
      throw new Error(e);
    }

    await ctx.service.log.deposit(opName, opObject, operatorName, opDate, 200, opDetails, {}, '');
    return res;
  }

  async getAffiliations() {
    const { ctx, config } = this;
    const operatorName = ctx.req.user.username;
    const orgName = operatorName.split('@')[1].split('.')[0];
    const mspId = orgName.charAt(0).toUpperCase() + orgName.slice(1) + 'MSP';

    const orgDoamin = operatorName.split('@')[1];

    let networkId = null;
    let caStorePath = '';
    let caDockerStorePath = '';
    let regUser = '';
    let ca = null;
    let caVersion;

    try {
      if (operatorName.split('@')[0] === 'Admin') {
        networkId = await ctx.service.user.getNetworkIdByAdminUser(orgName);
        regUser = 'admin';
      } else {
        const userInfo = await ctx.model.OrgUser.findOne({ username: operatorName });
        if (userInfo === null) {
          throw new Error(`\r\n user ${operatorName} can not found in db`);
        }

        networkId = userInfo.network_id;
        regUser = operatorName;
      }
      caVersion = await ctx.service.user.getCaVersionByNetworkId(networkId);

      caStorePath = `${config.fabricDir}/${networkId}/crypto-config/peerOrganizations/${orgDoamin}/ca/`;
      caDockerStorePath = '/etc/hyperledger/fabric-ca-server-config/';
      ca = await ctx.service.user.getCaInfoByUser(networkId, orgName);
      if (operatorName.split('@')[0] === 'Admin') {
        await ctx.enrollAdmin(ca.caHost, ca.caPort, mspId, caStorePath, caDockerStorePath, operatorName, caVersion);
      }

      caStorePath = `${config.fabricDir}/${networkId}/crypto-config/peerOrganizations/${orgDoamin}/ca/Admin@${orgDoamin}`;
    } catch (err) {
      console.log('func: getAffiliations. get networkid or caInfo by orgName Failed, err: ' + err);
      return {
        success: false,
        message: err,
      };
    }

    const result = await ctx.getUserAffiliations(regUser, ca.caHost, ca.caPort, caStorePath, caDockerStorePath, caVersion);
    return result;
  }


  async delAffiliation() {
    // const fabric_client = new Fabric_Client();
    const { ctx, config } = this;
    const targetName = ctx.params.affiliation;
    const operatorName = ctx.req.user.username;
    const opName = 'orguser_affiliation_del';
    const opObject = 'user';
    const opDate = new Date();
    const opDetails = {};
    opDetails.name = targetName;
    const orgName = operatorName.split('@')[1].split('.')[0];
    const orgDoamin = operatorName.split('@')[1];
    let networkId = null;
    let caStorePath = '';
    let caDockerStorePath = '';
    let regUser = '';
    let ca = null;

    try {
      if (operatorName.split('@')[0] === 'Admin') {
        networkId = await ctx.service.user.getNetworkIdByAdminUser(orgName);
        regUser = 'admin';
      } else {
        const userInfo = await ctx.model.OrgUser.findOne({ username: operatorName });
        if (userInfo === null) {
          const err_message = `user ${operatorName} can not found in db`;
          await ctx.service.log.deposit(opName, opObject, operatorName, opDate, 400, opDetails, {}, err_message);
          throw new Error(err_message);
        }

        networkId = userInfo.network_id;
        regUser = operatorName;
      }
      opDetails.network_id = networkId;
      caStorePath = `${config.fabricDir}/${networkId}/crypto-config/peerOrganizations/${orgDoamin}/ca/Admin@${orgDoamin}`;
      caDockerStorePath = '/etc/hyperledger/fabric-ca-server-config/';
      ca = await ctx.service.user.getCaInfoByUser(networkId, orgName);
    } catch (err) {
      const err_message = 'func: delAffiliation. get networkid or caInfo by orgName Failed, err: ' + err;
      console.log(err_message);
      await ctx.service.log.deposit(opName, opObject, operatorName, opDate, 400, opDetails, {}, err_message);
      return {
        success: false,
        message: err,
      };
    }
    let res;
    try {
      const caVersion = await ctx.service.user.getCaVersionByNetworkId(networkId);
      res = await ctx.delUserAffiliations(regUser, targetName, ca.caHost, ca.caPort, caStorePath, caDockerStorePath, caVersion);
    } catch (e) {
      await ctx.service.log.deposit(opName, opObject, operatorName, opDate, 400, opDetails, {}, e);
      throw new Error(e);
    }

    await ctx.service.log.deposit(opName, opObject, operatorName, opDate, 200, opDetails, {}, '');
    return res;
  }

  async updateAffiliation(sourceName, targetName) {
    const { ctx, config } = this;
    const operatorName = ctx.req.user.username;
    const opName = 'orguser_affiliation_update';
    const opObject = 'user';
    const opDate = new Date();
    const opDetails = {};
    opDetails.sourceName = sourceName;
    opDetails.targetName = targetName;
    const orgName = operatorName.split('@')[1].split('.')[0];
    const orgDoamin = operatorName.split('@')[1];
    let networkId = null;
    let caStorePath = '';
    let caDockerStorePath = '';
    let ca = null;

    try {
      if (operatorName.split('@')[0] === 'Admin') {
        networkId = await ctx.service.user.getNetworkIdByAdminUser(orgName);
      } else {
        const errorMsg = 'Authorization failure,please contact the administrator.';
        await ctx.service.log.deposit(opName, opObject, operatorName, opDate, 400, opDetails, {}, errorMsg);
        throw new Error(errorMsg);
      }
      opDetails.network_id = networkId;
      caStorePath = `${config.fabricDir}/${networkId}/crypto-config/peerOrganizations/${orgDoamin}/ca/Admin@${orgDoamin}`;
      caDockerStorePath = '/etc/hyperledger/fabric-ca-server-config/';
      ca = await ctx.service.user.getCaInfoByUser(networkId, orgName);
    } catch (err) {
      const errorMsg = 'func: updateAffiliation. get networkid or caInfo by orgName Failed, err: ' + err;
      console.log(errorMsg);
      await ctx.service.log.deposit(opName, opObject, operatorName, opDate, 400, opDetails, {}, errorMsg);
      return {
        success: false,
        message: err,
      };
    }

    let res;
    try {
      const caVersion = await ctx.service.user.getCaVersionByNetworkId(networkId);
      res = await ctx.updateUserAffiliation(sourceName, targetName, ca.caHost, ca.caPort, caStorePath, caDockerStorePath, caVersion);
    } catch (e) {
      await ctx.service.log.deposit(opName, opObject, operatorName, opDate, 400, opDetails, {}, e);
      throw new Error(e);
    }

    await ctx.service.log.deposit(opName, opObject, operatorName, opDate, 200, opDetails, {}, '');
    return res;
  }

  async getIdentities(operatorName) {
    const { ctx, config } = this;
    const orgName = operatorName.split('@')[1].split('.')[0];
    const fabric_client = new Fabric_Client();
    const orgDoamin = operatorName.split('@')[1];
    let fabric_ca_client = null;
    let networkId = null;
    let res = null;
    let store_path = '';
    let store_path_ca = '';
    let regUser = '';
    let ca = null;

    try {
      if (operatorName.split('@')[0] === 'Admin') {
        networkId = await ctx.service.user.getNetworkIdByAdminUser(orgName);
        regUser = 'admin';
      } else {
        const userInfo = await ctx.model.OrgUser.findOne({ username: operatorName });
        if (userInfo === null) {
          throw new Error(`\r\n user ${operatorName} can not found in db`);
        }

        networkId = userInfo.network_id;
        regUser = operatorName;
      }
      store_path = `${config.fabricDir}/${networkId}/crypto-config/peerOrganizations/${orgDoamin}/ca/Admin@${orgDoamin}`;
      store_path_ca = '/etc/hyperledger/fabric-ca-server-config/';
      ca = await ctx.service.user.getCaInfoByUser(networkId, orgName);
    } catch (err) {
      console.log('func: getIdentities. get networkid or caInfo by orgName Failed, err: ' + err);
      throw new Error(err);
    }

    await Fabric_Client.newDefaultKeyValueStore({ path: store_path,
    }).then((state_store) => {
      // assign the store to the fabric client
      fabric_client.setStateStore(state_store);
      const crypto_suite = Fabric_Client.newCryptoSuite();
      // use the same location for the state store (where the users' certificate are kept)
      // and the crypto store (where the users' keys are kept)
      const crypto_store = Fabric_Client.newCryptoKeyStore({ path: store_path });
      crypto_suite.setCryptoKeyStore(crypto_store);
      fabric_client.setCryptoSuite(crypto_suite);

      const crypto_suite_ca = Fabric_Client.newCryptoSuite();
      const crypto_store_ca = Fabric_Client.newCryptoKeyStore({ path: store_path_ca });
      crypto_suite_ca.setCryptoKeyStore(crypto_store_ca);

      const	tlsOptions = {
        trustedRoots: [],
        verify: false,
      };
      // be sure to change the http to https when the CA is running TLS enabled
      fabric_ca_client = new Fabric_CA_Client(`https://${ca.caHost}:${ca.caPort}`, tlsOptions , '', crypto_suite_ca);


      // first check to see if the admin is already enrolled
      return fabric_client.getUserContext(regUser, true);
    }).then((user_from_store) => {
      if (user_from_store && user_from_store.isEnrolled()) {
        console.log('Successfully loaded admin from persistence');
      } else {
        console.log('Failed to get admin.... run enrollAdmin.js');
        throw new Error('Failed to get admin.... run enrollAdmin.js');
      }

      const aff = fabric_ca_client.newIdentityService();

      //res = aff.getOne('user3@org1.org1.com', user_from_store);
      res = aff.getAll(user_from_store);
    });

    console.log('success opt');
    return res;
  }

  async getIdentity(targetName, operatorName) {
    const { ctx, config } = this;
    const orgName = operatorName.split('@')[1].split('.')[0];
    const orgDoamin = operatorName.split('@')[1];

    let networkId = null;
    let caStorePath = '';
    let caDockerStorePath = '';
    let regUser = '';
    let ca = null;

    try {
      if (operatorName.split('@')[0] === 'Admin') {
        networkId = await ctx.service.user.getNetworkIdByAdminUser(orgName);
        regUser = 'admin';
      } else {
        const userInfo = await ctx.model.OrgUser.findOne({ username: operatorName });
        if (userInfo === null) {
          throw new Error(`\r\n user ${operatorName} can not found in db`);
        }
        networkId = userInfo.network_id;
        regUser = operatorName;
      }
      caStorePath = `${config.fabricDir}/${networkId}/crypto-config/peerOrganizations/${orgDoamin}/ca/Admin@${orgDoamin}`;
      caDockerStorePath = '/etc/hyperledger/fabric-ca-server-config/';
      ca = await ctx.service.user.getCaInfoByUser(networkId, orgName);
    } catch (err) {
      console.log('func : getIdentity. get networkid or caInfo by orgName Failed, err: ' + err);
      throw new Error(err);
    }
    const caHost = ca.caHost;
    const caPort = ca.caPort;
    const caVersion = await ctx.service.user.getCaVersionByNetworkId(networkId);
    const res = await ctx.getUserIdentity(regUser, targetName, caHost, caPort, caStorePath, caDockerStorePath, caVersion);
    return res;
  }
}

module.exports = UserService;
