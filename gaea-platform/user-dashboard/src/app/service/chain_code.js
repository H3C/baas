/*
 SPDX-License-Identifier: Apache-2.0
*/
'use strict';

const Service = require('egg').Service;
const ObjectID = require('mongodb').ObjectID;
const fs = require('fs-extra');
const commonFs = require('fs');
const path = require('path');
const awaitWriteStream = require('await-stream-ready').write;
const awaitReadStream = require('await-stream-ready').read;
const sendToWormhole = require('stream-wormhole');
const AdmZip = require('adm-zip');
const rimraf = require('rimraf');
const crypto = require('crypto');


class ChainCodeService extends Service {
  async calcFileMd5(path) {
    const readStream = commonFs.createReadStream(path);
    const md5Hash = crypto.createHash('md5');
    readStream.on('data', function(d) {
      md5Hash.update(d);
    });
    // async operation will cause newMd5 is null
    // readStream.on('end', function() {
    //   const newMd5 = md5Hash.digest('hex');
    //   return newMd5;
    // });
    // use sync operation
    await awaitReadStream(readStream);
    const newMd5 = md5Hash.digest('hex');
    return newMd5;
  }
  async storeChainCode(stream, fields) {
    const { ctx, config } = this;
    // user_id = ctx.user.id;
    // org_id = getUser(id).organization_id;
    // network = getOrg().network_id
    const userName = ctx.user.username;
    const opName = 'chaincode_store';
    const opObject = 'chaincode';
    const opDate = new Date();
    const opDetails = {};
    opDetails.name = fields.name;
    opDetails.version = fields.version;
    opDetails.description = fields.description;
    opDetails.language = fields.language;
    opDetails.md5 = fields.md5;
    if (userName.split('@')[0] !== 'Admin') {
      const result = {};
      const userInfo = await ctx.model.OrgUser.findOne({ username: userName });
      if (userInfo === null) {
        const err_message = `user ${userName} can not found in db`;
        await ctx.service.log.deposit(opName, opObject, userName, opDate, 400, opDetails, {}, err_message);
        throw new Error(err_message);
      }
      const userCreateTime = userInfo.create_time;
      const userExpirationDateStr = userInfo.expiration_date;
      const ifValidity = await ctx.service.user.getCertiExpirationState(userCreateTime, userExpirationDateStr);
      if (ifValidity === false) {
        const err_message = userName + ' certificate has become invalid , need to reenroll';
        result.success = false;
        result.code = 400;
        result.message = err_message;
        await ctx.service.log.deposit(opName, opObject, userName, opDate, result.code, opDetails, {}, err_message);
        return result;
      }
      if (userInfo.roles === 'org_user') {
        const err_message = '403 forbidden, the operator user\'s role is org_user, join channel only can be operated by org_admin';
        console.log(err_message);

        result.success = false;
        result.code = 403;
        result.message = err_message;
        await ctx.service.log.deposit(opName, opObject, userName, opDate, result.code, opDetails, {}, err_message);
        return result;
      }
    }
    const orgName = userName.split('@')[1].split('.')[0];
    const orgUrl = `http://operator-dashboard:8071/v2/organizations?name=${orgName}`;
    const orgResponse = await ctx.curl(orgUrl, {
      method: 'GET',
    });
    const data = JSON.parse(orgResponse.data.toString());
    const organization = data.organizations[0];

    const networkId = organization.blockchain_network_id;
    const chainCodeId = new ObjectID();

    const chainCodePath = `${config.fabricDir}/${networkId}/chainCode/${chainCodeId}`;
    const targetFileName = stream.filename;
    const zipFile = path.join(chainCodePath, targetFileName);
    fs.ensureDirSync(chainCodePath);
    const writeStream = fs.createWriteStream(zipFile);
    try {
      await awaitWriteStream(stream.pipe(writeStream));
    } catch (err) {
      await sendToWormhole(stream);
      ctx.status = 500;
      await ctx.service.log.deposit(opName, opObject, userName, opDate, ctx.status, opDetails, {}, err.message);
      ctx.throw(500, err.message);
    }
    // const zip = AdmZip(zipFile);
    // zip.extractAllTo(chainCodePath, true);
    // commonFs.unlinkSync(zipFile);
    const md5 = fields.md5;
    const new_md5 = await this.calcFileMd5(zipFile, md5);
    if (new_md5 !== md5) {
      ctx.status = 400;
      const errorMsg = "md5 of uploaded file doesn't match";
      await ctx.service.log.deposit(opName, opObject, userName, opDate, ctx.status, opDetails, {}, errorMsg);
      ctx.throw(400, errorMsg);
    }

    const curTime = new Date();
    const chainCodeModel = await ctx.model.ChainCode.create({
      _id: chainCodeId,
      name: fields.name,
      version: fields.version,
      description: fields.description,
      language: fields.language,
      md5: fields.md5,
      creator_id: ctx.user.id,
      creator_name: ctx.user.username,
      blockchain_network_id: networkId,
      create_ts: curTime,
    });
    await ctx.service.log.deposit(opName, opObject, userName, opDate, 200, opDetails, {}, '');
    return {
      id: chainCodeModel._id.toString(),
      success: true,
    };
  }

