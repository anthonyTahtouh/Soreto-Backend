const AbstractPromiseService = require('./AbstractPromiseService');
class AffiliateService extends AbstractPromiseService {

  constructor() {
    super('reverb.email_template_type_js');
  }

}

const affiliateService =  new AffiliateService();

module.exports = affiliateService;