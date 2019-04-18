import { stringify } from 'qs';
import request from '../utils/irequest';

export async function queryLogList(params) {
    let url = '/v2/operator_logs?';
    let bAnd = false;

    if (typeof(params.nameForSel) !== 'undefined' && params.nameForSel !== '') {
        url += `opName=${params.nameForSel}`;
        bAnd = true;
    }
    if (typeof(params.objectForSel) !== 'undefined' && params.objectForSel !== '') {
        if (bAnd) {
            url += '&';
        }
        url += `opObject=${params.objectForSel}`;
        bAnd = true;
    }
    if (typeof(params.operatorForSel) !== 'undefined' && params.operatorForSel !== '') {
        if (bAnd) {
            url += '&';
        }
        url += `operator=${params.operatorForSel}`;
    }
    return request(url);
}