  async fistToUpper(value) {
    if (value.length === 1) {
      return value.toUpperCase();
    }

    return (value.charAt(0).toUpperCase() + value.slice(1));
  }

  async buildNetworkConfigOrganizations(networkEndpoints, orgs, peerNames, networkRootDir) {
    // "orgs" is an array of GET
    const organizations = {};
    for (let i = 0, len = orgs.length; i < len; i++) {
      const each = orgs[i];
      const orgDomain = each.domain;
      const orgName = each.name;
      const orgFullName = `${orgName}.${orgDomain}`;
      const keyValueStorePath = `${networkRootDir}/client-kvs`;
      fs.ensureDirSync(keyValueStorePath);

      const orgNameFu = await this.fistToUpper(orgName);
      const adminPkPath = `${networkRootDir}/crypto-config/peerOrganizations/${orgFullName}/users/Admin@${orgFullName}/msp/keystore/`;
      const adminPkFile = commonFs.readdirSync(`${adminPkPath}`)[0];
      organizations[`${orgName}`] = {
        mspid: `${orgNameFu}MSP`,
        peers: peerNames,
        adminPrivateKey: {
          path: `${adminPkPath}${adminPkFile}`,
        },
        signedCert: {
          path: `${networkRootDir}/crypto-config/peerOrganizations/${orgFullName}/users/Admin@${orgFullName}/msp/signcerts/Admin@${orgFullName}-cert.pem`,
        },
        certificateAuthorities: [`ca-${orgName}`],
      };
    }
    return organizations;
  }
  async buildNetworkConfigPeers(networkEndpoints, peerNames, networkRootDir) {
    const peers = {};
    for (let i = 0, len = peerNames.length; i < len; i++) {
      const pr = peerNames[i];
      const orgFullName = pr.split('.').slice(1).join('.'); // peerName, example:"'peer1.org1.h3c.com"
      peers[pr] = {
        grpcOptions: {
          'ssl-target-name-override': pr,
        },
        tlsCACerts: {
          path: `${networkRootDir}/crypto-config/peerOrganizations/${orgFullName}/peers/${pr}/tls/ca.crt`,
        },
      };
      for (let i = 0, len = networkEndpoints.length; i < len; i++) {
        const endpoint = networkEndpoints[i];
        if (endpoint.service_type === 'peer' && endpoint.service_name === pr) {
          if (endpoint.peer_port_proto === 'event') {
            peers[pr].eventUrl = `grpcs://${endpoint.service_ip}:${endpoint.service_port}`;
          }
          else if (endpoint.peer_port_proto === 'grpc') {
            peers[pr].url = `grpcs://${endpoint.service_ip}:${endpoint.service_port}`;
          }
          // peers[pr].grpcOptions = {
          //   'ssl-target-name-override': endpoint.service_ip,
          // };
        }
      }
    }
    return peers;
  }

