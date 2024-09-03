var _ = require('lodash');
const async = require('async');
const moment = require('moment');

const config = require('../../config/config');
const utility = require('../../common/utility');
const { logOnElastic } = require('./elasticLog');

const cache = require('../../utils/redisCache')(config.REDIS_VARS_DB);
const varService = require('./globalVars');
const userBlacklistService = require('../userBlacklist');

const _modules = {
  interstitial: 'interstitial',
  lightbox: 'lightbox'
};

const _context = 'CLIENT.ANTI_FRAUD';

const _settings = {
  ANTI_FRAUD : 'ANTI_FRAUD',
  ANTI_FRAUD_RULE_LIGHTBOX_BLACKLISTED_IP : 'ANTI_FRAUD_RULE_LIGHTBOX_BLACKLISTED_IP',
  ANTI_FRAUD_RULE_LIGHTBOX_BLACKLISTED_IDENTITY : 'ANTI_FRAUD_RULE_LIGHTBOX_BLACKLISTED_IDENTITY',
  ANTI_FRAUD_RULE_LIGHTBOX_BLACKLISTED_EMAIL : 'ANTI_FRAUD_RULE_LIGHTBOX_BLACKLISTED_EMAIL',
  ANTI_FRAUD_RULE_LANDING_PAGE_COOKIE_APPROACH : 'ANTI_FRAUD_RULE_LANDING_PAGE_COOKIE_APPROACH',
  ANTI_FRAUD_RULE_LANDING_PAGE_BLOCKED_DOMAIN : 'ANTI_FRAUD_RULE_LANDING_PAGE_BLOCKED_DOMAIN',
  ANTI_FRAUD_RULE_LANDING_PAGE_BLACKLISTED_IP : 'ANTI_FRAUD_RULE_LANDING_PAGE_BLACKLISTED_IP',
  ANTI_FRAUD_RULE_LANDING_PAGE_BLACKLISTED_IDENTITY : 'ANTI_FRAUD_RULE_LANDING_PAGE_BLACKLISTED_IDENTITY'
};

const _keys = [
  'ANTI_FRAUD',
  'ANTI_FRAUD_RULE_LIGHTBOX_BLACKLISTED_IP',
  'ANTI_FRAUD_RULE_LIGHTBOX_BLACKLISTED_IDENTITY',
  'ANTI_FRAUD_RULE_LIGHTBOX_BLACKLISTED_EMAIL',
  'ANTI_FRAUD_RULE_LANDING_PAGE_COOKIE_APPROACH',
  'ANTI_FRAUD_RULE_LANDING_PAGE_BLOCKED_DOMAIN',
  'ANTI_FRAUD_RULE_LANDING_PAGE_BLACKLISTED_IP',
  'ANTI_FRAUD_RULE_LANDING_PAGE_BLACKLISTED_IDENTITY'
];

const _preCacheTTL = 3600; // 1 hours
const _watsonTTL = 86400; // 1 day
const _moriatyTTL = 2629746;// 1 month

let _clientId = null;
let _antiFraudSettings = {};
let _antiFraudEnabled = false;
let _module_type = null;

////////////////////////
// externals
///////////////////////

/**
 * Stars anti fraud module
 * @param {*} clientId
 * @param {*} module
 */
const antiFraud = (clientId, module) => {

  _clientId = clientId;
  _module_type = module;

  // main promisse
  return new Promise((resolve) => {

    // get client settings
    getSettings(clientId)
      .then((antiFraudSettings) => {

        ////////////////////////////
        // GLOBAL CHECK
        ////////////////////////////

        _antiFraudSettings = antiFraudSettings;
        _antiFraudEnabled = utility.parseBoolean(antiFraudSettings[_settings.ANTI_FRAUD]);

        return resolve(this);

      })
      .catch(() => {

        // when something fails
        // do not reject, just set anti fraud as disabled
        // keep going
        _antiFraudEnabled = false;

        return resolve(this);
      });
  });

};

