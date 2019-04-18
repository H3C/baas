import { stringify } from 'qs';
import request from '../utils/irequest';

export async function queryNetworks(params) {
//      return request('http://'+ window.location.hostname +':8071/v2/blockchain_networks', {method: 'GET',});
    return request('http://'+ window.location.hostname +`:8071/v2/blockchain_networks/${params}`, {method: 'GET',});
    // return request('/v2/blockchain_networks', {method: 'GET',});
}

export async function NetworksList() {
    return request('http://'+ window.location.hostname +':8071/v2/blockchain_networks', {method: 'GET',});
    // return request('/v2/blockchain_networks', {method: 'GET',});
}