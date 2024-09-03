const AbstractCrudInterface = require('./CrudInterface');

var db = require('../db_pg');
var dbError = require('../common/dbError');

class mpRank extends AbstractCrudInterface {
  constructor() {
    super('');
  }
  async getLatestRank(rankName) {

    try {
      let tableName = '';
      let fields = 'trendingIndex';
      let orderBy = 'trendingIndex';

      switch(rankName){
      case 'brand':
        tableName = 'mp_brand_js';
        break;
      case 'offer':
        tableName = 'mp_offer_js';
        break;
      case 'categories':
        tableName = 'mp_category_js';
        fields = ['showHeaderMenuIndex', 'showTabPanelMenuIndex', 'showCategoryMenuIndex', 'showFooterMenuIndex'];
        orderBy = 'showHeaderMenuIndex';
        break;
      case 'blogs':
        tableName = 'mp_blog_js';
        break;
      default:
        throw 'Invalid database name';
      }


      let result = await db(tableName)
        .select(fields)
        .orderBy(orderBy, 'desc')
        .first();
      return result;


    } catch (error) {
      throw dbError(error, `Error to call 'rank' into ${this.viewName}`);
    }
  }
}

const mpRankService = new mpRank();

module.exports = mpRankService;