/**
 * Validates a Call
 *
 * @param {*} expressReq
 */
const validate = (expressReq) => {

  // check valid module and antifraud enabled
  if(!_modules[_module_type] || !_antiFraudEnabled){
    return Promise.resolve({ blocked : false });
  }

  // get a cleaned version of Express JS request
  let req = getRequestMeta(expressReq);

  // elastic log
  logOnElastic(`[${_module_type}] - Starting a new anti fraud validation`, req, 'anti-fraud');

  ////////////////////////////
  // VALIDATION PIPELINE
  ////////////////////////////

  return new Promise((resolve, reject) => {

    watsonAddNote(req, _antiFraudSettings)
      .then(() => {

        switch(_module_type){
        case _modules.interstitial :

          return interstitialModule(_clientId, req, _antiFraudSettings)
            .then((valid) => resolve(valid))
            .catch(reject);

        case _modules.lightbox :
          return lightBoxModule(req, _antiFraudSettings)
            .then((valid) => resolve(valid))
            .catch(reject);
        }

      })
      .catch();
  });

};

const interstitialModule = (clientId, req, antiFraudSettings) => {

  return new Promise ((resolve) => {
    async.auto({

      blackListedIp: (next) => {

        let ruleOn = utility.parseBoolean(antiFraudSettings[_settings.ANTI_FRAUD_RULE_LANDING_PAGE_BLACKLISTED_IP]);

        // is this rule on?
        if(!ruleOn){
          return next();
        }

        // elastic log
        logOnElastic(`[${_module_type}] [${_settings.ANTI_FRAUD_RULE_LANDING_PAGE_BLACKLISTED_IP}] - Starting a new rule validation`, req, 'anti-fraud');

        // search on Moriaty Collection by IP
        getOnMoriaty(req.ipAddress)
          .then((moriatyIp) => {

            if(moriatyIp && moriatyIp.length > 0){
              return next({ friendly: true, rule: 1, date: moment() });
            }

            return next();

          })
          .catch(error => next(error));

      },
      cookieRule: [ 'blackListedIp', (next) => {

        let ruleOn = utility.parseBoolean(antiFraudSettings[_settings.ANTI_FRAUD_RULE_LANDING_PAGE_COOKIE_APPROACH]);

        // is this rule on?
        if(!ruleOn){
          return next();
        }

        // elastic log
        logOnElastic(`[${_module_type}] [${_settings.ANTI_FRAUD_RULE_LANDING_PAGE_COOKIE_APPROACH}] - Starting a new rule validation`, req, 'anti-fraud');

        let currentCookie = _.get(req, 'cookies.sharedUrlAccessIds');

        // only validates cookie if it is empty
        // which means when the erquest has cookie, no validation needed
        if(currentCookie && currentCookie.length > 0){
          return next();
        }

        // get notes from Watson
        watsonGetNotes(req)
          .then((notes) => {

            let blocked = false;

            if(notes && notes.length > 0){

              notes = notes.sort((a, b) => (a.accessDate < b.accessDate) ? 1 : -1);

              let lastOneHasNoCookie = false;
              //let lastNote = null;
              for(let note of notes){

                console.log(`${note.accessDate} - ${JSON.stringify(note.cookies.sharedUrlAccessIds)}`);

                let currentHasCookie = (note.cookies && note.cookies.sharedUrlAccessIds && note.cookies.sharedUrlAccessIds.length > 0);

                if(lastOneHasNoCookie == true && currentHasCookie){
                  blocked = true;
                  break;
                }

                lastOneHasNoCookie = (!note.cookies || !note.cookies.sharedUrlAccessIds || note.cookies.sharedUrlAccessIds.length == 0);
              }
            }

            if(blocked){
              return next(null, { rule: 3, blocked: true, date: moment() });
            }

            return next();

          })
          .catch(error => next(error));

      }],
      blackListedIdentity: [ 'cookieRule', (next) => {

        let ruleOn = utility.parseBoolean(antiFraudSettings[_settings.ANTI_FRAUD_RULE_LANDING_PAGE_BLACKLISTED_IDENTITY]);

        // is this rule on?
        if(!ruleOn){
          return next();
        }

        // elastic log
        logOnElastic(`[${_module_type}] [${_settings.ANTI_FRAUD_RULE_LANDING_PAGE_BLACKLISTED_IDENTITY}] - Starting a new rule validation`, req, 'anti-fraud');

        // search on Moriaty Collection by IP
        getOnMoriaty(req.ipAddress, req.userAgent64)
          .then((moriatyIp) => {

            if(moriatyIp && moriatyIp.length > 0){
              return next({ friendly: true, rule: 2, date: moment() });
            }

            return next();

          })
          .catch(error => next(error));

      }],
      blackListedDomain: [ 'blackListedIdentity', (next) => {

        let ruleOn = utility.parseBoolean(antiFraudSettings[_settings.ANTI_FRAUD_RULE_LANDING_PAGE_BLOCKED_DOMAIN]);

        // is this rule on?
        if(!ruleOn){
          return next();
        }

        // elastic log
        logOnElastic(`[${_module_type}] [${_settings.ANTI_FRAUD_RULE_LANDING_PAGE_BLOCKED_DOMAIN}] - Starting a new rule validation`, req, 'anti-fraud');

        varService.getVar('BLOCK_USER_ACCESS_FROM_URLS', 'LANDING_PAGE', clientId)
          .then((result) => {

            let blockExpression = (result && result.length > 0) ? result[0] : false;

            if(blockExpression){

              let reg = new RegExp(blockExpression);

              if(reg.test(req.referer)){
                return next({ friendly: true, rule: 4, date: moment() });
              }
            }

            return next();
          })
          .catch(error => next(error));

      }]

    },(error, result)=> {

      if(!error){

        if(result.cookieRule && result.cookieRule.blocked){

          // elastic log
          logOnElastic(`[${_module_type}] [${_settings.ANTI_FRAUD_RULE_LANDING_PAGE_COOKIE_APPROACH}] - Blocked user access`, _.extend({ blocked: true }, req), 'anti-fraud');

          // the user was caught with the one's cookie cleaned, block by Web Identity
          setOnMoriaty(req.ipAddress, req.userAgent64, utility.stringfyJson(result.cookieRule))
            .then(() => {
              logOnElastic(`[${_module_type}] [${_settings.ANTI_FRAUD_RULE_LANDING_PAGE_BLACKLISTED_IDENTITY}] - Added to Moriaty`, req, 'anti-fraud');
            })
            .finally(() => {
              return resolve({ blocked: true, blockSharedUrl: false, code: '003', reason : `The user cleaned the one's cookie on browser within 24 hours.` });
            });
        }else{

          // no error happened during the validation pipeline, go on!
          return resolve({ blocked: false });
        }

      }else{

        if(!error.friendly){

          // elastic log
          logOnElastic(`[${_module_type}] - Execution error`, _.extend({ error: true, errorObj: error }, req), 'anti-fraud');

          // something went wrong
          return resolve({ blocked: false });

        }

        if(error.rule == 1){

          // elastic log
          logOnElastic(`[${_module_type}] [${_settings.ANTI_FRAUD_RULE_LANDING_PAGE_BLACKLISTED_IP}] - Blocked user access`, _.extend({ blocked: true }, req), 'anti-fraud');

          return resolve({ blocked: true, blockSharedUrl: false, code: '001', reason : `The user is blocked by the one's IP.` });
        }


        if(error.rule == 2){

          // elastic log
          logOnElastic(`[${_module_type}] [${_settings.ANTI_FRAUD_RULE_LANDING_PAGE_BLACKLISTED_IDENTITY}] - Blocked user access`, _.extend({ blocked: true }, req), 'anti-fraud');

          if(result.cookieRule && result.cookieRule.blocked){

            // if the user is already set as blocked, put the one IP on block
            setOnMoriaty(req.ipAddress, null, utility.stringfyJson(result.cookieRule))
              .then(() => {

                logOnElastic(`[${_module_type}] [${_settings.ANTI_FRAUD_RULE_LANDING_PAGE_BLACKLISTED_IP}] - Added to Moriaty`, req, 'anti-fraud');

              })
              .finally(() => {
                return resolve({ blocked: true, blockSharedUrl: false, code: '002', reason : `The user is blocked by the one's Web Identity.` });
              });

          }else {

            // regular flow
            return resolve({ blocked: true, blockSharedUrl: false, code: '002', reason : `The user is blocked by the one's Web Identity.` });
          }
        }

        // the user has accessed froma blocked domain
        if(error.rule == 4){

          // elastic log
          logOnElastic(`[${_module_type}] [${_settings.ANTI_FRAUD_RULE_LANDING_PAGE_BLOCKED_DOMAIN}] - Blocked user access`, _.extend({ blocked: true }, req), 'anti-fraud');

          setOnMoriaty(req.ipAddress, req.userAgent64, utility.stringfyJson(error))
            .then(() => {
              logOnElastic(`[${_module_type}] [${_settings.ANTI_FRAUD_RULE_LANDING_PAGE_BLACKLISTED_IDENTITY}] - Added to Moriaty`, req, 'anti-fraud');
            })
            .finally(() => {
              return resolve({ blocked: true, blockSharedUrl: true, code: '004', reason : 'Shared Url was accessed from a client blocked domain.' });
            });
        }

      }
    });
  });
};

