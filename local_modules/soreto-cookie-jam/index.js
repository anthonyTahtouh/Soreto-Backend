const _moment = require('moment');

/**
 * Required options to start the Jam
 */
const _requiredOptions = ['cookieName', 'model', 'defaultExpirationDelay'];

/**
 * How much is the maximum size allowed to a cookie
 * Considering the average between browsers, 4096 is a safe option
 */
const _maxBytesAllowed = 4096;

/**
 * How much percent close of the maximum should the cookie be cleaned up
 */
const _cleanupThresholdPercent = 95;

/**
 * How much percent from the existent leaves should be removed
 * when the size reaches the cleanup
 */
const _cleanupExclusionPercent = 10;

/**
 * The basic difference in times between the plain JSON data and Base64
 * Base64 compression will create a bigger result than the original data
 */
const _base64SizeProportion = 1.4;

/**
 * The cookie itself will have this expiration days
 */
const _defaultExpirationDays = 365;

/**
 * SORETO COOKIE JAM
 */
class SoretoCookieJam {

  /**
   * Constructor
   * @param {*} req Express request
   * @param {*} res Express response
   * @param {*} options Options to start
   */
  constructor(req, res, options) {

    try {

      // basic validation
      if (!req || !res) {
        throw 'Express request and response are required arguments.';
      }

      // validate options
      this.validateOptions(options);

      // assign props
      Object.assign(this, {
        req,
        res,
        options: { ...options }
      });

      // start by cleanning up
      this.cleanup(req.cookies[this.options.cookieName], res);

    } catch (error) {

      this.errorHandler('STARTUP', error);
    }
  }

  /**
   * Set a value on cookie
   * @param {*} key
   * @param {*} value
   * @param {*} id
   * @param {*} options 
   *  overrideExistent: If an equal node is find override its value
   *  timeout: set a custom timeout to override
   */
  set(key, 
      value = undefined, 
      id = undefined, 
      options = { 
        overrideExistent : true, 
        timeout : undefined, 
        //if true doesn't set the timeout again if the cookie leaf already exists (is being updated)
        keepOriginalExpirationDate : false
      }) {

    try {

      // validate if the key is valid
      if (!this.p_isKeyValid(this.options.model, key)) {
        throw `The key you are trying to insert is not part of the cookie model: ${key}`;
      }

      // copy the current state
      let state = this.currentStateCopy();

      // current value
      let propValue = state[key];

      // build new leaf
      let newLeaf = this.leaf(value, id);

      // calc the expiration
      // if no timeout is defined get the default value for the model
      let expirationDelay = options.timeout || this.p_expirationDelay(key);
      
      if (expirationDelay) {
        newLeaf.expiresAt = _moment().add(expirationDelay, 'minutes');
      }

      // is the property an array
      if (this.p_isArray(key)) {

        let existents = null;

        // does this property requires a single Id reference?
        if(this.p_uniqueId(key)){

          // id is a requirement for properties that requires an unique one
          if(!newLeaf.id){
            throw `The property '${key}', requires an 'id' since the model is set as 'uniqueId = true'`
          }

          // find other entries that matches (only id)
          existents = propValue.filter(l => this.l_equals_id(l, newLeaf));

        }else{

          // find other entries that matches (id and value)
          existents = propValue.filter(l => this.l_equals(l, newLeaf));
        }

        // is there another one?
        if (existents.length > 0) {

          // should override?
          if (options.overrideExistent == true) {

            // if this property is set to have uniqueid, at this point in the code, the 
            //existents have exactly 1 object, thus the existents[0]
            if (options.keepOriginalExpirationDate) {
              newLeaf.expiresAt = existents[0].expiresAt;
            }

            // remove existents from property list
            propValue = propValue.filter(l => !existents.find(ex => ex == l));

            // add the new one
            propValue.push(newLeaf);

            state[key] = propValue;
          }

        } else {

          // the value doesn't exits, just add
          propValue.push(newLeaf);
        }

      } else {

        state[key] = newLeaf;
      }

      // cleanup size if necessary
      this.cleanupSize(state);

      // commit
      this.save(state);

    } catch (error) {

      this.errorHandler('SET', error);
    }
  }

