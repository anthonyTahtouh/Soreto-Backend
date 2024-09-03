const AbstractCrudInterface = require('./CrudInterface');
const _ = require('lodash');

class MpFlashCampaign extends AbstractCrudInterface {

  constructor() {
    super('reverb.mp_flash_campaign_js');
  }

  checkUnique(obj, id){
    return super.checkUnique(obj, this.uniqueProps(), id);
  }

  pick(obj) {
    return _.pick(obj,[
      'name',
      'menuLabel',
      'title',
      'active',
      'description',
      'logoImageUrl',
      'coverImageUrl',
      'urlId',
      'startDate',
      'endDate',
      'descriptionMedium',
      'descriptionSmall',
      'meta',
      'backgroundColor'
    ]);
  }

  requiredProps() {
    return [
      'name',
      'menuLabel',
      'title',
      'active',
      'description',
      'urlId',
      'startDate',
      'endDate',
      'descriptionMedium',
      'descriptionSmall',
    ];
  }

  uniqueProps() {
    return [
      'name',
      'urlId',
    ];
  }
}

const mpFlashCampaign = new MpFlashCampaign();


module.exports = mpFlashCampaign;