  async buildNetworkConfigCA(networkEndpoints, org, networkRootDir) {
    const certificateAuthorities = {};
    const orgDomain = org.domain;
    const orgName = org.name;
    const orgFullName = `${orgName}.${orgDomain}`;
    const orgCA = `ca.${orgFullName}`;
    for (let i = 0, len = networkEndpoints.length; i < len; i++) {
      const endpoint = networkEndpoints[i];
      if (endpoint.service_type === 'ca' && endpoint.service_name === orgCA) {
        certificateAuthorities[orgCA] = {
          url: `https://${endpoint.service_ip}:${endpoint.service_port}`,
          // url: `http://${endpoint.service_ip}:${endpoint.service_port}`,
          caName: orgCA,
          httpOptions: {
            verify: false,
          },
          registrar: [
            {
              enrollId: 'admin',
              enrollSecret: 'adminpw',
            },
          ],
          tlsCACerts: {
            path: `${networkRootDir}/crypto-config/peerOrganizations/${orgFullName}/ca/ca.${orgFullName}-cert.pem`,
          },
        };
      }
    }
    return certificateAuthorities;
  }

  async buildNetworkConfigChannels(channel) {
    const channels = {};
    const peerNames = channel.peers_inChannel;
    const channel_orderers = [channel.orderer_url];
    const channel_peers = {};

    for (let i = 0, len = peerNames.length; i < len; i++) {
      const pr = peerNames[i];
      channel_peers[pr] = {
        chaincodeQuery: true,
        endorsingPeer: true,
        eventSource: true,
        ledgerQuery: true,
      };
    }
    channels[channel.name] = {
      orderers: channel_orderers,
      peers: channel_peers,
    };
    return channels;
  }

