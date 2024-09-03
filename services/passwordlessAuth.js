var moment = require('moment');
var db = require('../db_pg');
var envConfig = require('../config/config');
var logger = require('../common/winstonLogging');
var mandrillApi = require('../microservices/send-email/external-services/mandrill-api');

/**
 *
 * PUBLIC METHODS
 *
 */

/**
 * Generates a random passwordless token
 *
 * @param {*} userId
 * @param {*} config
 * @returns
 */
const createToken = async (userId, config) => {

  //
  // validate inputs
  //
  if(!userId){
    throw `The parameter 'userId' is required`;
  }
  if(!config || !config.type){
    throw `The 'config' field is required and must contain the fields ['config']`;
  }

  // Create token
  const createdToken = generateKey(config.type);

  // Calc expiration
  const expiresAt = calcExpiration(config.type);

  try {

    //
    // Store a new token
    //
    await db('passwordless_token_js').insert({
      userId,
      expiresAt,
      type: config.type,
      token: createdToken
    });

    // TODO:
    // consider cleanup repeated register to the same type and user

  } catch (error) {
    logger.error(`An error happened trying to create an auth token ${config.type}`, error);

    throw error;
  }

  return {send : send(createdToken), token: createdToken};

};

/**
 * Validates if a token is valid
 * @param {*} userId
 * @param {*} token
 * @returns
 */
const validToken = async (userId, token) => {

  try {
    // search for a correspondence
    let match = await db('passwordless_token_js')
      .select()
      .where({
        userId,
        token
      })
      .andWhere('expiresAt', '>' , moment().utc())
      .first();

    if (match != null){
      // delete
      await db('passwordless_token_js').delete().where({
        _id : match._id
      });
    }

    return match != null;
  } catch (error) {
    logger.error(`An error happened trying validate an auth token`, error);

    throw error;
  }
};

/**
 *
 * @param {*} createdToken
 * @returns
 */
const send = (createdToken) => {

  // this is the method that will be exposed after the 'createToken' execution
  return (via, config) => {

    // initialize category in case of null.
    if(!config) config={};

    config.passwordlessToken = createdToken;
    return deliveryMethods[via].send(config);
  };
};


//
// EXPORTS
//
module.exports = {
  createToken, validToken
};

/**
 *
 * PUBLIC METHODS: END
 *
 */


/**
 *
 * PRIVATE METHODS
 *
 */


/**
 * ALGORYTHIMS
 */
const algorithms = {
  simpleSixNumbers: {
    generateToken: ()=> {
      return Math.random().toString().slice(2, 8);
    }
  },
  magicLinkLike: {
    generateToken: ()=> {
      return 'fds7899fhspbnvpçins8g9çf';
    }
  }
};

const generateKey = (type) => {
  return algorithms[type].generateToken();
};


/**
 * EXPIRATION
 */
const expiration = {
  simpleSixNumbers: {
    momentRange: '10 m', // TODO: turn it into env configuration
  },
  magicLinkLike: {
    momentRange: '5 days'
  }
};

const calcExpiration = (type) => {
  let values = expiration[type].momentRange.split(' ');
  return moment().utc().add(values[0], values[1]).toString();
};

/**
 *
 * DELIVERY
 *
 */

const deliveryMethods = {
  email: {
    send: async (config)=> {

      if (!envConfig.MAIL.ENABLED) return;

      try {

        var data = {};
        data.templateName = envConfig.MAIL.TEMPLATES.PASSWORDLESS_AUTH_MARKETPLACE;
        data.toEmail = config.emailTo;
        data.subject = `Here's your verification code`;
        data.fromName = 'Soreto';
        data.fromEmail ='support@soreto.com';
        data.variables = {
          PSWL_TOKEN: config.passwordlessToken
        };

        await mandrillApi.send(data);
      } catch (error) {
        logger.error('MAIL FAIL: %s', error);
      }
    }
  },
  whatsApp: {
    send: async ()=> {
      // TODO
    }
  },
  sms: {
    send: async ()=> {
      // TODO
    }
  }
};


/**
 *
 * DELIVERY: END
 *
 */

/**
 *
 * PRIVATE: END
 *
 */