/*
 SPDX-License-Identifier: Apache-2.0
*/
'use strict';

const Service = require('egg').Service;
const fs = require('fs-extra');
const shell = require('shelljs');
const yaml = require('node-yaml');

class ExplorerService extends Service {
    async getBlock() {
        const { ctx } = this;
        const params = ctx.request.query;

        if (params.number) {
            return await this.getBlockByNumber();
        } else {
            return await this.getBlockByTime();
        }
    }
    async getBlockByNumber() {
        const { ctx } = this;
        const channel_id = ctx.params.channel_id;
        const number = ctx.request.query.number;
        const channelInfo = await ctx.model.Channel.findOne({_id: channel_id});
        const channelName = channelInfo.name;
        const peersForChannel = channelInfo.peers_inChannel;
        const userName = ctx.req.user.username;
        const orgName = userName.split('@')[1].split('.')[0];
        const networkType = channelInfo.version;
        const blocks = [];
        let lastBlock;
        let targetPeer = '';
        let network;

        try {
            network = await ctx.service.channel.generateNetwork(channelInfo._id.toString());
            await ctx.service.channel.generateNetworkAddPeersV1_1(channelInfo._id.toString(), network, peersForChannel);

            // 找到通道内的节点
            if (channelInfo.peers_inChannel.length === 0) {
                throw 'no peer in the channel';
            }
            targetPeer = channelInfo.peers_inChannel[0];
            lastBlock = await ctx.getLastBlock(network, targetPeer, channelName, userName, orgName, networkType);
        } catch (err) {
            console.log(err.message);

            return {
                success: false,
                message: 'get last block fail(getBlockByNumber)'
            };
        }
        const maxNumber = number > lastBlock.height.low ? lastBlock.height.low : number;
        let currentBlockHash = '';

        try {

            for (let i = lastBlock.height.low - 1; i >= lastBlock.height.low - maxNumber; i--) {
                const block = {};
                const currentBlock = await ctx.getBlockInfoByNumber(network, targetPeer, channelName, userName, orgName, i, networkType);

                if (i === lastBlock.height.low - 1) {
                    block.currentBlockHash = lastBlock.currentBlockHash;
                }
                else {
                    block.currentBlockHash = currentBlockHash;
                }

                block.dataHash = currentBlock.header.data_hash;
                block.number = currentBlock.header.number;
                block.previousHash = currentBlock.header.previous_hash;
                block.transaction = [];

                const txData = currentBlock.data.data;

                for (let j = 0; j < txData.length; j++) {
                    const transaction = {};

                    transaction.time = txData[j].payload.header.channel_header.timestamp;
                    transaction.id = txData[j].payload.header.channel_header.tx_id;
                    transaction.creatorMSP = txData[j].payload.header.signature_header.creator.Mspid;
                    transaction.channelName = txData[j].payload.header.channel_header.channel_id;
                    transaction.typeString = txData[j].payload.header.channel_header.typeString;
                    transaction.type = txData[j].payload.header.channel_header.type;

                    if (transaction.type === 3) {
                        const actions = txData[j].payload.data.actions;

                        transaction.actions = [];
                        for (let k = 0; k < actions.length; k++) {
                            const action = {};

                            action.creatorMSP = actions[k].header.creator.Mspid;
                            action.proposal_hash = actions[k].payload.action.proposal_response_payload.proposal_hash;
                            action.rwsets = [];

                            const rwsets = actions[k].payload.action.proposal_response_payload.extension.results.ns_rwset;
                            for (let l = 0; l < rwsets.length; l++) {
                                const rwset = {};

                                rwset.namespace = rwsets[l].namespace;
                                rwset.reads = rwsets[l].rwset.reads;
                                rwset.writes = rwsets[l].rwset.writes;

                                action.rwsets.push(rwset);
                            }

                            action.chaincode = {
                                name: actions[k].payload.action.proposal_response_payload.extension.chaincode_id.name,
                                version: actions[k].payload.action.proposal_response_payload.extension.chaincode_id.version
                            };

                            action.endorsements = [];
                            const endorsements = actions[k].payload.action.endorsements;

                            for (let m = 0; m < endorsements.length; m++) {
                                if (-1 === action.endorsements.indexOf(endorsements[m].endorser.Mspid)) {
                                    action.endorsements.push(endorsements[m].endorser.Mspid);
                                }
                            }

                            transaction.actions.push(action);
                        }
                    }
                    block.transaction.push(transaction);
                }

                blocks.push(block);
                currentBlockHash = currentBlock.header.previous_hash;
            }
        }
        catch (e) {
            console.log(e.message);
            return {
                success: false,
                message: 'get block by number fail(getBlockByNumber)'
            }
        }
        return {
            blocks:blocks,
            success: true
        };
    }