const lightBoxModule = (req, antiFraudSettings) => {

  return new Promise ((resolve) => {
    async.auto({

      blackListedIp: (next) => {

        let ruleOn = utility.parseBoolean(antiFraudSettings[_settings.ANTI_FRAUD_RULE_LIGHTBOX_BLACKLISTED_IP]);

        // is this rule on?
        if(!ruleOn){
          return next();
        }

        // elastic log
        logOnElastic(`[${_module_type}] [${_settings.ANTI_FRAUD_RULE_LIGHTBOX_BLACKLISTED_IP}] - Starting a new rule validation`, req, 'anti-fraud');

        // search on Moriaty Collection by IP
        getOnMoriaty(req.ipAddress)
          .then((moriatyIp) => {

            if(moriatyIp && moriatyIp.length > 0){
              return next({ friendly: true, rule: 1, date: moment() });
            }

            return next();

          })
          .catch(error => next(error));

      },
      blackListedIdentity: [ 'blackListedIp', (next) => {

        let ruleOn = utility.parseBoolean(antiFraudSettings[_settings.ANTI_FRAUD_RULE_LIGHTBOX_BLACKLISTED_IDENTITY]);

        // is this rule on?
        if(!ruleOn){
          return next();
        }

        // elastic log
        logOnElastic(`[${_module_type}] [${_settings.ANTI_FRAUD_RULE_LIGHTBOX_BLACKLISTED_IDENTITY}] - Starting a new rule validation`, req, 'anti-fraud');

        // search on Moriaty Collection by IP
        getOnMoriaty(req.ipAddress, req.userAgent64)
          .then((moriatyIp) => {

            if(moriatyIp && moriatyIp.length > 0){
              return next({ friendly: true, rule: 2, date: moment() });
            }

            return next();

          })
          .catch(error => next(error));

      }],
      blacklistedEmail : [ 'blackListedIdentity', (next) => {

        let ruleOn = utility.parseBoolean(antiFraudSettings[_settings.ANTI_FRAUD_RULE_LIGHTBOX_BLACKLISTED_EMAIL]);

        // is this rule on?
        if(!ruleOn || !req.email){
          return next();
        }

        // elastic log
        logOnElastic(`[${_module_type}] [${_settings.ANTI_FRAUD_RULE_LIGHTBOX_BLACKLISTED_EMAIL}] - Starting a new rule validation`, req, 'anti-fraud');

        // get email from blacklist
        userBlacklistService.isUserBlacklisted(req.email)
          .then((data) => {

            if(data){

              return next({ friendly: true, rule: 3, date: moment() });
            }else{

              return next();
            }
          })
          .catch(error => next(error));

      }]
    },(error)=> {

      if(!error){

        // no error happened during the validation pipeline, go on!
        return resolve({ blocked: false });

      }else{

        if(!error.friendly){

          // elastic log
          logOnElastic(`[${_module_type}] - Execution error`, _.extend({ error: true, errorObj: error }, req), 'anti-fraud');

          // something went wrong
          return resolve({ blocked: false });

        }

        if(error.rule == 1){

          // elastic log
          logOnElastic(`[${_module_type}] [${_settings.ANTI_FRAUD_RULE_LIGHTBOX_BLACKLISTED_IP}] - Blocked user access`, _.extend({ blocked: true }, req), 'anti-fraud');

          return resolve(
            {
              blocked: true,
              code: '001',
              blockSharedUrl: false,
              reason : `The user is blocked by the one's IP.`
            });
        }

        if(error.rule == 2){

          // elastic log
          logOnElastic(`[${_module_type}] [${_settings.ANTI_FRAUD_RULE_LIGHTBOX_BLACKLISTED_IDENTITY}] - Blocked user access`, _.extend({ blocked: true }, req), 'anti-fraud');

          return resolve(
            {
              blocked: true,
              code: '002',
              blockSharedUrl: false,
              reason : `The user is blocked by the one's Web Identity.`
            });
        }

        if(error.rule == 3){

          // elastic log
          logOnElastic(`[${_module_type}] [${_settings.ANTI_FRAUD_RULE_LIGHTBOX_BLACKLISTED_EMAIL}] - Blocked user access`, _.extend({ blocked: true }, req), 'anti-fraud');

          // set Web Identity on Moriaty (no need to wait)
          setOnMoriaty(req.ipAddress, req.userAgent64, utility.stringfyJson(error))
            .then(() => {
              logOnElastic(`[${_module_type}] [${_settings.ANTI_FRAUD_RULE_LIGHTBOX_BLACKLISTED_IDENTITY}] - Added to Moriaty`, req, 'anti-fraud');
            })
            .finally(() => {

              return resolve(
                {
                  blocked: true,
                  code: '003',
                  blockSharedUrl: false,
                  reason : `The user is blocked by the one's Email blacklisted`
                });

            });
        }
      }
    });
  });
};