  async buildNetworkConfigOrderers(networkEndpoints, ordererName, networkRootDir) {
    const orderers = {};
    const ordererDomain = ordererName.split('.').slice(1).join('.');
    for (let i = 0, len = networkEndpoints.length; i < len; i++) {
      const endpoint = networkEndpoints[i];
      if (endpoint.service_type === 'orderer' && endpoint.service_name === ordererName) {
        orderers[ordererName] = {
          url: `grpcs://${endpoint.service_ip}:${endpoint.service_port}`,
          grpcOptions: { 'ssl-target-name-override': ordererName },
          // grpcOptions: {'ssl-target-name-override': endpoint.service_ip},
          tlsCACerts: {
            path: `${networkRootDir}/crypto-config/ordererOrganizations/${ordererDomain}/orderers/${ordererName}/tls/ca.crt`,
          },
        };
      }
    }
    return orderers;
  }
  async installChainCode() {
    const { ctx, config } = this;
    const body = ctx.request.body;
    const install_peers = body.install.peers;
    const userName = ctx.user.username;
    const orgName = userName.split('@')[1].split('.')[0];
    const result = {};
    const opName = 'chaincode_install';
    const opObject = 'chaincode';
    const opDate = new Date();
    const opDetails = install_peers;
    opDetails.chaincode_id = ctx.params.chaincode_id;
    if (userName.split('@')[0] !== 'Admin') {
      const userInfo = await ctx.model.OrgUser.findOne({ username: userName });
      if (userInfo === null) {
        const err_message = `user ${userName} can not found in db`;
        await ctx.service.log.deposit(opName, opObject, userName, opDate, 400, opDetails, {}, err_message);
        throw new Error(err_message);
      }
      const userCreateTime = userInfo.create_time;
      const userExpirationDateStr = userInfo.expiration_date;
      const ifValidity = await ctx.service.user.getCertiExpirationState(userCreateTime, userExpirationDateStr);
      if (ifValidity === false) {
        const err_message = userName + ' certificate has become invalid , need to reenroll';
        result.success = false;
        result.code = 400;
        result.message = err_message;
        await ctx.service.log.deposit(opName, opObject, userName, opDate, result.code, opDetails, {}, err_message);
        return result;
      }
      if (userInfo.roles === 'org_user') {
        const err_message = '403 forbidden, the operator user\'s role is org_user, join channel only can be operated by org_admin';
        console.log(err_message);

        result.success = false;
        result.code = 403;
        result.message = err_message;
        await ctx.service.log.deposit(opName, opObject, userName, opDate, result.code, opDetails, {}, err_message);
        return result;
      }
    }
    const chainCodeId = ctx.params.chaincode_id;
    let chainCodeData = await ctx.model.ChainCode.findOne({ _id: chainCodeId });
    let orgResponse = {};
    try {
      const orgUrl = `http://operator-dashboard:8071/v2/organizations?name=${orgName}`;
      orgResponse = await ctx.curl(orgUrl, {
        method: 'GET',
      });
    } catch (e) {
      ctx.status = 500;
      console.log(e.message);
      await ctx.service.log.deposit(opName, opObject, userName, opDate, ctx.status, opDetails, {}, e.message);
      ctx.throw(500, e.message);
    }
    let data = JSON.parse(orgResponse.data.toString());
    const organization = data.organizations[0];
    const orgDomain = organization.domain;
    const orgFullName = `${orgName}.${orgDomain}`;
    const networkId = organization.blockchain_network_id;
    const networkRootDir = `${config.fabricDir}/${networkId}`;
    const keyValueStorePath = `${networkRootDir}/client-kvs`;
    fs.ensureDirSync(keyValueStorePath);

    const chainCodeDir = `${networkRootDir}/chainCode/${chainCodeId}/`;
    const chainCodeFile = commonFs.readdirSync(`${chainCodeDir}`)[0];
    const chainCodeFilePath = path.join(chainCodeDir, chainCodeFile);
    const origMd5 = chainCodeData.md5;
    const cur_md5 = await this.calcFileMd5(chainCodeFilePath, origMd5);
    opDetails.origMd5 = origMd5;
    opDetails.cur_md5 = cur_md5;
    opDetails.networkId = networkId;
    if (cur_md5 !== origMd5) {
      ctx.status = 403;
      const errMsg = 'chainCode has been changed, refuse to install';
      await ctx.service.log.deposit(opName, opObject, userName, opDate, ctx.status, opDetails, {}, errMsg);
      ctx.throw(403, errMsg);
    }
    const zip = AdmZip(chainCodeFilePath);
    const chainCodeTmpDir = `${networkRootDir}/chainCode/${chainCodeId}/tmpExtract/`;
    fs.ensureDirSync(`${chainCodeTmpDir}`);
    zip.extractAllTo(chainCodeTmpDir, true);
    const chainCodeSrcTmpDir = commonFs.readdirSync(`${chainCodeTmpDir}`)[0];
    const chainCodeSrcTmpPath = path.join(chainCodeTmpDir, chainCodeSrcTmpDir);
    if (!fs.statSync(chainCodeSrcTmpPath).isDirectory()) {
      ctx.status = 400;
      const err_message = 'chaincode source files should be put in a directory and then compress to zip, please check.'
      console.log(err_message);
      await ctx.service.log.deposit(opName, opObject, userName, opDate, ctx.status, opDetails, {}, err_message);
      ctx.throw(400, err_message);
    }

    let chainCodePath; // for golang, it is a directory name, in fact.
    process.env.GOPATH = '/root/go';
    const goPath = process.env.GOPATH;
    const goCcTmpPath = `${goPath}/src`;
    fs.ensureDirSync(`${goCcTmpPath}`);
    // for now, only support golang
    if (chainCodeData.language === 'golang') {
      fs.copySync(chainCodeTmpDir, goCcTmpPath); // move extracted dir to gopath
      chainCodePath = chainCodeSrcTmpDir;
      rimraf(chainCodeTmpDir, function(err) {
        console.log(err);
      }); // delete extranct file dir
    }

    let networkResponse = {};
    try {
      const networkUrl = `http://operator-dashboard:8071/v2/blockchain_networks/${networkId}/serviceendpoints`;
      networkResponse = await ctx.curl(networkUrl, {
        method: 'GET',
      });
    } catch (e) {
      console.log(e.message);
      await ctx.service.log.deposit(opName, opObject, userName, opDate, 500, opDetails, {}, e.message);
      ctx.throw(500, e.message);
    }
    data = JSON.parse(networkResponse.data.toString());
    const networkEndpoints = data.service_endpoints;
    const peerNames = [];
    for (let i = 0; i < organization.peerNum; i++) {
      peerNames.push(`peer${i}.${orgFullName}`);
    }

    const organizations = await this.buildNetworkConfigOrganizations(networkEndpoints, [organization], peerNames, networkRootDir);
    const peers = await this.buildNetworkConfigPeers(networkEndpoints, install_peers, networkRootDir);
    const certificateAuthorities = await this.buildNetworkConfigCA(networkEndpoints, organization, networkRootDir);
    const network = {
      config: {
        version: '1.0',
        'x-type': 'hlfv1',
        name: `${orgName}-ccinstall`,
        description: `${orgName}-ccinstall`,
        organizations,
        peers,
        certificateAuthorities,
      },
    };
    network[`${orgName}`] = {
      'x-type': 'hlfv1',
      name: `${networkId.slice(0, 12)}-${orgName}`,
      description: `${networkId.slice(0, 12)}-${orgName}`,
      version: '1.0',
      client: {
        organization: `${orgName}`,
        credentialStore: {
          path: keyValueStorePath,
          cryptoStore: {
            path: `${keyValueStorePath}/${orgName}`,
          },
          wallet: 'wallet',
        },
      },
    };

    console.log(network);

    try {
      const curTime = new Date();
      await ctx.installChainCode(network, orgName, chainCodeData, chainCodePath, body);
      // chainCode install complete and succeed
      const install_peer_tmp = [];
      for (let i = 0; i < install_peers.length; i++) {
        install_peer_tmp.push({ peer_name: install_peers[i], install_ts: curTime });
      }
      await ctx.model.ChainCode.update({ _id: chainCodeId }, { $push: { 'peers': { $each: install_peer_tmp } } }, { upsert: false });
      chainCodeData = await ctx.model.ChainCode.findOne({ _id: chainCodeId });
      await ctx.model.ChainCode.update({ _id: chainCodeId }, { $set:{'install_times': chainCodeData.peers.length } });


    } catch (err) {
      ctx.status = 500;
      console.log(err.message);
      await ctx.service.log.deposit(opName, opObject, userName, opDate, ctx.status, opDetails, {}, err.message);
      ctx.throw(500, err.message);
    } finally {
      // For install, chainCode need be put under gopath/src temporary
      if (chainCodeData.language === 'golang') {
        rimraf(`${goCcTmpPath}/${chainCodePath}`, function(err) {
          console.log(err);
        }); // delete gopath file dir
      }
    }

    result.success = true;
    result.code = 200;
    result.message = 'install ChainCode Success';
    await ctx.service.log.deposit(opName, opObject, userName, opDate, result.code, opDetails, {}, result.message);
    return result;
  }

