/*
 SPDX-License-Identifier: Apache-2.0
*/
'use strict';

const Controller = require('egg').Controller;

class UserController extends Controller {
  async currentUser() {
    const { ctx } = this;
    if (!ctx.isAuthenticated()) {
      ctx.status = 401;
    } else {
      ctx.body = this.ctx.user;
    }
  }

  async createOrgUser() {
    const { ctx } = this;
    const { name, role, password, delegateRoles, affiliation, affiliationMgr, revoker, gencrl } = ctx.request.body.orguser;
    const success = await ctx.service.user.createOrguser(name, role, password, delegateRoles, affiliation, affiliationMgr, revoker, gencrl);
    ctx.status = success ? 200 : 400;
    // ctx.body = {
    //   user,
    // };
  }

  async deleteOrgUser() {
    const { ctx } = this;
    const name = ctx.req.query.name;
    const reason = ctx.req.query.reason;
    const success = await ctx.service.user.deleteOrguser(name, reason);
    ctx.status = success ? 200 : 400;
  }

  async getOrgUser() {
    const { ctx } = this;
    const name = ctx.params.name;
    const user = await ctx.service.user.getOrguser(name);
    ctx.status = user.success ? 200 : 400;
    ctx.body = user;
  }

  async getOrgUserList() {
    const { ctx } = this;
    const user = await ctx.service.user.getOrguserList();
    ctx.status = user.success ? 200 : 400;
    ctx.body = user;
  }

  async updateOrguserState() {
    const { ctx } = this;
    const name = ctx.params.name;
    const active = ctx.req.query.active;
    let result = { success: false };
    result = await ctx.service.user.updateOrguserState(name, active);
    ctx.status = result.success ? 200 : 400;
    ctx.body = result;
  }

  async updateOrguserPassword() {
    const { ctx } = this;
    const password = ctx.req.query.password;
    let result = { success: false };
    result = await ctx.service.user.updateOrguserPassword(password);
    ctx.status = result.success ? 200 : 400;
    ctx.body = result;
  }

  async reenrollOrgUser() {
    const { ctx } = this;
    const name = ctx.params.name;
    const result = await ctx.service.user.reenrollOrgUser(name);
    ctx.status = result.success ? 200 : 400;
    ctx.body = result;
  }

  async createAffiliation() {
    const { ctx } = this;
    const { name } = ctx.request.body;
    const result = await ctx.service.user.createAffiliation(name);
    ctx.status = result.success ? 200 : 400;
    ctx.body = result;
  }

  async getAffiliations() {
    const { ctx } = this;
    const result = await this.ctx.service.user.getAffiliations();
    ctx.status = result.success ? 200 : 400;
    ctx.body = result;
  }

  async delAffiliation() {
    const { ctx } = this;
    const result = await ctx.service.user.delAffiliation();
    ctx.status = result.success ? 200 : 400;
    ctx.body = result;
  }

  async updateAffiliation() {
    const { ctx } = this;
    const { sourceName, targetName } = ctx.request.body.affiliation;
    const result = await ctx.service.user.updateAffiliation(sourceName, targetName);
    ctx.status = result.success ? 200 : 400;
    ctx.body = result;
  }
}

module.exports = UserController;