    async getTransactionForRealtime() {
        const { ctx } = this;
        const channel_id = ctx.params.channel_id;
        const minutes = ctx.params.minutes;
        const channelInfo = await ctx.model.Channel.findOne({ _id: channel_id });
        const channelName = channelInfo.name;
        const peersForChannel = channelInfo.peers_inChannel;
        const userName = ctx.req.user.username;
        const orgName = userName.split('@')[1].split('.')[0];
        const networkType = channelInfo.version;
        const now = new Date();
        const startTime = new Date(`${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes()}:0`);
        let lastBlock;
        let targetPeer = '';
        let network;
        startTime.setTime(startTime.getTime() - ( minutes - 1 ) * 60000);

        try {
            network = await ctx.service.channel.generateNetwork(channelInfo._id.toString());
            await ctx.service.channel.generateNetworkAddPeersV1_1(channelInfo._id.toString(), network, peersForChannel);

            // 找到通道内的节点
            if (channelInfo.peers_inChannel.length === 0) {
                throw 'no peer in the channel';
            }
            targetPeer = channelInfo.peers_inChannel[0];
            lastBlock = await ctx.getLastBlock(network, targetPeer, channelName, userName, orgName, networkType);
        }
        catch (err) {
            console.log(err.message);
            return {
                success: false,
                message: 'get last block fail(getTransactionForRealtime)'
            };
        }

        const transactions = [];
        let bFinish = false;

        try {
            for (let i = lastBlock.height.low - 1; i >= 0; i--) {
                const currentBlock = await ctx.getBlockInfoByNumber(network, targetPeer, channelName, userName, orgName, i, networkType);
                const txData = currentBlock.data.data;

                for (let j = 0; j < txData.length; j++) {
                    const txTime = new Date(txData[j].payload.header.channel_header.timestamp);

                    if (txTime > startTime) {
                        const time = new Date(`${txTime.getFullYear()}/${txTime.getMonth() + 1}/${txTime.getDate()} ${txTime.getHours()}:${txTime.getMinutes()}:0`);
                        transactions.push(time.toString());
                    }
                    else {
                        bFinish = true;
                    }
                }

                if (bFinish) {
                    break;
                }
            }
        }
        catch (e) {
            console.log(e.toString());
            return {
                success: false,
                message: 'get block info fail(getTransactionForRealtime)'
            }
        }
        const tranRealtime = [];
        const curTime = startTime;
        for (let j = 0; j < minutes; j++) {
            if (j > 0) {
                curTime.setTime(curTime.getTime() + 60000);
            }

            let index = -1;
            let count = 0;
            for (;;) {
                index = transactions.indexOf(curTime.toString(), index + 1);
                if (-1 === index) {
                    break;
                }
                else {
                    count++;
                }
            }
            tranRealtime.push({
                time: curTime.toString(),
                count: count,
            })
        }

        return {
            transactions: tranRealtime,
            channelName: channelName,
            success: true
        };
    }

