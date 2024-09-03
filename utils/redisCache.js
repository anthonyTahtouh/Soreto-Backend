'use strict';

const IoRedis = require('ioredis');
const config = require('../config/config.js');
const _ = require('lodash');

class Redis {

  constructor(dbNumber){
    this.connection = new IoRedis({
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      family: 4, // 4 (IPv4) or 6 (IPv6)
      password: config.REDIS_PASSWORD,
      db: (!dbNumber) ? config.REDIS_CACHE_DB : dbNumber,
      maxRetriesPerRequest: config.REDIS_CONN_RETRY,
      retryStrategy: function(times) {
        return Math.min(500 * (times), 5000);
      }
    });
  }

  get(key) {
    return this.commandHandler()
      .then(() => {
        return this.connection.get(key);
      });
  }

  exists(keys) {
    return this.commandHandler()
      .then(() => {
        return this.connection.exists(keys);
      });
  }

  del(key) {
    return this.commandHandler()
      .then(() => {
        return this.connection.del(key);
      });
  }

  delPattern(pattern) {
    return this.commandHandler()
      .then(() => {

        // create a pipeline
        let pipeline = this.connection.pipeline();
        // create a stream
        let stream = this.connection.scanStream({ match: pattern});

        return new Promise((resolve, reject) => {

          stream.on('data', (keys) => {

            for(let key  of keys){
              pipeline.del(key);
            }
          });

          stream.on('end', function(){

            pipeline.exec().then(resolve);

          });

          stream.on('error', function(err){
            reject(err);
          });
        });
      });
  }

  range(key){
    return this.commandHandler()
      .then(() => {
        return this.connection.lrange(key, 0, -1);
      });
  }

  multiRange(keys){

    return this.commandHandler()
      .then(() => {

        // create a pipeline to guarantee the result order
        let pipeline = this.connection.pipeline();

        // add all the commands into the pipeline
        keys.forEach((key) => pipeline.lrange(key, 0, -1));

        // execute the pipeline
        return pipeline.exec()
          .then((resultKeys) => {

            // build the final result
            // add the result with the respective result value

            let finalResult = [];

            _.forEach(resultKeys, (result, i) => {

              let nonNullValues = _.first(_.filter(result, (r) => r != null));

              finalResult.push({
                key : keys[i],
                value : (nonNullValues.length > 0) ?
                  (
                    (nonNullValues.length == 1) ?
                      nonNullValues[0] :
                      nonNullValues
                  )
                  : null
              });

            });

            return finalResult;

          });

      });
  }

  push(key, value, ttl) {
    return this.commandHandler()
      .then(() => {
        let retPromise;
        if (ttl === 0) {
          retPromise = this.connection.rpush(key, value);
        }
        else {
          retPromise = this.connection.rpush(key, value)
            .then(() => {
              this.connection.expire(key, ttl);
            });
        }
        return retPromise;
      });
  }

  set(key, value, ttl) {
    return this.commandHandler()
      .then(() => {
        let retPromise;
        if (ttl === 0) {
          retPromise = this.connection.set(key, value);
        }
        else {
          retPromise = this.connection.set(key, value)
            .then(() => {
              this.connection.expire(key, ttl);
            });
        }
        return retPromise;
      });
  }

  getReqCache(req) {
    return this.get(`api:${req.originalUrl}`);
  }

  setReqCache(req, value, ttl) {
    return this.set(`api:${req.originalUrl}`, value, ttl || 50);
  }

  commandHandler() {
    return new Promise((resolve, reject) =>{
      if(this.connection.status == 'ready' || this.connection.status == 'connect') {
        resolve();
      }else{
        reject('Could not reach Redis server');
      }
    });
  }

  daysInSeconds(days) { return days * 86400; }
}

module.exports = ( dbNumber ) => { return new Redis( dbNumber ); };
