const logger = require('../../common/winstonLogging');

const pickExternalRewardId = async (params) => {

  // basic input validation
  if(!params || !params.partner || !params.strategy){

    return null;
  }

  // select the custom implementation
  let implementation = null;

  try {
    implementation = require(`../imp_partner/${params.partner}`);
  } catch (error) {
    logger.warn(`There's no Reward third party implementation defined to the partner: ${params.parter}`);
    return null;
  }

  const strategy = implementation[params.strategy];

  if(!strategy){
    logger.warn(`There's no Reward third party strategy defined to: ${params.strategy}`);
    return null;
  }

  return strategy(params);
};

module.exports = {
  pickExternalRewardId
};