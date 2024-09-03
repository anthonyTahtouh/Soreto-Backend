const AbstractCrudInterface = require('./CrudInterface');

class AbTestCampaignVersion extends AbstractCrudInterface {
  constructor() {
    super('reverb.ab_test_campaign_version');
  }

  async deleteByAbTestId(abTestId) {
    const query = this.table().where('ab_test_id', abTestId).del();
    return query;
  }
}

let abTestCampaignVersion = new AbTestCampaignVersion();

module.exports = abTestCampaignVersion;
