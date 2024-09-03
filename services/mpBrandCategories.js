const AbstractCrudInterface = require('./CrudInterface');
const _ = require('lodash');

class MpBrandCategories extends AbstractCrudInterface {

  constructor() {
    super('reverb.mp_brand_category_js');
  }

  pick(obj) {
    return _.pick(obj,[
      'mpBrandId',
      'mpCategoryId'
    ]);
  }

  requiredProps() {
    return [
      'mpBrandId',
      'mpCategoryId'
    ];
  }

}

const mpBrandCateogries = new MpBrandCategories();

module.exports = mpBrandCateogries;