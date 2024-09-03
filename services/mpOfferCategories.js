const AbstractCrudInterface = require('./CrudInterface');
const _ = require('lodash');

class MpOfferCategories extends AbstractCrudInterface {

  constructor() {
    super('reverb.mp_offer_category_js');
  }

  pick(obj) {
    return _.pick(obj,[
      'mpOfferId',
      'mpCategoryId'
    ]);
  }

  requiredProps() {
    return [
      'mpOfferId',
      'mpCategoryId'
    ];
  }

}

const mpBrandCateogries = new MpOfferCategories();

module.exports = mpBrandCateogries;