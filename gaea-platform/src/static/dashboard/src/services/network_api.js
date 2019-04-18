import request from '../utils/request';

export async function queryNetworks() {
  return request('/v2/blockchain_networks', {method: 'GET'});
}

export async function queryNetwork(params) {
    return request(`/v2/blockchain_networks/${params}`, {method: 'GET'});
}

export async function removeNetwork(params) {
  return request(`/v2/blockchain_networks/${params.netid}`, {method: 'DELETE'});
}

export async function addNetwork(params) {
  return request('/v2/blockchain_networks', {
    method: 'POST',
    body: {
      ...params,
    },
  });
}

export async function netAddOrg(params) {
    const networkID=params.networkId;
    const blockchain_network=params.blockchain_network;
    return request(`/v2/blockchain_networks/${networkID}/orgAdd`, {
        method: 'POST',
        body: {
            blockchain_network,
        },
    });
}