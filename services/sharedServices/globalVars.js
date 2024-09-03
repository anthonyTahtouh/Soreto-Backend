var db = require('../../db_pg');
var _ = require('lodash');
const utility = require('../../common/utility');

const config = require('../../config/config');
const cache = require('../../utils/redisCache')(config.REDIS_VARS_DB);

const _globalVarTable = 'reverb.global_vars_js';
const _varDefinitionTable = 'reverb.var_definition_js';

const getClientSettings = (context, clientId, objectId, key) => {
  return new Promise ((resolve, reject) => {

    let select = db('reverb.agg_vars_js')
      .select('*', db.raw('row_number() OVER (partition BY "settingKey"  order by "objectId")'))
      .whereRaw(`context = ? AND ("objectId" = ? OR ("objectId" IS NULL AND "clientId" IS NULL))`, [context, objectId])
      .andWhere(key ? {settingKey: key} : {});

    if(!clientId){
      select.andWhereRaw('"clientId" IS NULL');
    }else{
      select.andWhere({ clientId: clientId });
    }

    select.then((rows) => {

      resolve(_.filter(rows, e => e.row_number == 1));
    })
      .catch((err) => reject(err));
  });
};

/**
 * Get a global var value based on a single key
 * @param {*} key
 * @param {*} context
 * @param {*} objectId
 * @param {*} clientId
 */
const getVar = (key, context, objectId = null, clientId = null) =>{
  return new Promise((resolve, reject) =>{
    objectId = objectId || '_fallback';

    const cacheKey = getCacheKey(key, context, objectId, clientId);

    cache.range(cacheKey).then(data =>{
      if(data && data.length > 0){
        resolve(data);
      }
      else{
        db.raw('SELECT * from reverb.func_get_var(?,?,?,?)', [key, context, objectId, clientId])
          .then((data => {
            const value = data.rows.map(row => row.func_get_var);

            if(value.length > 0){
              cache.push(cacheKey, value, 0);
            }

            resolve(value);
          }))
          .catch((err) => {
            reject(err);
          });
      }
    }).catch((err) => {
      reject(err);
    });

  });
};

/**
 * Get global var values based on a list of keys
 * @param {*} keys
 * @param {*} context
 * @param {*} objectId
 * @param {*} clientId
 */
const getVars = (keys, context, objectId = null, clientId = null) =>{
  return new Promise((resolve, reject) =>{
    objectId = objectId || '_fallback';

    console.log(`${keys.length} were requested`);

    // set some control flow variables
    let shouldRetrieveFromDb = false;
    let cacheResultFromDb = true;

    // try to retrieve it from Redis (first of all)
    getVarsFromCache(keys, context, objectId, clientId)
      .then((resultFromCache) => {

        // does it has value ?
        if(!_.isNil(resultFromCache)){
          resolve(resultFromCache);
        }else{
          shouldRetrieveFromDb = true;
        }
      })
      .catch((error) => {
        console.error(error);
        // if an error occurs during the Redis 'get' process
        // set the flag to force it retrieve from Database
        // also set a flag to prevent cache insert once the Redis instance may is down
        shouldRetrieveFromDb = true;
        cacheResultFromDb = false;

      }).finally(() => {

        // is this flag true?
        // if yes, the values should be retrieved from Database
        if(shouldRetrieveFromDb){

          console.log('Retrieving vars from DB');
          getVarsFromDB(keys, context, objectId, clientId, cacheResultFromDb)
            .then((resultFromDB) => {
              resolve(resultFromDB);
            })
            .catch((error) => {
              console.error(error);
              // at this point we have no other tries
              // the operation should fail
              reject(error);
            });
        }else{
          reject('This flow has an unreached point!');
        }
      });
  });
};

const getVarFromCache = (key, context, objectId = null, clientId = null) => {

  return new Promise((resolve, reject) =>{

    objectId = objectId || '_fallback';

    const cacheKey = getCacheKey(key, context, objectId, clientId);

    cache.range(cacheKey).then(data =>{
      resolve(data);
    }).catch((err) => {
      reject(err);
    });
  });
};

/**
 * Get multiple Global Vars from Database
 * @param {*} keys
 * @param {*} context
 * @param {*} objectId
 * @param {*} clientId
 * @param {*} cacheResult
 */