  /**
   * Get a value from cookie even if this values wasn't subimmited yet
   * @param {*} key 
   * @param {*} value 
   * @param {*} id 
   */
  get(key = undefined, value = undefined, id = undefined) {

    try {

      // if no key was informed, get all
      if (!key) {
        return this.cookieState;
      }

      // validate if the key is valid
      if (!this.p_isKeyValid(this.options.model, key)) {
        throw `The key you are find is not part of the cookie model: ${key}`;
      }

      let property = this.cookieState[key];

      let resultValue = undefined;

      // has the property a value?
      if (property) {

        // is an array?
        if (this.p_isArray(key)) {

          // search for value based on the informed paramenters
          let search = property.find(l => (!value || (value && l.value == value)) && (!id || (l.id == id)));

          if (search) {
            resultValue = search.value;
          }

        } else {

          resultValue = property.value;
        }
      }

      return resultValue;

    } catch (error) {

      this.errorHandler('GET', error);
    }
  }

  /**
   * Delete value
   * @param {*} key
   * @param {*} value
   * @param {*} id
   */
  delete(key, value, id) {

    try {

      // validate if the key is valid
      if (!this.p_isKeyValid(this.options.model, key)) {
        throw `The key you are find is not part of the cookie model: ${key}`;
      }

      // copy the current state
      let state = this.currentStateCopy();

      let propertyValue = state[key];

      // has the property a value?
      if (propertyValue) {

        // is an array?
        if (this.p_isArray(key)) {

          // search for value based on the informed paramenters
          let existents = propertyValue.filter(l => (!value || (value && l.value == value)) && (!id || (l.id == id)));

          if (existents && existents.length > 0) {

            state[key] = propertyValue.filter(pv => !existents.includes(pv));
          }

        } else {

          // TODO: looks wrong
          // implement it when the time has come :)
          delete this.cookieState[key];
        }

        this.save(state);
      }
      
    } catch (error) {

      this.errorHandler('DELETE', error);
    }
  }

  /**
   * Builds a new leaf
   * @param {*} value
   * @param {*} id
   * @param {*} expiresAt
   */
  leaf(value = undefined, id = undefined, expiresAt = undefined) {
    return {
      value,
      id,
      expiresAt
    };
  }

  /**
   * Cleanup cookie
   *
   * @param {*} cookies
   */
  cleanup(cookies) {

    // unpack the information
    let unpackedData = this.unPack(cookies);

    // copy the unpacked data
    let unpackedDataCopy = this.copyObject(unpackedData);

    // remove expired leaves
    this.cleanupExpired(unpackedData);

    // cleanup size
    this.cleanupSize(unpackedData);

    // if the original data has changed, commit it
    let commit = !this.isSameObject(unpackedData, unpackedDataCopy);

    // save
    this.save(unpackedData, commit);
  }

  /**
   * Return an object as the defined model
   * Fills the properties with matches from cookie
   * The values not mapped on cookie will be ignored
   * @param {*} data
   */
  unPack(data) {

    let decodedData = null;
    data = !data ? {} : data;

    try {

      if (this.options.useBase64) {

        decodedData = this.decodeFromBase64(data);        
      }

      // sanitized object following the model
      let finalObject = {};

      // fit data on model
      // iterate over all model properties
      // add the correspondent found value on 'realObject'
      for (let field in this.options.model) {

        // is the data an array?
        if (!this.p_isArray(field)) {

          // it is not an array

          if (!decodedData[field]) {

            // the value doesn't exists on cookie create a default version
            finalObject[field] = this.leaf();
          } else {

            // the value already exists on cookie
            finalObject[field] = this.leaf(decodedData[field].value, decodedData[field].id, decodedData[field].expiresAt);
          }

        } else {

          // it is an array

          if (!decodedData[field]) {
            finalObject[field] = [];
          } else {
            finalObject[field] = decodedData[field].map(dd => this.leaf(dd.value, dd.id, dd.expiresAt));
          }
        }
      }

      return finalObject;

    } catch (error) {
      throw `Error unpacking data from cookie: ${error}`;
    }
  }

