var dbError = require('../common/dbError');
var AbstractPromiseService = require('./AbstractPromiseService');
var db = require('../db_pg');
var moment = require('moment');
var _ = require('lodash');
var logger = require('../common/winstonLogging');

const config = require('../config/config');
const cache = require('../utils/redisCache')(config.REDIS_CACHE_DB);
const crypto = require('crypto');

const _context = 'user';

class UserBlacklistService extends AbstractPromiseService {

  constructor() {
    super('user_blacklist_js');
  }

  delete(id) {
    return new Promise((resolve,reject)=>{
      db('user_blacklist_js')
        .returning('*')
        .where({
          _id: id
        })
        .del()
        .then( (result) => {

          if(result && result.length > 0){
            let obj = result[0];

            let cacheKey = getCacheKey(_context,obj.email);

            cache.del(cacheKey).catch((err) => {
              logger.warn(`It was not possible comunicate to Redis server: ${err}`);
            });
          }

          resolve({success: true});
        })
        .catch( (err) => {
          reject(dbError(err, `Error to call 'delete' data from blacklist_js`));
        });
    });
  }

  getNonExpiredUserBlacklistToCache() {
    return new Promise((resolve,reject)=>{
      db('user_blacklist_js')
        .returning('*')
        .where('expiryAt', '>', moment().format('YYYY-MM-DD HH:mm:ss'))
        .orWhereNull('expiryAt')
        .orderBy('createdAt', 'asc')
        .then( (row) => {
          resolve(_.isEmpty(row) ? [] : row);
        })
        .catch( (err) => {

          reject(dbError(err, `Error refreshing blacklist cache`));
        });
    });
  }

  rebuildUserBlacklisFullCache(){
    return new Promise((resolve,reject)=>{
      this.getNonExpiredUserBlacklistToCache()
        .then( (row) => {

          // Rebuild all user blacklist in Redis cache
          if(row && row.length > 0){
            _.map(row, (item) =>{

              let cacheKey = getCacheKey(_context,item.email);

              let ttl = 0;
              if(item.expiryAt){
                let diff = moment.utc().diff(moment.utc(moment(item.expiryAt)), 'seconds');
                ttl = (diff < 0) ? Math.abs(diff) : 1;
              }

              cache.set(cacheKey, true, ttl);
            });
          }

          resolve({ success: true});
        })
        .catch( (err) => {

          reject(dbError(err, `Error refreshing blacklist cache`));
        });
    });
  }

  createUser(obj) {
    const viewName = this.viewName;
    return new Promise((resolve,reject)=>{
      db(viewName)
        .returning('*')
        .insert(obj)
        .then(function (response) {

          let cacheKey = getCacheKey(_context,obj.email);

          let ttl = 0;
          if(obj.expiryAt){
            let diff = moment.utc().diff(moment.utc(moment(obj.expiryAt)), 'seconds');
            ttl = (diff < 0) ? Math.abs(diff) : 1;
          }

          cache.set(cacheKey, true, ttl).catch((err) => {
            logger.warn(`It was not possible comunicate to Redis server: ${err}`);
          });

          resolve(response[0]);
        })
        .catch(function (err) {
          console.log('createErr',err);
          reject(dbError(err, `Error to call 'create' into ${viewName}`));
        });
    });
  }


  isUserBlacklisted(email){
    return new Promise((resolve, reject) =>{

      if(!email || email === '' ){
        resolve(false);
      }

      let cacheKey = getCacheKey(_context,email);

      cache.exists([cacheKey]).then(data =>{
        resolve( Boolean(data) );
      }).catch(() => {
        reject(false);
      });
    });
  }

  /**
   * Method that is called on server startup to initialize all user blacklist into the cache
  */
  initCache(){

    console.log('Initializing Blacklist users cache');

    userBlacklistService.rebuildUserBlacklisFullCache()
      .then((result)=>{
        if (result && result.success == true){
          console.log('Blacklist users up!');
        }
      })
      .catch((err)=>{
        console.log(`Blacklist users ERROR: ${err}`);
      });
  }
}

const getCacheKey = (context, key) =>{
  return `blacklist:${context}:${encrypt(key)}`;
};

/** Encryption method used for email hash only*/
const encrypt = (payload) => {

  const key = Buffer.from('5ebe2294abc0e0f08def7690d2a6ee69', 'hex');
  const iv  = Buffer.from('26ae5cc123e36b6bdfca419948dea6cc', 'hex');
  const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);

  var crypted = cipher.update(payload,'utf8','hex');
  crypted += cipher.final('hex');
  return crypted;
};

const userBlacklistService =  new UserBlacklistService();

module.exports = userBlacklistService;