  async instantiateChainCode() {
    const { ctx, config } = this;
    const userName = ctx.user.username;
    const result = {};
    const opName = 'chaincode_instantiate';
    const opObject = 'chaincode';
    const opDate = new Date();
    const opDetails = ctx.request.body.instantiate;
    opDetails.chaincoid_id = ctx.params.chaincode_id;
    if (userName.split('@')[0] !== 'Admin') {
      const userInfo = await ctx.model.OrgUser.findOne({ username: userName });
      if (userInfo === null) {
        const err_message = `user ${userName} can not found in db`;
        await ctx.service.log.deposit(opName, opObject, userName, opDate, 400, opDetails, {}, err_message);
        throw new Error(err_message);
      }
      const userCreateTime = userInfo.create_time;
      const userExpirationDateStr = userInfo.expiration_date;
      const ifValidity = await ctx.service.user.getCertiExpirationState(userCreateTime, userExpirationDateStr);
      if (ifValidity === false) {
        const err_message = userName + ' certificate has become invalid , need to reenroll';
        result.success = false;
        result.code = 400;
        await ctx.service.log.deposit(opName, opObject, userName, opDate, 400, opDetails, {}, err_message);
        result.message = err_message;
        return result;
      }
      if (userInfo.roles === 'org_user') {
        const err_message = '403 forbidden, the operator user\'s role is org_user, instantiateChainCode only can be operated by org_admin';
        console.log(err_message);

        result.success = false;
        result.code = 403;
        result.message = err_message;
        await ctx.service.log.deposit(opName, opObject, userName, opDate, result.code, opDetails, {}, err_message);
        return result;
      }
    }
    const orgName = userName.split('@')[1].split('.')[0];
    const chainCodeId = ctx.params.chaincode_id;
    const body = ctx.request.body.instantiate;
    const channel_id = body.channel_id;
    opDetails.channel_id = channel_id;
    const channelData = await ctx.model.Channel.findOne({ _id: channel_id });
    const peerNames_database = channelData.peers_inChannel; // database array can not be use in 'for ... in'
    const ordererName = channelData.orderer_url;

    const peersInChannel = [];
    for (let i = 0, len = peerNames_database.length; i < len; i++) {
      peersInChannel.push(peerNames_database[i]);
    }

    let orgResponse = {};
    try {
      const orgUrl = `http://operator-dashboard:8071/v2/organizations?name=${orgName}`;
      orgResponse = await ctx.curl(orgUrl, {
        method: 'GET',
      });
    } catch (e) {
      console.log(e.message);
      await ctx.service.log.deposit(opName, opObject, userName, opDate, 500, opDetails, {}, e.message);
      ctx.throw(500, e.message);
    }
    let data = JSON.parse(orgResponse.data.toString());
    const organization = data.organizations[0];
    const orgDomain = organization.domain;
    const orgAndDomain = userName.split('@')[1];
    const orgFullName = `${orgName}.${orgDomain}`;
    const peerNamesInOrg = [];
    for (let i = 0; i < organization.peerNum; i++) {
      peerNamesInOrg.push(`peer${i}.${orgFullName}`);
    }
    const networkId = organization.blockchain_network_id;
    const networkRootDir = `${config.fabricDir}/${networkId}`;
    const keyValueStorePath = `${networkRootDir}/crypto-config/peerOrganizations/${orgAndDomain}/ca/Admin@${orgAndDomain}`;
    fs.ensureDirSync(keyValueStorePath);
    let networkResponse = {};
    try {
      const networkUrl = `http://operator-dashboard:8071/v2/blockchain_networks/${networkId}/serviceendpoints`;
      networkResponse = await ctx.curl(networkUrl, {
        method: 'GET',
      });
    } catch (e) {
      console.log(e.message);
      await ctx.service.log.deposit(opName, opObject, userName, opDate, 500, opDetails, {}, e.message);
      ctx.throw(500, e.message);
    }
    data = JSON.parse(networkResponse.data.toString());
    const networkEndpoints = data.service_endpoints;

    const organizations = await this.buildNetworkConfigOrganizations(networkEndpoints, [organization], peerNamesInOrg, networkRootDir);
    const peers = await this.buildNetworkConfigPeers(networkEndpoints, peersInChannel, networkRootDir);
    const certificateAuthorities = await this.buildNetworkConfigCA(networkEndpoints, organization, networkRootDir);
    const channels = await this.buildNetworkConfigChannels(channelData);
    const orderers = await this.buildNetworkConfigOrderers(networkEndpoints, ordererName, networkRootDir);

    const network = {
      config: {
        version: '1.0',
        'x-type': 'hlfv1',
        name: `${orgName}-ccinstall`,
        description: `${orgName}-ccinstall`,
        organizations,
        peers,
        certificateAuthorities,
        channels,
        orderers,
      },
    };
    network[`${orgName}`] = {
      'x-type': 'hlfv1',
      name: `${networkId.slice(0, 12)}-${orgName}`,
      description: `${networkId.slice(0, 12)}-${orgName}`,
      version: '1.0',
      client: {
        organization: `${orgName}`,
        credentialStore: {
          path: keyValueStorePath,
          cryptoStore: {
            path: keyValueStorePath,
          },
          wallet: 'wallet',
        },
      },
    };

    console.log(network);

    try {
      const chainCodeData = await ctx.model.ChainCode.findOne({ _id: chainCodeId });
      await ctx.instantiateChainCode(network, orgName, channelData, chainCodeData, body, userName);

      // after instantiate success,update chaincode "channel"
      await ctx.model.ChainCode.update({ _id: chainCodeId }, { $addToSet: { 'channel_ids': channel_id } });
    } catch (e) {
      ctx.status = 500;
      console.log(e.message);
      await ctx.service.log.deposit(opName, opObject, userName, opDate, 500, opDetails, {}, e.message);
      ctx.throw(500, e.message);
    }

    result.success = true;
    result.code = 200;
    result.message = 'instantiate ChainCode Success';
    await ctx.service.log.deposit(opName, opObject, userName, opDate, 200, opDetails, {}, result.message);
    return result;
  }