const getVarsFromDB = (keys, context, objectId = null, clientId = null, cacheResult = null) =>{
  return new Promise((resolve, reject) =>{

    objectId = objectId || '_fallback';

    // build key parameters to fit on DB function call
    let psArrayParam = '';
    _.each(keys, (key, i) => {
      psArrayParam += ((i == 0) ? '' : ',' ) + `'${key}'`;
    });

    // get from database
    db.raw(`SELECT "key", array_to_string("value", '|*|') AS value from reverb.func_get_var(ARRAY[${psArrayParam}],?,?,?)`, [context, objectId, clientId])
      .then((data => {

        // the result from database has the format like: { value1, value2 }
        // turn it into a JS array by spliting for our special character sequence '|*|'
        const results = data.rows.map((v) => {

          v.value = v.value.split('|*|');

          return v;
        });

        // any result?
        if(results.length > 0){

          // write results back to the Redis
          for(let result of results){

            // should the result be cached?
            if(cacheResult){

              // get cache key
              let  cacheKey = getCacheKey(result.key, context, objectId, clientId);

              // delete all records from Redis
              cache.del([cacheKey]);
              // write the results back
              cache.push(cacheKey, result.value, 0);
            }

            // handle the results to return in a common way (Redis X DB)
            bindVarsResult(result);
          }
        }

        // resolve promise
        resolve(results);
      }))
      .catch((err) => {

        // reject promise
        // something went wrong retieving from DB
        reject(err);
      });

  });
};

/**
 * Get multiple Global Vars from Redis cache
 * @param {*} keys
 * @param {*} context
 * @param {*} objectId
 * @param {*} clientId
 */
const getVarsFromCache = (keys, context, objectId = null, clientId = null) =>{
  return new Promise((resolve, reject) =>{
    objectId = objectId || '_fallback';

    const cacheKeys = [];

    // build cache key list to search on Redis
    for(let key of keys){
      cacheKeys.push(getCacheKey(key, context, objectId, clientId));
    }

    // try to get data
    cache.multiRange(cacheKeys).then(data =>{

      // the redis cache should bring the same number of keys
      // as informed on 'keys' parameter

      if(data && data.length > 0 &&
        !_.some(data, (d) => _.isNull(d.value)) &&
        data.length == keys.length){

        console.log('Redis cache has found all requested vars');

        // change REDIS key name to Reverb DB key name
        // bind result into value or values
        _.forEach(data, (d) => {
          d.key = getKeyFromCacheKey(d.key);
          bindVarsResult(d);
        });

        // resolve promise
        resolve(data);

      }else{

        // if Redis search does not return the exactly amount of requested keys
        // the return value gonna be NULL to force it be cached ahead
        console.log(`Redis cache hasn't found all requested vars`);

        resolve(null);
      }

    }).catch((err) => {

      // reject promise
      // something went wrong retrieving from Redis
      reject(err);
    });

  });
};

// build Redis cache key
const getCacheKey = (key, context, objectId, clientId) =>{
  const scope = clientId ? `custom:${clientId}` : 'global';
  return `vars:${scope}:${context}:${key}:${objectId}`;
};

const bindVarsResult = (result) => {

  if(Array.isArray(result.value)){

    if(result.value.length > 1){
      result.values = result.value;
      delete result.value;
    }else{
      result.value = result.value[0];
    }
  }
};

const getBooleanVar = async (key, context, objectId = null, clientId = null) => {

  let gb = await getVar(key, context, objectId, clientId);

  if(gb && gb.length > 0){
    return utility.parseBoolean(gb[0]);
  }

  return false;
};

const friendlify = (values) => {

  try {

    let flatVars = _.flatten(values);

    if(flatVars){

      return flatVars.reduce((acc, cur) =>
      {

        if(utility.isJsonString(cur.value)){
          cur.value = utility.parseJson(cur.value);
        }

        acc[utility.toCamelCase(cur.key)] = cur.value;

        return acc;
      }
      , {});

    }else{
      return {};
    }

  } catch (error) {
    return {};
  }
};

// get SettingKey from Redis cache key
const getKeyFromCacheKey = (cacheKey) =>{
  return cacheKey.split(':')[3];
};

const handleSetting = (setting, transaction) => {

  let action = {};

  const newSpec = !!setting.varDefinitionId && !!setting.fallbacked && !!setting.objectId;
  const updateSpec = !setting.fallbacked && !!setting.objectId && !!setting.varDefinitionId;
  const newCustom = !setting.varDefinitionId;
  const updateCustom = !newCustom && !!setting.clientId;

  if(setting.setToRemove){
    action =  removeCustomSetting(setting, transaction);
  }
  else if(setting.setToFallback){
    action = removeSpecialization(setting, transaction);
  }
  else if(newSpec){
    action = createSpecialization(setting, transaction);
  }
  else if(updateSpec || updateCustom){
    action = updateSpecialization(setting, transaction);
  }
  else if(newCustom){
    action = createCutomSetting(setting, transaction);
  }

  // if something change, delete the cache
  if(!_.isNil(action)){

    let {settingKey, context, objectId, clientId, originalObjectId} = setting;

    // if the value was fallbacked the original object ID no longer exists
    // get it from the original reference
    objectId = objectId || originalObjectId;

    const cacheKey = getCacheKey(settingKey, context, objectId, clientId);

    cache.del(cacheKey);
  }

  return action;
};

