const AbstractCrudInterface = require('./CrudInterface');
const userSegmentationScorePool = require('./userSegmentationPoolGroup');
var db = require('../db_pg');
const dbError = require('../common/dbError');
const _ = require('lodash');

class UserSegmentationPool extends AbstractCrudInterface {
  constructor() {
    super('user_segmentation_pool');
  }

  async create(payload) {

    const newUserSegmentationPoolData = _.omit(payload, ['userSegmentationIds']);

    // Create a new user segmentation pool record, letting the database handle _id generation
    const newUserSegmentationPoolRow = await super.create(newUserSegmentationPoolData);

    // Create associations with userSegmentationIds
    for (const segmentationId of payload.userSegmentationIds) {
      await userSegmentationScorePool.create({
        user_segmentation_pool_id: newUserSegmentationPoolRow._id,
        user_segmentation_id: segmentationId,
        rank: 0,
      });
    }

    return newUserSegmentationPoolRow;
  }

  async update(id, payload) {
    const updateUserSegmentationPoolData = _.omit(payload, ['userSegmentationIds']);

    // Update the user segmentation pool record with the new data
    const updatedUserSegmentationPoolRow = await super.update(id, updateUserSegmentationPoolData);

    // Remove old associations
    await userSegmentationScorePool.deleteByUserSegmentationPoolId(id);

    // Create new associations
    for (const segmentationId of payload.userSegmentationIds) {
      await userSegmentationScorePool.create({
        user_segmentation_id: segmentationId,
        user_segmentation_pool_id: id,
        rank: 0,
      });
    }

    return updatedUserSegmentationPoolRow;
  }

  async delete(id) {
    const attached = await this.isAttachedToCampaign(id);
    if (attached.length > 0 ) {
      throw ({ message: 'USER_SEGMENTATION_ATTACHED_CAMPAIGN', name: attached[0].description });
    }

    await userSegmentationScorePool.deleteByUserSegmentationPoolId(id);
    return super.delete(id);
  }

  async getAggregatedPage(query) {
    return this.getPage({}, query, ['name', 'description'], 'reverb.agg_user_segmentation_pool_js');
  }

  async getById(id) {
    try {

      const row = await db('agg_user_segmentation_pool_js').where({
        id: id
      }).first();
      return row;
    } catch (err) {
      return dbError(err, 'User Segmentation pool');

    }
  }

  async isAttachedToCampaign(id) {
    const query = db('campaign')
      .where('user_segmentation_pool_id', id);
    const results = await query;
    return results;
  }

  async isAttachedToSegmentation(id) {
    const query = db('user_segmentation_pool_group')
      .where('user_segmentation_pool_id', id);
    const results = await query;
    return results;
  }

  pick(obj) {
    return _.pick(obj, [
      'name',
      'description',
      'client_id',
      'userSegmentationIds',
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
}

let userSegmentationPool = new UserSegmentationPool();

module.exports = userSegmentationPool;