  async getNetworkIdbyOrgname(userOrgName) {
    const { ctx } = this;
    const orgUrl = `http://operator-dashboard:8071/v2/organizations?name=${userOrgName}`;
    const orgResponse = await ctx.curl(orgUrl, {
      method: 'GET',
    });

    if (orgResponse.status === 200) {
      const data = JSON.parse(orgResponse.data.toString());
      const networkId = data.organizations[0].blockchain_network_id;
      return networkId;
    }

    throw new Error('getChainCodes getOrganizations failed,orgResponse.status: ' + orgResponse.status);
  }

  async getChainCodes() {
    const { ctx } = this;
    const userName = ctx.req.user.username;
    const userOrgName = userName.split('@')[1].split('.')[0];

    const networkId = await this.getNetworkIdbyOrgname(userOrgName);
    const chainCodesData = await ctx.model.ChainCode.find({ blockchain_network_id: networkId });
    const allChainCodes = [];

    for (let code = 0; code < chainCodesData.length; code++) {
      const peers = [];
      for (let i = 0; i < chainCodesData[code].peers.length; i++) {
        const peer_name = chainCodesData[code].peers[i].peer_name;
        if (peer_name.split('.').slice(0)[1] === userOrgName) {
          peers.push(chainCodesData[code].peers[i]);
        }
      }


      allChainCodes.push({
        id: chainCodesData[code]._id,
        name: chainCodesData[code].name,
        description: chainCodesData[code].description,
        version: chainCodesData[code].version,
        language: chainCodesData[code].language,
        peers,
        channel_ids: chainCodesData[code].channel_ids,
        creator_id: chainCodesData[code].creator_id,
        creator_name: chainCodesData[code].creator_name,
        blockchain_network_id: chainCodesData[code].blockchain_network_id,
        create_ts: chainCodesData[code].create_ts,
        install_times: chainCodesData[code].install_times,
        md5: chainCodesData[code].md5,
      });
    }

    return { chaincodes: allChainCodes };
  }

