/*
 SPDX-License-Identifier: Apache-2.0
*/
import { stringify } from 'qs';
import request from '../utils/irequest';
import config from '../utils/config';

const { urls } = config;
export async function query() {
    return request(urls.user.list);
}

export async function queryCurrent() {
    return request('/api/currentUser');
}

export async function createUser(params) {
    return request(urls.user.create, {
        method: 'POST',
        body: params,
    });
}

export async function deleteUser(id) {
    return request(`${urls.user.delete}/${id}`, {
        method: 'DELETE',
    });
}

export async function searchUser(params) {
    return request(`${urls.user.search}?${stringify(params)}`);
}

export async function updateUser(params) {
    return request(`${urls.user.update}/${params.id}`, {
        method: 'PUT',
        body: params,
    });
}
export async function resetOrgUserPassword(params) {
    const name=params.orguser.name;
    return request(`${urls.user.reset}/${name}`, {
        method: 'POST',
        body: {
            curUser: params.orguser.curUser,
            curPassword:params.orguser.curPassword,
            password: params.orguser.password,
        },
    });
}

export async function login(params) {
    return request(urls.user.login, {
        method: "POST",
        body: params,
    });
}