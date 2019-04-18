'use strict';

module.exports = app => {
  // async function getClientForOrg(org, clients, networkType = 'fabric-1.0', network, username = '') {
  //   switch (networkType) {
  //     case 'fabric-1.0':
  //     default:
  //       return await app.getClientForOrgV1_0(org, clients);
  //     case 'fabric-1.1':
  //       return await app.getClientForOrgV1_1(org, network, username);
  //   }
  // }
  async function getChannelForOrg(org, channels, networkType = 'fabric-1.0') {
    switch (networkType) {
      case 'fabric-1.0':
      default:
        return await app.getChannelForOrgV1_0(org, channels);
    }
  }
  async function getOrgAdmin(userOrg, helper, networkType = 'fabric-1.0') {
    switch (networkType) {
      case 'fabric-1.0':
      default:
        return await app.getOrgAdminV1_0(userOrg, helper);
    }
  }
  async function createChannel(network, channelName, channelConfigPath, orgName = 'org1', userName, networkType = 'fabric-1.1') {
    switch (networkType) {
      case 'fabric-1.4':
        return await app.createChannelV1_4(network, channelName, channelConfigPath, userName, orgName);
      case 'fabric-1.1':
      default:
        return await app.createChannelV1_1(network, channelName, channelConfigPath, orgName, userName);
    }
  }
  async function joinChannel(network, channelName, peers, org, networkType = 'fabric-1.1', username) {
    switch (networkType) {
      case 'fabric-1.4':
        return await app.joinChannelV1_4(network, channelName, peers, org, username);
      case 'fabric-1.1':
      default:
        return await app.joinChannelV1_1(network, channelName, peers, org, username);
    }
  }

  async function instantiateChainCode(network, orgName, channelData, chainCodeData, body, userName) {
    const networkType = channelData.version;
    switch (networkType) {
      case 'fabric-1.4':
        return await app.instantiateChainCodeV1_4(network, orgName, channelData, chainCodeData, body, userName);
      case 'fabric-1.1':
      default:
        return await app.instantiateChainCodeV1_1(network, orgName, channelData, chainCodeData, body, userName);
    }
  }

  async function installChainCode(network, orgName, chainCodeData, chainCodePath, body, networkType = 'fabric-1.1') {
    // now only support fabric-1.1
    switch (networkType) {
      case 'fabric-1.4':
        return await app.installChainCodeV1_4(network, orgName, chainCodeData, chainCodePath, body);
      case 'fabric-1.1':
      default:
        return await app.installChainCodeV1_1(network, orgName, chainCodeData, chainCodePath, body);
    }
  }

  async function installSmartContract(network, keyValueStorePath, peers, userId, smartContractCodeId, chainId, org, networkType = 'fabric-1.0', username = '') {
    switch (networkType) {
      case 'fabric-1.0':
      default:
        return await app.installSmartContractV1_0(network, keyValueStorePath, peers, userId, smartContractCodeId, chainId, org);
      case 'fabric-1.1':
        return await app.installSmartContractV1_1(network, keyValueStorePath, peers, userId, smartContractCodeId, chainId, org, username);
      case 'fabric-1.4':
        return await app.installSmartContractV1_4(network, keyValueStorePath, peers, userId, smartContractCodeId, chainId, org, username);
    }
  }
  async function instantiateSmartContract(network, keyValueStorePath, channelName, deployId, functionName, args, org, networkType = 'fabric-1.0', peers, username = '') {
    switch (networkType) {
      case 'fabric-1.0':
      default:
        return await app.instantiateSmartContractV1_0(network, keyValueStorePath, channelName, deployId, functionName, args, org);
      case 'fabric-1.1':
        return await app.instantiateSmartContractV1_1(network, keyValueStorePath, channelName, deployId, functionName, args, org, peers, username);
      case 'fabric-1.4':
        return await app.instantiateSmartContractV1_4(network, keyValueStorePath, channelName, deployId, functionName, args, org, peers, username);
    }
  }
  async function invokeChainCode(network, peerNames, channelName, chainCodeName, fcn, args, username, org, networkType = 'fabric-1.1') {
    switch (networkType) {
      case 'fabric-1.4':
        return await app.invokeChainCodeV1_4(network, peerNames, channelName, chainCodeName, fcn, args, username, org);
      case 'fabric-1.1':
      default:
        return await app.invokeChainCodeV1_1(network, peerNames, channelName, chainCodeName, fcn, args, username, org);
    }
  }
  async function queryChainCode(network, peer, channelName, chainCodeName, fcn, args, username, org, networkType = 'fabric-1.1') {
    switch (networkType) {
      case 'fabric-1.4':
        return await app.queryChainCodeV1_4(network, peer, channelName, chainCodeName, fcn, args, username, org);
      case 'fabric-1.1':
      default:
        return await app.queryChainCodeV1_1(network, peer, channelName, chainCodeName, fcn, args, username, org);
    }
  }
  async function getChainInfo(network, keyValueStorePath, peer, username, org, networkType = 'fabric-1.0', channelName = '') {
    switch (networkType) {
      case 'fabric-1.4':
        return await app.getChainInfoV1_4(network, keyValueStorePath, peer, username, org, channelName);
      case 'fabric-1.0':
      default:
        return await app.getChainInfoV1_0(network, keyValueStorePath, peer, username, org);
      case 'fabric-1.1':
        return await app.getChainInfoV1_1(network, keyValueStorePath, peer, username, org, channelName);
    }
  }
  async function getChannelHeight(network, keyValueStorePath, peer, username, org, networkType = 'fabric-1.0', channelName = '') {
    switch (networkType) {
      case 'fabric-1.0':
      default:
        return await app.getChannelHeightV1_0(network, keyValueStorePath, peer, username, org);
      case 'fabric-1.1':
        return await app.getChannelHeightV1_1(network, keyValueStorePath, peer, username, org, channelName);
      case 'fabric-1.4':
        return await app.getChannelHeightV1_4(network, keyValueStorePath, peer, username, org, channelName);
    }
  }
  async function getBlockByNumber(network, keyValueStorePath, peer, blockNumber, username, org, networkType = 'fabric-1.0') {
    switch (networkType) {
      case 'fabric-1.4':
        return await app.getBlockByNumberV1_4(network, keyValueStorePath, peer, blockNumber, username, org);
      case 'fabric-1.0':
      default:
        return await app.getBlockByNumberV1_0(network, keyValueStorePath, peer, blockNumber, username, org);
    }
  }
  async function getRecentBlock(network, keyValueStorePath, peer, username, org, count, networkType = 'fabric-1.0', channelName = '') {
    switch (networkType) {
      case 'fabric-1.0':
      default:
        return await app.getRecentBlockV1_0(network, keyValueStorePath, peer, username, org, count);
      case 'fabric-1.1':
        return await app.getRecentBlockV1_1(network, keyValueStorePath, peer, username, org, count, channelName);
      case 'fabric-1.4':
        return await app.getRecentBlockV1_4(network, keyValueStorePath, peer, username, org, count, channelName);
    }
  }
  async function getRecentTransactions(network, keyValueStorePath, peer, username, org, count, networkType = 'fabric-1.0', channelName = '') {
    switch (networkType) {
      case 'fabric-1.0':
      default:
        return await app.getRecentTransactionsV1_0(network, keyValueStorePath, peer, username, org, count);
      case 'fabric-1.1':
        return await app.getRecentTransactionsV1_1(network, keyValueStorePath, peer, username, org, count, channelName);
      case 'fabric-1.4':
        return await app.getRecentTransactionsV1_4(network, keyValueStorePath, peer, username, org, count, channelName);
    }
  }
  async function getChannels(network, keyValueStorePath, peer, username, org, networkType = 'fabric-1.0') {
    switch (networkType) {
      case 'fabric-1.0':
      default:
        return await app.getChannelsV1_0(network, keyValueStorePath, peer, username, org);
      case 'fabric-1.1':
        return await app.getChannelsV1_1(network, keyValueStorePath, peer, username, org);
      case 'fabric-1.4':
        return await app.getChannelsV1_4(network, keyValueStorePath, peer, username, org);
    }
  }
  async function getChainCodes(network, keyValueStorePath, peer, type, username, org, networkType = 'fabric-1.0', channelName = '') {
    switch (networkType) {
      case 'fabric-1.0':
      default:
        return await app.getChainCodesV1_0(network, keyValueStorePath, peer, type, username, org);
      case 'fabric-1.1':
        return await app.getChainCodesV1_1(network, keyValueStorePath, peer, type, username, org, channelName);
      case 'fabric-1.4':
        return await app.getChainCodesV1_4(network, keyValueStorePath, peer, type, username, org, channelName);
    }
  }
  async function fabricHelper(network, keyValueStore, networkType = 'fabric-1.0') {
    switch (networkType) {
      case 'fabric-1.0':
      default:
        return await app.fabricHelperV1_0(network, keyValueStore);
      case 'fabric-1.4':
        return await app.fabricHelperV1_4(network, keyValueStore);
    }
  }
  async function sleep(sleep_time_ms) {
    return new Promise(resolve => setTimeout(resolve, sleep_time_ms));
  }
  async function getPeersForChannel(network, keyValueStorePath, channelName, orgName, networkType = 'fabric-1.0') {
    switch (networkType) {
      case 'fabric-1.0':
      default:
        return await app.getPeersForChannelV1_0(network, keyValueStorePath, channelName, orgName);
      case 'fabric-1.1':
        return await app.getPeersForChannelV1_1(network, keyValueStorePath, channelName, orgName);
      case 'fabric-1.4':
        return await app.getPeersForChannelV1_4(network, keyValueStorePath, channelName, orgName);
    }
  }

  async function getPeersForOrg(network, orgName){
    return await app.getPeersForOrgV1_1(network,orgName);
  }

  async function getChannelNameTest(network, keyValueStorePath, channelName){
    return await app.getChannelNameTestV1_0(network, keyValueStorePath, channelName);
  }

  async function getLastBlock(network, peer, channelName, userName, orgName, networkType) {
    switch (networkType) {
      case 'fabric-1.1':
        return await app.getLastBlockV1_1(network, peer, channelName, userName, orgName);
      case 'fabric-1.4':
        return await app.getLastBlockV1_4(network, peer, channelName, userName, orgName);
    }
  }

  async function getBlockInfoByNumber(network, peer, channelName, userName, orgName, number, networkType) {
    switch (networkType) {
      case 'fabric-1.1':
        return await app.getBlockInfoByNumberV1_1(network, peer, channelName, userName, orgName, number);
      case 'fabric-1.4':
          return await app.getBlockInfoByNumberV1_4(network, peer, channelName, userName, orgName, number);
    }
  }
  async function signUpdate(network, channelName, org, orgId, username, channeldb, config, newOrgId, newOrgName, signedusers, networkType = 'fabric-1.4'){
    switch (networkType) {
        case 'fabric-1.1':
            return await app.signUpdateV1_1(network, channelName, org, orgId, username, channeldb, config, newOrgId, newOrgName);
        case 'fabric-1.4':
            return await app.signUpdateV1_4(network, channelName, org, orgId, username, channeldb, config, newOrgId, newOrgName, signedusers);
    }
  }


  app.getChannelNameTest = getChannelNameTest;
  app.fabricHelper = fabricHelper;
  // app.getClientForOrg = getClientForOrg;
  app.getOrgAdmin = getOrgAdmin;
  app.getChannelForOrg = getChannelForOrg;
  app.createChannel = createChannel;
  app.joinChannel = joinChannel;
  app.installSmartContract = installSmartContract;
  app.instantiateSmartContract = instantiateSmartContract;
  app.invokeChainCode = invokeChainCode;
  app.queryChainCode = queryChainCode;
  app.getChainInfo = getChainInfo;
  app.getChannelHeight = getChannelHeight;
  app.getBlockByNumber = getBlockByNumber;
  app.getRecentBlock = getRecentBlock;
  app.getRecentTransactions = getRecentTransactions;
  app.getChannels = getChannels;
  app.getChainCodes = getChainCodes;
  app.sleep = sleep;
  app.getPeersForChannel = getPeersForChannel;
  app.getPeersForOrg = getPeersForOrg;
  app.instantiateChainCode = instantiateChainCode;
  app.installChainCode = installChainCode;
  app.getLastBlock = getLastBlock;
  app.getBlockInfoByNumber = getBlockInfoByNumber;
  app.signUpdate = signUpdate;

  // hfc.setLogger(app.logger);
};