/**
 * Add a new Moriaty block byb Web Identity
 * @param {*} expressReq
 * @param {*} value
 */
const addBlockByIdentity = (expressReq, value) => {

  let req = getRequestMeta(expressReq);

  logOnElastic(`
    [${_module_type}] [${
  _module_type == _modules.interstitial
    ? _settings.ANTI_FRAUD_RULE_LANDING_PAGE_BLACKLISTED_IDENTITY
    : _settings.ANTI_FRAUD_RULE_LIGHTBOX_BLACKLISTED_IDENTITY}] - Added to Moriaty`, req, 'anti-fraud');

  return setOnMoriaty(req.ipAddress, req.userAgent64, utility.stringfyJson(value));
};

/**
 * Watson ADD a new access note
 * @param {*} req
 * @param {*} antiFraudSettings
 */
const watsonAddNote = (req, antiFraudSettings) => {

  return new Promise((resolve) => {

    if(utility.parseBoolean(antiFraudSettings[_settings.ANTI_FRAUD_RULE_LANDING_PAGE_COOKIE_APPROACH])){

      // elastic log
      logOnElastic(`[${_module_type}] [${_settings.ANTI_FRAUD_RULE_LANDING_PAGE_COOKIE_APPROACH}] - Adding new request on Watson`, req, 'anti-fraud');

      req.accessDate = moment();

      cache.push(`WATSON_IDENTITY:${req.ipAddress}:${req.userAgent64}`, JSON.stringify(req), _watsonTTL)
        .then(resolve)
        .catch((error) => {

          // elastic log
          logOnElastic(`[${_module_type}] [${_settings.ANTI_FRAUD_RULE_LANDING_PAGE_COOKIE_APPROACH}] - Error on creating Watson value`, _.extend({ error: true, errorObj: error }, req), 'anti-fraud');

          // resolve anyway
          resolve();
        });

    }else{
      resolve();
    }
  });
};

