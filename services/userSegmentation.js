const AbstractCrudInterface = require('./CrudInterface');
const userSegmentationScoreGroup = require('./userSegmentationScoreGroup');
var db = require('../db_pg');
const httpCodes = require('http2').constants;

class UserSegmentation extends AbstractCrudInterface {
  constructor() {
    super('reverb.user_segmentation');
  }

  async create(payload) {
    const { name, description, client_id, userSegmentationScoreIds } = payload;

    // Ensure 'name' is a string
    if (typeof name !== 'string') {
      throw new Error('Invalid name format');
    }

    // Ensure 'userSegmentationScoreIds' is an array and has at least one score
    if (!Array.isArray(userSegmentationScoreIds) || userSegmentationScoreIds.length === 0) {
      throw {
        statusCode: httpCodes.HTTP_STATUS_BAD_REQUEST,
        friendlyMessage: 'USER_SEGMENTATION_REQUERIES_SCORE',
        details: { name, description, client_id, userSegmentationScoreIds }
      };
    }

    // Check for uniqueness of 'name'
    const duplicated = await this.checkUnique({ name }, ['name'], 'USER_SEGMENTATION_DUPLICATED_NAME', 'The Segmentation cannot be created because this name already exists');

    // Throw an error if there are any duplicated rows (Changed code )
    if (duplicated && duplicated.length > 0) {
      throw {
        statusCode: httpCodes.HTTP_STATUS_CONFLICT,
        friendlyMessage: 'The Segmentation cannot be created because this name already exists'
      };
    }

    // Define the new segmentation data without explicitly setting _id
    const newUserSegmentationData = {
      name,
      description: description,
      client_id: client_id
    };

    // Create a new segmentation record, letting the database handle _id generation
    const newUserSegmentationRow = await super.create(newUserSegmentationData);

    // Create associations with userSegmentationScoreIds
    for (const scoreId of userSegmentationScoreIds) {
      await userSegmentationScoreGroup.create({
        user_segmentation_id: newUserSegmentationRow._id,
        user_segmentation_score_id: scoreId,
      });
    }

    return newUserSegmentationRow;
  }

  async update(id, payload) {
    const { name, description, client_id, userSegmentationScoreIds } = payload;

    // Ensure 'name' is a string
    if (typeof name !== 'string') {
      throw new Error('Invalid name format');
    }

    // Ensure 'userSegmentationScoreIds' is an array and has at least one score (Changed code)
    if (!Array.isArray(userSegmentationScoreIds) || userSegmentationScoreIds.length === 0) {
      throw {
        statusCode: httpCodes.HTTP_STATUS_BAD_REQUEST,
        friendlyMessage: 'USER_SEGMENTATION_REQUERIES_SCORE',
        details: { name, description, client_id, userSegmentationScoreIds }
      };
    }

    // Get the existing segmentation
    const existingSegmentation = await this.getById(id);

    // Check if the name is different from the existing name, and ensure it's unique
    if (existingSegmentation.name !== name) {
      const duplicated = await this.checkUnique({ name }, ['name'], 'USER_SEGMENTATION_DUPLICATED_NAME', 'The Segmentation cannot be updated because this name already exists');

      // Throw an error if there are any duplicated rows (Changed code)
      if (duplicated && duplicated.length > 0) {
        throw {
          statusCode: httpCodes.HTTP_STATUS_CONFLICT,
          friendlyMessage: 'The Segmentation cannot be updated because this name already exists'
        };
      }
    }

    // Update the segmentation record
    const updatedUserSegmentationData = {
      name,
      description: description,
      client_id: client_id,
      updated_at: new Date()
    };

    // Update the user segmentation record with the new data
    const updatedUserSegmentationRow = await super.update(id, updatedUserSegmentationData);

    // Remove old associations
    await userSegmentationScoreGroup.deleteByUserSegmentationId(id);

    // Create new associations
    for (const scoreId of userSegmentationScoreIds) {
      await userSegmentationScoreGroup.create({
        user_segmentation_id: id,
        user_segmentation_score_id: scoreId,
      });
    }

    return updatedUserSegmentationRow;
  }

  async delete(id) {
    const attached = await this.isAttachedToPool(id);
    if (attached) {
      throw new Error('USER_SEGMENTATION_ATTACHED');
    }

    await userSegmentationScoreGroup.deleteByUserSegmentationId(id);
    return super.delete(id);
  }

  async getById(id) {
    let query = db('agg_user_segmentation_js')
      .first()
      .where('id', id);
    return query;
  }

  async getAggregatedPage(query) {
    return this.getPage({}, query, ['name', 'description'], 'reverb.agg_user_segmentation_js');
  }

  async isAttachedToPool(id) {
    const query = db('user_segmentation_pool_group')
      .where('user_segmentation_id', id);
    const results = await query;
    return results && results.length > 0;
  }
}

let userSegmentation = new UserSegmentation();

module.exports = userSegmentation;