  async getChainCodeById() {
    const { ctx } = this;
    try {
      const chainCodeId = ctx.params.chaincode_id;
      const userName = ctx.req.user.username;
      const userOrgName = userName.split('@')[1].split('.')[0];

      const networkId = await this.getNetworkIdbyOrgname(userOrgName);

      const chainCodesData = await ctx.model.ChainCode.findOne({ blockchain_network_id: networkId, _id: chainCodeId });
      const peers = [];
      for (let i = 0; i < chainCodesData.peers.length; i++) {
        const peer_name = chainCodesData.peers[i].peer_name;
        if (peer_name.split('.').slice(0)[1] === userOrgName) {
          peers.push(chainCodesData.peers[i]);
        }
      }

      return {
        'chaincode': {
          id: chainCodesData._id,
          name: chainCodesData.name,
          description: chainCodesData.description,
          version: chainCodesData.version,
          language: chainCodesData.language,
          peers,
          channel_ids: chainCodesData.channel_ids,
          creator_id: chainCodesData.creator_id,
          creator_name: chainCodesData.creator_name,
          blockchain_network_id: chainCodesData.blockchain_network_id,
          create_ts: chainCodesData.create_ts,
          install_times: chainCodesData.install_times,
          md5: chainCodesData.md5,
        },
      };
    } catch (e) {
      console.log(e);
      return false;
    }
  }


