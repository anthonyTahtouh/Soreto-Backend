const AbstractCrudInterface = require('./CrudInterface');
const _ = require('lodash');
const dbError = require('../common/dbError');
var db = require('../db_pg');
const httpCodes = require('http2').constants;

class UserSegmentationScore extends AbstractCrudInterface {

  constructor() {
    super('reverb.user_segmentation_score_js');
  }

  async getPage(filter, query, searchBy = null) {
    return await super.getPage(filter, query, searchBy, 'reverb.agg_user_segmentation_score_js');
  }

  async delete(id) {
    try {
      // verify if exists any score
      const userSegmentationScore = await this.countSegmentationScoreGroup(id);

      // if have some error notify 'this score can't be delete because there are Segmentation it'
      if (userSegmentationScore && userSegmentationScore.length > 0 && userSegmentationScore[0].count > 0) {
        throw { statusCode: httpCodes.HTTP_STATUS_CONFLICT, friendlyMessage: 'The Score cannot be deleted because it is attached to one or more Segmentation.' };
      }

      await super.delete(id);
      return true;
    }
    catch (error) {
      throw dbError(error, `Error to call 'delete' into ${this.viewName}`);
    }
  }

  pick(obj) {
    return _.pick(obj, [
      'name',
      'description',
      'type',
      'clientId',
      'expression',
    ]);
  }

  requiredProps() {
    return [
      'name',
    ];
  }

  checkUnique(obj, id){
    return super.checkUnique(obj, this.uniqueProps(), id);
  }

  uniqueProps() {
    return [
      ['name'],
    ];
  }

  async countSegmentationScoreGroup (userSegmentationScoreId) {

    // TODO: Wescley
    // The code bellow can be achieved using db.count

    return db.
      select(db.raw('count(ussg."_id")')).
      from('user_segmentation_score_group as ussg').
      where({'ussg._id': userSegmentationScoreId});
  }
}

const userSegmentationScore = new UserSegmentationScore();

module.exports = userSegmentationScore;
