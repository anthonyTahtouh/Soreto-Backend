const AbstractPromiseService = require('./AbstractPromiseService');

class LayoutService extends AbstractPromiseService {

  constructor() {
    super('reverb.agg_country_js');
  }

}

const layoutService =  new LayoutService();

module.exports = layoutService;