  /**
   * Cleanup Expired
   * @param {*} decodedData
   */
  cleanupExpired(decodedData) {

    try {

      // iterate ovel all properties
      for (let field in decodedData) {

        // is it an array?
        if (this.p_isArray(field)) {

          // get all those the haven't expired yet
          decodedData[field] = decodedData[field].filter((item) => {
            return _moment().diff(item.expiresAt) < 0;
          });
        } else {

          // if the field is expired, create a new empty leaf
          if (_moment().diff(decodedData[field].expiresAt) > 0) {
            decodedData[field] = this.leaf();
          }
        }
      }

    } catch (error) {
      throw `Error cleanning up the expired leaves from cookie: ${error}`;
    }
  }

  /**
   * Reduce the size of the cookie
   * @param {*} decodedData
   */
  cleanupSize(decodedData) {

    // the cookie size should be mesured by the name and content
    let totalDecodedSize = (this.options.cookieName.length + JSON.stringify(decodedData).length) * _base64SizeProportion;

    // calc the percent of usage
    let percentOfUsage = (totalDecodedSize * 100) / _maxBytesAllowed;

    if (percentOfUsage >= _cleanupThresholdPercent) {

      // a plain array with all leaves
      let allLeaves = [];

      for (let field in decodedData) {

        if (this.p_isArray(field)) {
          allLeaves = allLeaves.concat(decodedData[field]);
        } else {
          allLeaves.push(decodedData[field]);
        }
      }

      // order by expires at
      // let the ones with longest expiration first
      allLeaves.sort((a, b) => (new Date(a.expiresAt) > new Date(b.expiresAt)) ? -1 : 1);

      // calc how much leaves should be removed
      let saveLength = Math.floor((100 - _cleanupExclusionPercent) * (allLeaves.length / 100));

      // keep all the those values with longer expiration dates
      allLeaves.splice(0, saveLength);

      // iterate over all values replacing them
      // TODO: make it smarter not only by comparing the leaf value with no prop reference
      for (let field in decodedData) {

        // validates if the property can be cleaned on oversize
        if(!this.p_cleanableOnOversize(field)){
          continue;
        }

        if (this.p_isArray(field)) {

          for (let l of decodedData[field]) {

            decodedData[field] = decodedData[field].filter(l1 => !allLeaves.some(l2 => this.l_equals(l2, l1)));
          }
        } else {

          let oldLeaf = allLeaves.some(l => this.l_equals(l, decodedData[field]));

          if (oldLeaf) {
            delete decodedData[field];
          }
        }
      }
    }
  }

  /**
   * Get a copy of the current state
   */
  currentStateCopy() {
    return JSON.parse(JSON.stringify(this.cookieState));
  }

  /**
   * Validate instance options
   * @param {*} options
   */
  validateOptions(options) {

    let missingOptions = _requiredOptions.filter(ro => !options[ro]);

    if (missingOptions.length > 0) {
      throw `Missing required options: [${missingOptions.join(',')}]`;
    }
  }

  /**
   * Validate if a key is part of the model
   * @param {*} model
   * @param {*} key
   */
  p_isKeyValid(model, key) {

    if (!Object.keys(model).some(k => k == key)) {
      return false;
    }

    return true;
  }

  /**
   * Check if the property represented by the key is an array structure
   * @param {*} key
   */
  p_isArray(key) {
    return Array.isArray(this.options.model[key]);
  }

  /**
   * Get the expiration delay for the property
   * @param {*} key
   */
  p_expirationDelay(key) {

    let expiration = (this.p_isArray(key)) ? this.options.model[key][0].expirationDelay : this.options.model[key].expirationDelay;

    // if no expiration was found, set the default one
    if(!expiration){
      expiration = this.options.defaultExpirationDelay;
    }

    return (expiration) ? expiration : undefined;
  }

  /**
   * Gets is a property can be cleaned on oversize cleanup process
   * 
   * @param {*} key 
   */
  p_cleanableOnOversize(key) {
    
    let option = (this.p_isArray(key) ? this.options.model[key][0].disableCleanByOversize : this.options.model[key].disableCleanByOversize);

    return !(option === true);
  }

