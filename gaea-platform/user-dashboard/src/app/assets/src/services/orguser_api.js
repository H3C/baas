import { stringify } from 'qs';
import request from '../utils/request';



export async function queryOrgUser() {
    return request('/v2/orgusers', {method:'GET'});
}

export async function queryOneUser(params) {
    return request(`/v2/orgusers/${params.username}`, {method:'GET'});
}

export async function updateUserInfo(params) {
    return request(`/v2/orguserinfor`, {
        method:'PUT',
        body: {
            information: params.information
        }
    });
}

export async function createOrgUser(params) {

    return request('/v2/orgusers', {
        method: 'POST',
        body: {
            ...params,
        },
    });
}

export async function updateOrgUser(params) {
    const name=params.orguser.name;
    const active=params.orguser.active;
    return request(`/v2/orgusers/${name}?active=${active}`, {
        method: 'PUT',
    });
}

export async function reEnrollOrgUser(params) {
    const name=params.orguser.name;
    const reason=params.orguser.reason;
    return request(`/v2/orgusers/${name}`, {
        method: 'POST',
    });
}

export async function removeOrgUser(params) {
      const name=params.orguser.name;
      const reason=params.orguser.reason;
    return request(`/v2/orgusers?name=${name}&reason=${reason}`, {
        method: 'DELETE',
    });
}

export async function GetAffiliation() {
    return request('/v2/affiliation', {method:'GET'});
}


export async function CreateAffiliation(params) {
    return request('/v2/affiliation', {
        method: 'POST',
        body: {
            ...params,
        },
    });
}

export async function UpdateAffiliation(params) {
    return request('/v2/affiliation', {
        method: 'PUT',
        body: {
            ...params,
        },
    });
}
