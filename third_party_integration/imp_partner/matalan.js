const axios = require('axios');
const utility = require('../../common/utility');
const logger = require('../../common/winstonLogging');
const config = require('../../config/config');

const pickUserRewardId = async (params) => {

  try {

    // basic validation
    if(!params.validationData || !params.validationData.userEmail){
      return null;
    }

    let hashedemail = utility.hashSHA256(params.validationData.userEmail.toLowerCase(), config.THIRD_PARTY_INTEGRATION.PARTNERS.MATALAN.ENCRYPT_SALT);

    let endpointUrl = `${config.THIRD_PARTY_INTEGRATION.PARTNERS.MATALAN.URI}/FunctionGetResponseByEmailHash?code=${config.THIRD_PARTY_INTEGRATION.PARTNERS.MATALAN.API_KEY}&hashedemail=${hashedemail}`;

    let requestConfig = {};

    // use proxy?
    if(config.THIRD_PARTY_INTEGRATION.PARTNERS.MATALAN.USE_PROXY === 'true'){
      requestConfig = {
        proxy: {
          host: config.THIRD_PARTY_INTEGRATION.PROXY.HOST,
          port: config.THIRD_PARTY_INTEGRATION.PROXY.PORT,
          auth: {
            username: config.THIRD_PARTY_INTEGRATION.PROXY.USERNAME,
            password: config.THIRD_PARTY_INTEGRATION.PROXY.PASSWORD
          }
        }
      };
    }

    let result =  await axios.get(endpointUrl, requestConfig);

    // endpoint result equals "zero" means it is a new user
    if(result.data != undefined && result.data == 0){
      return 'NEW_USER';
    }

    return 'OLD_USER';
  } catch (error) {

    console.error(error);
    logger.error(error);

    return null;
  }
};

module.exports = {
  pickUserRewardId
};