const updateSettings = (settings) =>{
  return new Promise((resolve, reject) => {

    if(!settings || !Array.isArray(settings) || settings.length == 0){
      resolve();
    }

    // open the main transaction
    db.transaction((t) => {

      let promisses = settings.map(s => handleSetting(s, t));

      Promise.all(promisses)
        .then(() => {

          t.commit()
            .then(() => {
              resolve();
            })
            .catch((err) => {
              reject(err);
            });
        })
        .catch((err) => {

          t.rollback(err)
            .then(() => {
              reject(err);
            })
            .catch(() => {
              reject(err);
            });
        });
    });

  });
};

/**
 * @description Create custom setting
 * @param {*} setting
 */
function createCutomSetting(setting, transaction) {
  return new Promise((resolve, reject) => {

    const newVarDefinition = {
      settingKey: setting.settingKey,
      context: setting.context,
      type: setting.type,
      description: setting.description,
      fallbackValue: setting.value,
      valueOption: setting.valueOption,
      restrict: setting.restrict,
      multiValue: setting.multiValue,
      clientId: setting.clientId
    };

    db(_varDefinitionTable)
      .transacting(transaction)
      .insert(newVarDefinition)
      .returning('_id')
      .then((varDefinitionId) => {

        const newGlobalVar = {
          objectId: setting.objectId,
          varDefinitionId: varDefinitionId[0],
          value: setting.value
        };

        db(_globalVarTable)
          .insert(newGlobalVar)
          .transacting(transaction)
          .then(resolve)
          .catch((error) => reject(error));
      })
      .catch((err) => {
        reject(err);
      });

  });
}

/**
 * @description Update global setting
 * @param {*} setting
 */
function updateSpecialization(setting, transaction) {

  let updatedGlobalVar = {
    objectId: setting.objectId,
    varDefinitionId: setting.varDefinitionId,
    value: setting.value
  };

  return new Promise((resolve, reject) => {
    // create update global var
    db(_globalVarTable)
      .transacting(transaction)
      .update(updatedGlobalVar)
      .where({ _id: setting.globalVarSettingId })
      .then(resolve)
      .catch(reject);
  });
}

/**
 * @description Set a setting back to falback (global_var delete)
 * @param {*} setting
 */
function removeSpecialization(setting, transaction) {
  return new Promise((resolve, reject) => {

    db(_globalVarTable)
      .transacting(transaction)
      .delete()
      .where({ _id: setting.globalVarSettingId })
      .then(resolve)
      .catch(reject);
  });
}

/**
 * @description Create a setting specialization
 * @param {*} setting
 */
function createSpecialization(setting, transaction) {
  return new Promise((resolve, reject) => {

    let newGlobalVar = {
      objectId: setting.objectId,
      varDefinitionId: setting.varDefinitionId,
      value: setting.value
    };

    // create a new global var
    db(_globalVarTable)
      .transacting(transaction)
      .insert(newGlobalVar)
      .then(resolve)
      .catch((err) => {
        reject(err);
      });
  });
}

/**
 * @description Removes a custom setting from vars enviroment
 * @param {*} setting
 */
function removeCustomSetting(setting, transaction) {
  return new Promise((resolve, reject) => {
    if (!setting.varDefinitionId) {
      resolve();
    }
    if (!setting.clientId || !setting.objectId) {
      reject('You are not allowed to delete a Global Setting Definition');
    }
    // delete value from global vars
    db(_globalVarTable)
      .transacting(transaction)
      .delete()
      .where({
        _id: setting.globalVarSettingId
      })
      .then(() => {

        if (setting.clientId) {
          // delete definition if it is a custom one
          db('var_definition_js').transacting(transaction)
            .delete()
            .where({ _id: setting.varDefinitionId })
            .then(resolve);
        }
        else {
          resolve();
        }
      });
  });
}

function getGlobalVarEspecialization(filter) {
  // create a new global var
  return db(_globalVarTable)
    .select('*')
    .where(filter);
}

/**
 * @description Get var definition from DB filtered by context and key
 * @param {*} context
 * @param {*} key
 */
function getVarDefinitionByContextAndKey(context, settingKey) {

  return db(_varDefinitionTable)
    .select('*')
    .where({context, settingKey})
    .first();
}

const createSpecializationTransactionless = async (objectId, varDefinitionId, value) => {

  let newGlobalVar = {
    objectId: objectId,
    varDefinitionId: varDefinitionId,
    value: value
  };

  await db(_globalVarTable).insert(newGlobalVar);
};

module.exports = {
  updateSettings,
  getClientSettings,
  getVar,
  getVars,
  getBooleanVar,
  getVarFromCache,
  getVarsFromCache,
  getVarsFromDB,
  getVarDefinitionByContextAndKey,
  friendlify,
  createSpecializationTransactionless,
  getGlobalVarEspecialization
};