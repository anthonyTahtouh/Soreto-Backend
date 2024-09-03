const AbstractPromiseService = require('./AbstractPromiseService');

class CurrencyService extends AbstractPromiseService {

  constructor() {
    super('reverb.currency_js');
  }

}

const currencyService =  new CurrencyService();

module.exports = currencyService;