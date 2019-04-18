/*
 SPDX-License-Identifier: Apache-2.0
*/
'use strict';

const Controller = require('egg').Controller;

class ExplorerController extends Controller {
  async getBlock() {
      const result = await this.ctx.service.explorer.getBlock();
      this.ctx.status = result.success ? 200 : 400;
      this.ctx.body = result;
  }

  async getTransactionForRealtime() {
    const result = await this.ctx.service.explorer.getTransactionForRealtime();
    this.ctx.status = result.success ? 200 : 400;
    this.ctx.body = result;
  }
}

module.exports = ExplorerController;