  async deleteChainCodeById() {
    const { ctx, config } = this;
    const chainCodeId = ctx.params.chaincode_id;
    let err_Reason;
    const result = {
      success: false,
      code: 400,
    };
    const userName = ctx.req.user.username;
    const opName = 'chaincode_delete_byId';
    const opObject = 'chaincode';
    const opDate = new Date();
    const opDetails = {};
    opDetails.chaincode_id = chainCodeId;
    try {
      if (userName.split('@')[0] !== 'Admin') {
        const userInfo = await ctx.model.OrgUser.findOne({ username: userName });
        if (userInfo.roles === 'org_user') {
          err_Reason = '403 forbidden, the operator user\'s role is org_user, delete ChainCode only can be operated by org_admin';
          console.log(err_Reason);
          result.code = 403;
          result.message = err_Reason;
          await ctx.service.log.deposit(opName, opObject, userName, opDate, result.code, opDetails, {}, err_Reason);
          return result;
        }
      }
      const userOrgName = userName.split('@')[1].split('.')[0];
      const networkId = await this.getNetworkIdbyOrgname(userOrgName);
      opDetails.network_id = networkId;
      const chaincode = await ctx.model.ChainCode.findOne({ _id: chainCodeId });
      if (chaincode.peers.length > 0) {
        err_Reason = 'the chaincode has been installed, can not be removed';
        console.log(err_Reason);
        result.message = err_Reason;
        result.code = 400;
        await ctx.service.log.deposit(opName, opObject, userName, opDate, result.code, opDetails, {}, err_Reason);
        return result;
      }

      await ctx.model.ChainCode.remove({ blockchain_network_id: networkId, _id: chainCodeId });
      const chainCodePath = `${config.fabricDir}/${networkId}/chainCode/${chainCodeId}`;
      await this.deleteFolder(chainCodePath);
    } catch (error) {
      err_Reason = 'delete failed, some err happened' + error;
      console.log(err_Reason);
      result.message = err_Reason;
      result.code = 400;
      await ctx.service.log.deposit(opName, opObject, userName, opDate, result.code, opDetails, {}, err_Reason);
      return result;
    }
    result.success = true;
    result.code = 200;
    result.message = 'deleteChainCodeById Success!';
    await ctx.service.log.deposit(opName, opObject, userName, opDate, result.code, opDetails, {}, result.message);
    return result;
  }

  async deleteFolder(path) {
    let files = [];
    if (fs.existsSync(path)) {
      files = fs.readdirSync(path);
      for (const each in files) {
        const curPath = path + '/' + files[each];
        if (fs.statSync(curPath).isDirectory()) {
          await this.deleteFolder(curPath);
        } else {
          fs.unlinkSync(curPath);
        }
      }
      fs.rmdirSync(path);
    }
  }
}

module.exports = ChainCodeService;
