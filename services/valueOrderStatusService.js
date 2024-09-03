const AbstractService = require('./AbstractService');

class ValueOrderStatusService extends AbstractService {
  constructor() {
    super('value_orderstatus_js');
  }
}

module.exports = new ValueOrderStatusService();