/**
 * GET WATSON NOTES
 * @param {*} req
 */
const watsonGetNotes = (req) => {

  return new Promise((resolve, reject) => {

    cache.range(`WATSON_IDENTITY:${req.ipAddress}:${req.userAgent64}`)
      .then((values) => {

        if(values && values.length > 0){
          values = values.map(v => utility.parseJson(v));
        }

        return resolve(values);
      })
      .catch(reject);
  });

};

/**
 * GET ON MORIATY COLLECTION
 * @param {*} ip
 * @param {*} userAgent64
 */
const getOnMoriaty = (ip, userAgent64) => {

  if(userAgent64){

    return cache.range(buildMoriatyKey(ip, userAgent64));

  }else {

    return cache.range(buildMoriatyKey(ip));
  }
};

/**
 * SET on Moriaty
 * @param {*} ip
 * @param {*} userAgent64
 */
const setOnMoriaty = (ip, userAgent64, rule) => {

  if(userAgent64){

    return cache.push(buildMoriatyKey(ip, userAgent64), rule, _moriatyTTL);

  }else {

    return cache.push(buildMoriatyKey(ip), rule, _moriatyTTL);
  }
};

/**
 * BUILD MORIATY KEY
 * @param {*} ip
 * @param {*} userAgent64
 */