    async getBlockByTime() {
        const { ctx } = this;
        const channel_id = ctx.params.channel_id;
        const time_begin = ctx.request.query.times_begin;
        const time_end = ctx.request.query.times_end;
        const channelInfo = await ctx.model.Channel.findOne({_id: channel_id});
        const channelName = channelInfo.name;
        const peersForChannel = channelInfo.peers_inChannel;
        const userName = ctx.req.user.username;
        const orgName = userName.split('@')[1].split('.')[0];
        const networkType = channelInfo.version;
        const blocks = [];
        let lastBlock;
        let targetPeer = '';
        let network;
        let low = 0 ,hight,mid;
        let h = 0,l = 0;

        try {
            network = await ctx.service.channel.generateNetwork(channelInfo._id.toString());
            await ctx.service.channel.generateNetworkAddPeersV1_1(channelInfo._id.toString(), network, peersForChannel);

            // 找到通道内的节点
            if (channelInfo.peers_inChannel.length === 0) {
                throw 'no peer in the channel';
            }
            targetPeer = channelInfo.peers_inChannel[0];
            lastBlock = await ctx.getLastBlock(network, targetPeer, channelName, userName, orgName, networkType);
        } catch (err) {
            console.log(err.message);

            return {
                success: false,
                message: 'get last block fail(getBlockByTime)'
            };
        }
        const Height = lastBlock.height.low - 1;

        const heighBlock = await ctx.getBlockInfoByNumber(network, targetPeer, channelName, userName, orgName, Height, networkType);
        const tx_height = heighBlock.data.data;
        const time_h = new Date(tx_height[0].payload.header.channel_header.timestamp);
        const time_height = time_h.getTime();
        if (time_height < time_begin ){
            return {
                blocks:blocks,
                success: true
            };
        }
        if (time_height <= time_end){
            h = Height;
        }

        const lowBlock = await ctx.getBlockInfoByNumber(network, targetPeer, channelName, userName, orgName, low, networkType);
        const tx_low = lowBlock.data.data;
        const time_l = new Date(tx_low[0].payload.header.channel_header.timestamp);
        const time_low = time_l.getTime();
        if (time_low > time_end){
            return {
                blocks:blocks,
                success: true
            };
        }

        low = 0;
        hight = Height;
        if (time_low > time_begin) {
            l = 0;
        }
        else{
            while(low<hight){
                mid = parseInt((low+hight)/2);
                const currentBlock = await ctx.getBlockInfoByNumber(network, targetPeer, channelName, userName, orgName, mid, networkType);
                const txData = currentBlock.data.data;
                const times = new Date(txData[0].payload.header.channel_header.timestamp);
                const time_tmp = times.getTime();

                if (time_tmp < time_begin){
                    low  = mid;
                }
                else if (time_tmp > time_begin){
                    hight = mid;
                }
                else{
                    l = mid;
                    break;
                }

                if(((low+1) === hight) || (low === hight)){
                    l = hight;
                    break;
                }
            }
        }

        low = 0;
        hight = Height;
        if (h == 0)
        {
            while(low<hight){
                mid = parseInt((low+hight)/2);
                const currentBlock = await ctx.getBlockInfoByNumber(network, targetPeer, channelName, userName, orgName, mid, networkType);
                const txData = currentBlock.data.data;
                const times = new Date(txData[0].payload.header.channel_header.timestamp);
                const time_tmp = times.getTime();

                if (time_tmp < time_end){
                    low  = mid;
                }
                else if (time_tmp > time_end){
                    hight = mid;
                }
                else{
                    h = mid;
                    break;
                }

                if(((low+1) === hight) || (low === hight)){
                    h = low;
                    break;
                }
            }
        }

        let currentBlockHash = '';
        try {

            for (let i = h; i >= l; i--) {
                const block = {};
                const currentBlock = await ctx.getBlockInfoByNumber(network, targetPeer, channelName, userName, orgName, i, networkType);

                if (i == h){
                    if (i == Height){
                        currentBlockHash = lastBlock.currentBlockHash;
                    }else {
                        const Block_tmp = await ctx.getBlockInfoByNumber(network, targetPeer, channelName, userName, orgName, h + 1, networkType);
                        currentBlockHash = Block_tmp.header.previous_hash
                    }
                }

                block.currentBlockHash = currentBlockHash;
                block.dataHash = currentBlock.header.data_hash;
                block.number = currentBlock.header.number;
                block.previousHash = currentBlock.header.previous_hash;
                block.transaction = [];

                const txData = currentBlock.data.data;

                for (let j = 0; j < txData.length; j++) {
                    const transaction = {};

                    transaction.time = txData[j].payload.header.channel_header.timestamp;
                    transaction.id = txData[j].payload.header.channel_header.tx_id;
                    transaction.creatorMSP = txData[j].payload.header.signature_header.creator.Mspid;
                    transaction.channelName = txData[j].payload.header.channel_header.channel_id;
                    transaction.typeString = txData[j].payload.header.channel_header.typeString;
                    transaction.type = txData[j].payload.header.channel_header.type;

                    if (transaction.type === 3) {
                        const actions = txData[j].payload.data.actions;

                        transaction.actions = [];
                        for (let k = 0; k < actions.length; k++) {
                            const action = {};

                            action.creatorMSP = actions[k].header.creator.Mspid;
                            action.proposal_hash = actions[k].payload.action.proposal_response_payload.proposal_hash;
                            action.rwsets = [];

                            const rwsets = actions[k].payload.action.proposal_response_payload.extension.results.ns_rwset;
                            for (let l = 0; l < rwsets.length; l++) {
                                const rwset = {};

                                rwset.namespace = rwsets[l].namespace;
                                rwset.reads = rwsets[l].rwset.reads;
                                rwset.writes = rwsets[l].rwset.writes;

                                action.rwsets.push(rwset);
                            }

                            action.chaincode = {
                                name: actions[k].payload.action.proposal_response_payload.extension.chaincode_id.name,
                                version: actions[k].payload.action.proposal_response_payload.extension.chaincode_id.version
                            };

                            action.endorsements = [];
                            const endorsements = actions[k].payload.action.endorsements;

                            for (let m = 0; m < endorsements.length; m++) {
                                if (-1 === action.endorsements.indexOf(endorsements[m].endorser.Mspid)) {
                                    action.endorsements.push(endorsements[m].endorser.Mspid);
                                }
                            }

                            transaction.actions.push(action);
                        }
                    }
                    block.transaction.push(transaction);
                }

                blocks.push(block);
                currentBlockHash = currentBlock.header.previous_hash;
            }
        }
        catch (e) {
            console.log(e.message);
            return {
                success: false,
                message: 'get block by number fail(getBlockByNumber)'
            }
        }

        return {
            blocks:blocks,
            success: true
        };
    }
}

module.exports = ExplorerService;
