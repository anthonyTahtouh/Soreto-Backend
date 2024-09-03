const AbstractService = require('./AbstractService');

class EnvironmentService extends AbstractService {

  constructor() {
    super('environment_js');
  }

}

const environmentService =  new EnvironmentService();

module.exports = environmentService;