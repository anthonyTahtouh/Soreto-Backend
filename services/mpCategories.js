const AbstractCrudInterface = require('./CrudInterface');
const _ = require('lodash');

class mpCategories extends AbstractCrudInterface {

  constructor() {
    super('reverb.mp_category_js');
  }

  checkUnique(obj, id){
    return super.checkUnique(obj, this.uniqueProps(), id);
  }

  pick(obj) {
    return _.pick(obj,[
      'name',
      'staticId',
      'urlId',
      'active',
      'showHeaderMenuIndex',
      'showOnHeaderMenu',
      'showTabPanelMenuIndex',
      'showOnTabPanelMenu',
      'showCategoryMenuIndex',
      'showOnCategoryMenu',
      'showFooterMenuIndex',
      'showOnFooterMenu',
      'meta',
    ]);
  }

  requiredProps() {
    return [
      'name',
      'staticId',
      'urlId',
      'active',
      'showHeaderMenuIndex',
      'showOnHeaderMenu',
      'showTabPanelMenuIndex',
      'showOnTabPanelMenu',
      'showCategoryMenuIndex',
      'showOnCategoryMenu',
      'showFooterMenuIndex',
      'showOnFooterMenu',
    ];
  }

  uniqueProps() {
    return [
      'name',
      'staticId',
      'urlId',
      'showHeaderMenuIndex',
      'showTabPanelMenuIndex',
      'showCategoryMenuIndex',
      'showFooterMenuIndex'
    ];
  }

}

const mpCategoriesService =  new mpCategories();

module.exports = mpCategoriesService;