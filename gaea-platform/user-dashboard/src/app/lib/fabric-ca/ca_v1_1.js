'use strict';

const Service = require('egg').Service;
const Fabric_Client = require('../../../packages/fabric-1.1/node_modules/fabric-client');
const Fabric_CA_Client = require('../../../packages/fabric-1.1/node_modules/fabric-ca-client');
const path = require('path');
const fs = require('fs');

module.exports = app => {
  async function enrollAdmin(caHost, caPort, mspId, caStorePath, caDockerStorePath, userName) {
    const fabric_client = new Fabric_Client();
    let fabric_ca_client = null;
    let admin_user = null;
    const store_path = path.join(caStorePath, userName);
    fs.exists(store_path, function(exists) {
      if (!exists) {
        fs.mkdir(store_path, function(err) {
          if (err) {
            console.error(err);
          }
          console.log('create dir' + store_path + 'success');
        });
      }
    });

    console.log(' Store path:' + store_path);
    console.log(' Store path in Docker :' + caDockerStorePath);

    // create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
    await Fabric_Client.newDefaultKeyValueStore({
      path: store_path,
    }).then(state_store => {
      // assign the store to the fabric client
      fabric_client.setStateStore(state_store);
      const crypto_suite = Fabric_Client.newCryptoSuite();
      // use the same location for the state store (where the users' certificate are kept)
      // and the crypto store (where the users' keys are kept)
      const crypto_store = Fabric_Client.newCryptoKeyStore({ path: store_path });
      crypto_suite.setCryptoKeyStore(crypto_store);
      fabric_client.setCryptoSuite(crypto_suite);

      const ca_crypto_suite = Fabric_Client.newCryptoSuite();
      // use the same location for the state store (where the users' certificate are kept)
      // and the crypto store (where the users' keys are kept)
      const ca_crypto_store = Fabric_Client.newCryptoKeyStore({ path: caDockerStorePath });
      ca_crypto_suite.setCryptoKeyStore(ca_crypto_store);

      const tlsOptions = {
        trustedRoots: [],
        verify: false,
      };
      // be sure to change the http to https when the CA is running TLS enabled
      fabric_ca_client = new Fabric_CA_Client(`https://${caHost}:${caPort}`, tlsOptions, '', ca_crypto_suite);

      // first check to see if the admin is already enrolled
      return fabric_client.getUserContext('admin', true);
    }).then(user_from_store => {
      if (user_from_store && user_from_store.isEnrolled()) {
        console.log('Successfully loaded admin from persistence');
        admin_user = user_from_store;
        return null;
      } else {
        // need to enroll it with CA server
        return fabric_ca_client.enroll({
          enrollmentID: 'admin',
          enrollmentSecret: 'adminpw',
        }).then(enrollment => {
          console.log('Successfully enrolled admin user "admin"');
          return fabric_client.createUser(
            {
              username: 'admin',
              mspid: mspId,
              cryptoContent: { privateKeyPEM: enrollment.key.toBytes(), signedCertPEM: enrollment.certificate },
            });
        }).then(user => {
          admin_user = user;
          return fabric_client.setUserContext(admin_user);
        })
          .catch(err => {
            console.error('Failed to enroll and persist admin. Error: ' + err.stack ? err.stack : err);
            throw new Error('Failed to enroll admin');
          });
      }
    })
      .then(() => {
        console.log('Assigned the admin user to the fabric client ::' + admin_user.toString());
        return true;
      })
      .catch(err => {
        console.error('Failed to enroll admin: ' + err);
        return false;
      });
  }

  async function registerUser(registerUser, caHost, caPort, mspId, name, role, password, userAffilication, caStorePath, caDockerStorePath, attributes) {
    const fabric_client = new Fabric_Client();
    let fabric_ca_client = null;
    let admin_user = null;
    let member_user = null;
    let result = false;

    console.log(' Store path:' + caStorePath);

    // create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
    await Fabric_Client.newDefaultKeyValueStore({ path: caStorePath }).then(state_store => {
      // assign the store to the fabric client
      fabric_client.setStateStore(state_store);
      const crypto_suite = Fabric_Client.newCryptoSuite();
      // use the same location for the state store (where the users' certificate are kept)
      // and the crypto store (where the users' keys are kept)
      const crypto_store = Fabric_Client.newCryptoKeyStore({ path: caStorePath });
      crypto_suite.setCryptoKeyStore(crypto_store);

      const ca_crypto_suite = Fabric_Client.newCryptoSuite();
      // use the same location for the state store (where the users' certificate are kept)
      // and the crypto store (where the users' keys are kept)
      const ca_crypto_store = Fabric_Client.newCryptoKeyStore({ path: caDockerStorePath });
      ca_crypto_suite.setCryptoKeyStore(ca_crypto_store);

      fabric_client.setCryptoSuite(crypto_suite);
      // be sure to change the http to https when the CA is running TLS enabled
      fabric_ca_client = new Fabric_CA_Client(`https://${caHost}:${caPort}`, null, '', ca_crypto_suite);

      // first check to see if the admin is already enrolled
      return fabric_client.getUserContext(registerUser, true);
    }).then(user_from_store => {
      if (user_from_store && user_from_store.isEnrolled()) {
        console.log('Successfully loaded ' + registerUser + ' from persistence');
        admin_user = user_from_store;
      } else {
        throw new Error('Failed to get admin.... run enrollAdmin.js');
      }

      // at this point we should have the admin user
      // first need to register the user with the CA server
      return fabric_ca_client.register({ enrollmentID: name, affiliation: userAffilication, role, maxEnrollments: -1, attrs: attributes }, admin_user);
    })
      .then(secret => {
        // next we need to enroll the user with CA server
        console.log('Successfully registered ' + name + ' - secret:' + secret);

        return fabric_ca_client.enroll({ enrollmentID: name, enrollmentSecret: secret });
      })
      .then(enrollment => {
        console.log('Successfully enrolled member user ' + name);

        return fabric_client.createUser(
          { username: name,
            mspid: mspId,
            cryptoContent: { privateKeyPEM: enrollment.key.toBytes(), signedCertPEM: enrollment.certificate },
          });
      })
      .then(user => {
        member_user = user;
        return fabric_client.setUserContext(member_user);
      })
      .then(() => {
        console.log('User' + name + 'was successfully registered and enrolled and is ready to interact with the fabric network');
        result = true;
      })
      .catch(err => {
        console.error('Failed to register: ' + err);
        if (err.toString().indexOf('Authorization') > -1) {
          console.error('Authorization failures may be caused by having admin credentials from a previous CA instance.\n' +
            'Try again after deleting the contents of the store directory ' + caStorePath);
        }
        result = false;
      });
    return result;
  }

  async function deleteUser(registerUser, name, reason, caHost, caPort, caStorePath, caDockerStorePath) {
    const fabric_client = new Fabric_Client();
    let fabric_ca_client = null;
    let admin_user = null;
    let result = false;
    const reasons = [
      'unspecified',
      'keycompromise',
      'cacompromise',
      'affiliationchange',
      'superseded',
      'cessationofoperation',
      'certificatehold',
      'removefromcrl',
      'privilegewithdrawn',
      'aacompromise',
    ];
    let reasonNum;
    for (const each in reasons) {
      if (reason === reasons[each]) {
        reasonNum = each;
        break;
      }
    }
    // create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
    await Fabric_Client.newDefaultKeyValueStore({ path: caStorePath }).then(state_store => {
      // assign the store to the fabric client
      fabric_client.setStateStore(state_store);
      const crypto_suite = Fabric_Client.newCryptoSuite();
      // use the same location for the state store (where the users' certificate are kept)
      // and the crypto store (where the users' keys are kept)
      const crypto_store = Fabric_Client.newCryptoKeyStore({ path: caStorePath });
      crypto_suite.setCryptoKeyStore(crypto_store);

      const ca_crypto_suite = Fabric_Client.newCryptoSuite();
      // use the same location for the state store (where the users' certificate are kept)
      // and the crypto store (where the users' keys are kept)
      const ca_crypto_store = Fabric_Client.newCryptoKeyStore({ path: caDockerStorePath });
      ca_crypto_suite.setCryptoKeyStore(ca_crypto_store);

      fabric_client.setCryptoSuite(crypto_suite);
      // be sure to change the http to https when the CA is running TLS enabled
      fabric_ca_client = new Fabric_CA_Client(`https://${caHost}:${caPort}`, null, '', ca_crypto_suite);

      // first check to see if the admin is already enrolled
      return fabric_client.getUserContext(registerUser, true);
    }).then(user_from_store => {
      if (user_from_store && user_from_store.isEnrolled()) {
        console.log('Successfully loaded ' + registerUser + ' from persistence');
        admin_user = user_from_store;
      } else {
        throw new Error('Failed to get admin.... run enrollAdmin.js');
      }

      // at this point we should have the admin user
      // first need to revoke the user with the CA server
      return fabric_ca_client.revoke({ enrollmentID: name, resaon: reasonNum }, admin_user);
    })
      .then(results => {
        if (results.success) {
          console.log('Successfully revoked identity ' + name);
          result = true;
        } else {
          console.log('failed to  revoked identity ' + name);
          result = false;
        }
      })
      .catch(err => {
        console.log('failed to revoke ,err: ' + err);
        result = false;
      });

    return result;
  }

  async function getUserIdentity(registerUser, targetName, caHost, caPort, caStorePath, caDockerStorePath) {
    const fabric_client = new Fabric_Client();
    let fabric_ca_client = null;
    let res = null;

    await Fabric_Client.newDefaultKeyValueStore({ path: caStorePath,
    }).then((state_store) => {
      // assign the store to the fabric client
      fabric_client.setStateStore(state_store);
      const crypto_suite = Fabric_Client.newCryptoSuite();
      // use the same location for the state store (where the users' certificate are kept)
      // and the crypto store (where the users' keys are kept)
      const crypto_store = Fabric_Client.newCryptoKeyStore({ path: caStorePath });
      crypto_suite.setCryptoKeyStore(crypto_store);
      fabric_client.setCryptoSuite(crypto_suite);

      const crypto_suite_ca = Fabric_Client.newCryptoSuite();
      const crypto_store_ca = Fabric_Client.newCryptoKeyStore({ path: caDockerStorePath });
      crypto_suite_ca.setCryptoKeyStore(crypto_store_ca);

      const	tlsOptions = {
        trustedRoots: [],
        verify: false,
      };
      // be sure to change the http to https when the CA is running TLS enabled
      fabric_ca_client = new Fabric_CA_Client(`https://${caHost}:${caPort}`, tlsOptions, '', crypto_suite_ca);


      // first check to see if the admin is already enrolled
      return fabric_client.getUserContext(registerUser, true);
    }).then((user_from_store) => {
      if (user_from_store && user_from_store.isEnrolled()) {
        console.log('Successfully loaded admin from persistence');
      } else {
        console.log('Failed to get ' + registerUser + ' run enrollAdmin.js');
        throw new Error('Failed to get admin.... run enrollAdmin.js');
      }

      const aff = fabric_ca_client.newIdentityService();

      res = aff.getOne(targetName, user_from_store);
    });

    console.log('success opt');
    return res;
  }

  async function reenrollUser(registerUser, name, mspId, caHost, caPort, caStorePath, caDockerStorePath) {
    let fabric_ca_client = null;
    const fabric_client = new Fabric_Client();
    let admin_user = null;
    let member_user = null;
    const result = { success: true };

    // create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
    await Fabric_Client.newDefaultKeyValueStore({ path: caStorePath }).then(state_store => {
      // assign the store to the fabric client
      fabric_client.setStateStore(state_store);
      const crypto_suite = Fabric_Client.newCryptoSuite();
      // use the same location for the state store (where the users' certificate are kept)
      // and the crypto store (where the users' keys are kept)
      const crypto_store = Fabric_Client.newCryptoKeyStore({ path: caStorePath });
      crypto_suite.setCryptoKeyStore(crypto_store);
      const ca_crypto_suite = Fabric_Client.newCryptoSuite();
      // use the same location for the state store (where the users' certificate are kept)
      // and the crypto store (where the users' keys are kept)
      const ca_crypto_store = Fabric_Client.newCryptoKeyStore({ path: caDockerStorePath });
      ca_crypto_suite.setCryptoKeyStore(ca_crypto_store);
      fabric_client.setCryptoSuite(crypto_suite);
      // be sure to change the http to https when the CA is running TLS enabled
      fabric_ca_client = new Fabric_CA_Client(`https://${caHost}:${caPort}`, null, '', ca_crypto_suite);

      // first check to see if the admin is already enrolled
      return fabric_client.getUserContext(registerUser, true);
    }).then(user_from_store => {
      if (user_from_store && user_from_store.isEnrolled()) {
        console.log('Successfully loaded ' + registerUser + ' from persistence');
        admin_user = user_from_store;
      } else {
        throw new Error('Failed to get ' + registerUser + '.... run enrollAdmin.js');
      }
      return fabric_ca_client.reenroll(admin_user);
    }).
      then(enrollment => {
        console.log('Successfully enrolled member user ');

        return fabric_client.createUser(
          {
            username: name,
            mspid: mspId,
            cryptoContent: { privateKeyPEM: enrollment.key.toBytes(), signedCertPEM: enrollment.certificate },
          }
        );
      })
      .then(user => {
        member_user = user;
        return fabric_client.setUserContext(member_user);
      })
      .then(() => {
        console.log('User was successfully registered and enrolled and is ready to interact with the fabric network');
      })
      .catch(err => {
        console.error('Failed to register: ' + err);
        if (err.toString().indexOf('Authorization') > -1) {
          console.error('Authorization failures may be caused by having admin credentials from a previous CA instance.\n' +
            'Try again after deleting the contents of the store directory ');
        }
        result.success = false;
      });
    return result;
  }

  async function createUserAffiliation(registerUser, targetName, caHost, caPort, caStorePath, caDockerStorePath) {
    let fabric_ca_client = null;
    const fabric_client = new Fabric_Client();
    let res = { success: false };

    await Fabric_Client.newDefaultKeyValueStore({ path: caStorePath }).then((state_store) => {
      // assign the store to the fabric client
      fabric_client.setStateStore(state_store);
      const crypto_suite = Fabric_Client.newCryptoSuite();
      // use the same location for the state store (where the users' certificate are kept)
      // and the crypto store (where the users' keys are kept)
      const crypto_store = Fabric_Client.newCryptoKeyStore({ path: caStorePath });
      crypto_suite.setCryptoKeyStore(crypto_store);
      fabric_client.setCryptoSuite(crypto_suite);

      const crypto_suite_ca = Fabric_Client.newCryptoSuite();
      const crypto_store_ca = Fabric_Client.newCryptoKeyStore({ path: caDockerStorePath });
      crypto_suite_ca.setCryptoKeyStore(crypto_store_ca);

      const	tlsOptions = {
        trustedRoots: [],
        verify: false,
      };
      // be sure to change the http to https when the CA is running TLS enabled
      fabric_ca_client = new Fabric_CA_Client(`https://${caHost}:${caPort}`, tlsOptions, '', crypto_suite_ca);

      // first check to see if the admin is already enrolled
      return fabric_client.getUserContext(registerUser, true);
    }).then((user_from_store) => {
      if (user_from_store && user_from_store.isEnrolled()) {
        console.log(`Successfully loaded ${registerUser} from persistence`);
      } else {
        console.log(`Failed to get ${registerUser}`);
        throw new Error(`Failed to get ${registerUser}`);
      }

      const req = {
        name: targetName,
        caname: '',
        force: true,
      };

      const aff = fabric_ca_client.newAffiliationService();
      res = aff.create(req, user_from_store);
      res.success = true;
    }).catch(err => {
      console.error('Failed to create affiliation: ' + err);
      res.success = false;
    });

    console.log('success opt');
    return res;
  }


  async function getUserAffiliations(registerUser, caHost, caPort, caStorePath, caDockerStorePath) {
    let fabric_ca_client = null;
    const fabric_client = new Fabric_Client();
    const res = {};
    let userCtx = null;
    let Affs = null;
    let IdentityInfor = null;

    await Fabric_Client.newDefaultKeyValueStore({ path: caStorePath }).then((state_store) => {
      // assign the store to the fabric client
      fabric_client.setStateStore(state_store);
      const crypto_suite = Fabric_Client.newCryptoSuite();
      // use the same location for the state store (where the users' certificate are kept)
      // and the crypto store (where the users' keys are kept)
      const crypto_store = Fabric_Client.newCryptoKeyStore({ path: caStorePath });
      crypto_suite.setCryptoKeyStore(crypto_store);
      fabric_client.setCryptoSuite(crypto_suite);

      const crypto_suite_ca = Fabric_Client.newCryptoSuite();
      const crypto_store_ca = Fabric_Client.newCryptoKeyStore({ path: caDockerStorePath });
      crypto_suite_ca.setCryptoKeyStore(crypto_store_ca);

      const	tlsOptions = {
        trustedRoots: [],
        verify: false,
      };
      // be sure to change the http to https when the CA is running TLS enabled
      fabric_ca_client = new Fabric_CA_Client(`https://${caHost}:${caPort}`, tlsOptions, '', crypto_suite_ca);

      // first check to see if the admin is already enrolled
      return fabric_client.getUserContext(registerUser, true);
    }).then((user_from_store) => {
      if (user_from_store && user_from_store.isEnrolled()) {
        console.log('Successfully loaded admin from persistence');
      } else {
        console.log('Failed to get admin.... run enrollAdmin.js');
        throw new Error('Failed to get admin.... run enrollAdmin.js');
      }

      userCtx = user_from_store;
      const aff = fabric_ca_client.newAffiliationService();
      return aff.getAll(userCtx);

    }).
      then((AllAffs) => {
        Affs = AllAffs;
        const identity = fabric_ca_client.newIdentityService();
        return identity.getOne(registerUser, userCtx);
      }).then((identity) => {
        IdentityInfor = identity;
      }).catch(err => {
        console.error('Failed to get affiliation: ' + err);
        res.success = false;
      });

    const AffsArray = [];
    getAffFromRes(Affs.result, AffsArray);

    const Res = [];

    for (const Aff in AffsArray) {
      if (AffsArray[Aff].indexOf(IdentityInfor.result.affiliation) !== -1) {
        Res.push(AffsArray[Aff]);
      }
    }
    console.log('success opt');
    return {
      affiliation: Res,
      success: true,
    };
  }

  async function getAffFromRes(Affs, AffsArray) {
    if (typeof (Affs.name) !== 'undefined') {
      AffsArray.push(Affs.name);
      if (typeof (Affs.affiliations) !== 'undefined') {
        for (let index = 0; index < Affs.affiliations.length; index++) {
          getAffFromRes(Affs.affiliations[index], AffsArray);
        }
      }
    }
  }

  async function delUserAffiliations(registerUser, targetName, caHost, caPort, caStorePath, caDockerStorePath) {
    const fabric_client = new Fabric_Client();
    let fabric_ca_client = null;
    let res = null;
    await Fabric_Client.newDefaultKeyValueStore({ path: caStorePath }).then((state_store) => {
      // assign the store to the fabric client
      fabric_client.setStateStore(state_store);
      const crypto_suite = Fabric_Client.newCryptoSuite();
      // use the same location for the state store (where the users' certificate are kept)
      // and the crypto store (where the users' keys are kept)
      const crypto_store = Fabric_Client.newCryptoKeyStore({path: caStorePath});
      crypto_suite.setCryptoKeyStore(crypto_store);
      fabric_client.setCryptoSuite(crypto_suite);

      const crypto_suite_ca = Fabric_Client.newCryptoSuite();
      const crypto_store_ca = Fabric_Client.newCryptoKeyStore({path: caDockerStorePath});
      crypto_suite_ca.setCryptoKeyStore(crypto_store_ca);

      const	tlsOptions = {
        trustedRoots: [],
        verify: false,
      };
      // be sure to change the http to https when the CA is running TLS enabled
      fabric_ca_client = new Fabric_CA_Client(`https://${caHost}:${caPort}`, tlsOptions, '', crypto_suite_ca);

      // first check to see if the admin is already enrolled
      return fabric_client.getUserContext(registerUser, true);
    }).then((user_from_store) => {
      if (user_from_store && user_from_store.isEnrolled()) {
        console.log(`Successfully loaded ${registerUser} from persistence`);
      } else {
        console.log(`Failed to get ${registerUser}`);
        throw new Error(`Failed to get ${registerUser}`);
      }

      const req = {
        name: targetName,
        caname: '',
        force: true,
      };

      const aff = fabric_ca_client.newAffiliationService();
      // res = aff.getAll(user_from_store);
      res = aff.delete(req, user_from_store);
      // at this point we should have the admin user
      // first need to register the user with the CA server
    }).catch(err => {
      console.error('Failed to delete affiliation: ' + err);
      res.success = false;
    });

    console.log('success opt');
    res.success = true;
    return res;
  }

  async function updateUserAffiliation(sourceName, targetName, caHost, caPort, caStorePath, caDockerStorePath) {
    const fabric_client = new Fabric_Client();
    let fabric_ca_client = null;
    let res;
    const registerUser = 'admin';
    await Fabric_Client.newDefaultKeyValueStore({ path: caStorePath }).then((state_store) => {
      // assign the store to the fabric client
      fabric_client.setStateStore(state_store);
      const crypto_suite = Fabric_Client.newCryptoSuite();
      // use the same location for the state store (where the users' certificate are kept)
      // and the crypto store (where the users' keys are kept)
      const crypto_store = Fabric_Client.newCryptoKeyStore({path: caStorePath});
      crypto_suite.setCryptoKeyStore(crypto_store);
      fabric_client.setCryptoSuite(crypto_suite);

      const crypto_suite_ca = Fabric_Client.newCryptoSuite();
      const crypto_store_ca = Fabric_Client.newCryptoKeyStore({path: caDockerStorePath});
      crypto_suite_ca.setCryptoKeyStore(crypto_store_ca);

      const	tlsOptions = {
        trustedRoots: [],
        verify: false,
      };
      // be sure to change the http to https when the CA is running TLS enabled
      fabric_ca_client = new Fabric_CA_Client(`https://${caHost}:${caPort}`, tlsOptions, '', crypto_suite_ca);

      // first check to see if the admin is already enrolled
      return fabric_client.getUserContext(registerUser, true);
    }).then((user_from_store) => {
      if (user_from_store && user_from_store.isEnrolled()) {
        console.log(`Successfully loaded ${registerUser} from persistence`);
      } else {
        console.log(`Failed to get ${registerUser}`);
        throw new Error(`Failed to get ${registerUser}`);
      }

      const req = {
        name: targetName,
        caname: '',
        force: true,
      };

      const aff = fabric_ca_client.newAffiliationService();

      res = aff.update(sourceName, req, user_from_store);
      // at this point we should have the admin user
      // first need to register the user with the CA server
    }).catch(err => {
      console.error('Failed to update affiliation: ' + err);
      res.success = false;
    });

    console.log('success opt');
    res.success = true;
    return res;
  }

  app.enrollAdminV1_1 = enrollAdmin;
  app.registerUserV1_1 = registerUser;
  app.deleteUserV1_1 = deleteUser;
  app.getUserIdentityV1_1 = getUserIdentity;
  app.reenrollUserV1_1 = reenrollUser;
  app.createUserAffiliationV1_1 = createUserAffiliation;
  app.getUserAffiliationsV1_1 = getUserAffiliations;
  app.delUserAffiliationsV1_1 = delUserAffiliations;
  app.updateUserAffiliationV1_1 = updateUserAffiliation;

}
