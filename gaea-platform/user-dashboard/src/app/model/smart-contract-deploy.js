/*
 SPDX-License-Identifier: Apache-2.0
*/
'use strict';

module.exports = app => {
  const mongoose = app.mongoose;
  const Schema = mongoose.Schema;

  const SmartContractDeploySchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    smartContract: { type: Schema.Types.ObjectId, ref: 'SmartContract' },
    smartContractCode: { type: Schema.Types.ObjectId, ref: 'SmartContractCode' },
    chain: { type: Schema.Types.ObjectId, ref: 'Chain' },
    name: { type: String },
    status: { type: String, default: 'idle', enum: [ 'idle', 'installed', 'instantiating', 'instantiated', 'error'] },
    deployTime: { type: Date, default: Date.now },
  });

  return mongoose.model('SmartContractDeploy', SmartContractDeploySchema);
};