  /**
   * Gets if the property demands a unique Id
   * @param {*} key 
   */
  p_uniqueId(key) {
    return (this.p_isArray(key)) && (this.options.model[key][0].uniqueId === true)
  }

  /**
   * Compare two leaves
   * @param {*} leaf
   * @param {*} leafToCompare
   */
  l_equals(leaf, leafToCompare) {
    return (
      // compare the value
      this.l_isSameValue(leaf.value, leafToCompare.value)
      // compare the id
      &&
      ((leafToCompare.id && leaf.id == leafToCompare.id) || !leafToCompare.id)
    );
  }

  /**
   * Compare two leave Ids
   * @param {*} leaf
   * @param {*} leafToCompare
   */
  l_equals_id(leaf, leafToCompare) {
    return leaf.id == leafToCompare.id;
  }
  
  /**
   * Check between two leaves values if they have the same value
   * @param {*} value 
   * @param {*} valueToCompare 
   */
  l_isSameValue(value, valueToCompare) {
    return ((!this.isObject(valueToCompare) && value == valueToCompare) ||
      (this.isObject(valueToCompare) && this.isSameObject(value, valueToCompare)));
  }

  /**
   * Check if the value is the same
   * @param {*} value 
   */
  isObject(value) {
    return (Object(value) == value)
  }

  /**
   * Check if two objects has the same value
   * @param {*} value 
   * @param {*} valueToCompare 
   */
  isSameObject(value, valueToCompare) {
    return JSON.stringify(value) === JSON.stringify(valueToCompare);
  }

  /**
   * Deep copy an object
   * @param {*} object 
   */
  copyObject(object){
    return JSON.parse(JSON.stringify(object));
  }

  /**
   * Decode from base 64
   * @param {*} data
   */
  decodeFromBase64(data) {

    var base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;

    // test if it is a valid base 64 before decode
    if(base64regex.test(data)){
      
      let buff = new Buffer(data, 'base64');
      let plainString = buff.toString('ascii');

      try{
        return JSON.parse(plainString);
      }catch(error){
        throw `Error parsing string data to JSON object: ${error}`;
      }

    }else{

      // if it is not a valid base 64
      // it would probably be a pure JSON object
      return data;
    }    
  }

  /**
   * Encode to base 64
   * @param {*} decodedData
   */
  encodeToBase64(decodedData) {

    try{

      let data = JSON.stringify(decodedData);
      let buff = new Buffer(data);
      return buff.toString('base64');

    }catch(error){

      throw `Error encoding data to base 64: ${error}`;
    }    
  }

  /**
   * Deal with error raise
   * @param {*} method 
   * @param {*} error 
   */
  errorHandler(method, error) {

    if (this.isObject(error)) {
      error = JSON.stringify(error);
    }

    const message = `[Soreto Cookie Jam] - method: ${method} | Error: ${error}`;

    if (this.throwOnError) {
      throw message;
    } else {
      console.error(message);
    }
  }

  /**
   * Save value
   * @param {*} decodedData
   */
  save(decodedData, commit) {

    this.cookieState = decodedData;

    if(commit === true || this.options.autoCommit === true){
      this.commit();
    }
  }

  /**
   * Set cookie state on Express JS response
   */
  commit() {

    // build main cookie option
    const options = {
      expires: _moment().add(_defaultExpirationDays, 'days').toDate(),
      signed: false
    };
  
    // was defined a domain?
    if (this.options.domain) {
      options.domain = this.options.domain;
    }
  
    // was defined same site
    if(this.options.sameSite){
      options.sameSite = this.options.sameSite;
      options.secure = this.options.secure;
    }
  
    // encode data to base 64 if configured to
    let dataOnCookie = this.options.useBase64 == true
      ? this.encodeToBase64(this.cookieState)
      : this.cookieState;
  
    // let Express JS do the work!
    this.res.cookie(this.options.cookieName, dataOnCookie, options);
  }
}

module.exports = SoretoCookieJam;