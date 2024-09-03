const AbstractPromiseService = require('./AbstractPromiseService');

class ExternalOrderService extends AbstractPromiseService {

  constructor(){
    super('external_order_js');
  }
}

const service =  new ExternalOrderService();

module.exports = service;