const buildMoriatyKey = (ip, userAgent64) => {
  return (userAgent64) ? `MORIATY_IDENITY:${ip}:${userAgent64}` : `MORIATY_IP:${ip}`;
};

const flatVars = (values) => {

  let flatVars = _.flatten(values);

  return !flatVars ? {} : flatVars.reduce((acc, cur) => { acc[cur.key] = cur.value; return acc; }, {});
};

const buildAntiFraudVarsSetttingsKey = (clientId) => {
  return `ANTI_FRAUD_SETTINGS:${clientId}`;
};

/**
 * GET ANTI FRAUD SETTINGS
 * @param {*} clientId
 */
const getSettings = (clientId) => {

  let settingsKey = buildAntiFraudVarsSetttingsKey(clientId);

  return new Promise((resolve, reject) => {

    // check if the client already has a pre cached set of anti-fraud settings
    cache.get(settingsKey)
      .then((preCachedSettings) => {

        if (preCachedSettings) {

          // return ore cached
          return resolve(utility.parseJson(preCachedSettings));
        } else {

          // get all anti-fraud keys from cache
          varService.getVars(_keys, _context, clientId)
            .then((vars) => {

              // normalize the result
              let flat = flatVars(vars);

              // set pre cache
              cache.set(settingsKey, utility.stringfyJson(flat), _preCacheTTL);

              // return the regular result
              return resolve(flat);
            })
            .catch(reject);
        }
      })
      .catch(reject);
  });
};

/**
 * Build the basic anti fraud object
 * @param {*} req
 */
const getRequestMeta = (req) => {

  return {
    email : (req.body.email) ? req.body.email.toLowerCase() : ((req.query && req.query.email) ? req.query.email : null),
    ipAddress : req.ip.replace('::ffff:', ''),
    userAgent : req.headers['user-agent'],
    userAgent64 : new Buffer(req.headers['user-agent']).toString('base64'),
    cookies: req.cookieHandler ? req.cookieHandler.all.get() : {},
    url: req.url,
    referer : req.headers.referer,
    sessionId : req.sessionID,
    module : _module_type
  };
};


module.exports = {
  antiFraud, validate, addBlockByIdentity
};
