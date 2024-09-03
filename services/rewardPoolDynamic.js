const AbstractCrudInterface = require('./CrudInterface');
var db = require('../db_pg');
var dbError = require('../common/dbError');
var dbQuery = require('../common/dbQuery');

class RewardPoolDynamicService extends AbstractCrudInterface {
  constructor() {
    super('agg_reward_pool_dynamic_js');
  }

  async getById(dynamicRewardPoolId) {
    try {

      const row = await db('agg_reward_pool_dynamic_items_js').where({
        _id: dynamicRewardPoolId
      }).first();
      return row;
    } catch (err) {
      return dbError(err, 'Dynamic reward pool');

    }
  }

  async getByIdWithNoJoin(dynamicRewardPoolId) {
    try {

      const row = await db('reward_pool_dynamic').where({
        _id: dynamicRewardPoolId
      }).first();
      return row;
    } catch (err) {
      return dbError(err, 'Dynamic reward pool');

    }
  }

  async create(obj) {

    try {
      const { clientId, name } = obj;
      let dRPId = '';
      if (clientId && name) {
        dRPId = await db('reward_pool_dynamic')
          .returning('_id')
          .insert({
            client_id: clientId,
            name,
            friend_pre_reward_group_id: null,
            friend_post_reward_group_id: null,
            sharer_post_reward_group_id: null,
            sharer_pre_reward_group_id: null,
          });

      }

      return dRPId;

    } catch (error) {
      throw dbError(error, `Error to call 'create' into dynamic reward pool`);
    }
  }

  async update(dynamicRewardPoolId, payload) {
    try {
      const { name, friend_pre_reward_group_id, friend_post_reward_group_id, sharer_post_reward_group_id, sharer_pre_reward_group_id } = payload;
      const updatedAt = new Date();


      let updated = await db('reward_pool_dynamic')
        .returning('*')
        .where({ _id: dynamicRewardPoolId })
        .update({ name, updated_at: updatedAt, friend_pre_reward_group_id, friend_post_reward_group_id, sharer_post_reward_group_id, sharer_pre_reward_group_id });

      return (updated && updated.length > 0) ? updated[0] : {};

    } catch (error) {
      throw dbError(error, `Error to call 'update' into dynamic reward pool}`);
    }
  }

  async createRewardGroup(obj) {

    try {
      const { clientId, name } = obj;
      let item = '';
      if (clientId && name) {
        item = await db('reward_group')
          .returning('_id')
          .insert({
            client_id: clientId,
            name
          });

      }

      return (item && item.length > 0) ? item[0] : {};

    } catch (error) {
      throw dbError(error, `Error to call 'create' into reward group`);
    }
  }

  async createRewardGroupItem(obj) {

    try {
      const { rewardGroupId, reward_id, alias, rules, active, visible } = obj;
      let updated = '';
      const item = {
        group_id: rewardGroupId,
        reward_id,
        alias,
        rules,
        active,
        visible
      };
      if (rewardGroupId && reward_id) {
        updated = await db('reward_group_item')
          .returning('*')
          .insert(item);

      }

      return (updated && updated.length > 0) ? updated[0] : {};

    } catch (error) {
      throw dbError(error, `Error to call 'create' into reward group item`);
    }
  }

  async updateRewardGroupItem(obj, rewardPoolDynamicItemId) {

    try {
      const { reward_id, alias, rules, active, visible } = obj;
      let rewardGroupItem = '';
      if (rewardPoolDynamicItemId) {
        rewardGroupItem = await db('reward_group_item')
          .returning('*')
          .where({ _id: rewardPoolDynamicItemId })
          .update({
            reward_id,
            alias,
            rules,
            active,
            visible
          });

      }

      return rewardGroupItem;

    } catch (error) {
      throw dbError(error, `Error to call 'update' into reward group item`);
    }
  }

  async deleteRewardGroupItem(rewardPoolDynamicItemId) {

    try {
      let result;
      if (rewardPoolDynamicItemId) {
        result = await db('reward_group_item')
          .delete()
          .where({ _id: rewardPoolDynamicItemId });

      }

      return result === 1;

    } catch (error) {
      throw dbError(error, `Error to call 'delete' into reward group item`);
    }
  }

  async validateDelete(rewardPoolDynamicId) {
    /* -------------Check if the reward pool dynamic is being used by a campaing version  ----------------------*/

    const campaignVersionFromRPDId = async (rewardPoolDynamicId) => {
      try {
        let select = db('campaign_version_js').where({
          'campaign_version_js.rewardPoolDynamicId': rewardPoolDynamicId,
        });
        return await dbQuery(select, null);
      } catch (error) {
        throw dbError(error, `Error to call 'get' data from ${this.viewName}`);
      }
    };

    const arrayOfCampaignVersions = await campaignVersionFromRPDId(
      rewardPoolDynamicId
    );

    if (arrayOfCampaignVersions && arrayOfCampaignVersions.length > 0) {
      const campaingVersionId = arrayOfCampaignVersions[0]._id;

      throw Error(
        `The Dynamic Reward Pool cannot be deleted because it is attached to a Campaign Version: ${campaingVersionId}`
      );
    }

    /* -------------Check if one of the reward groups is being used by another reward pool -------------------- */

    // 1. Get the all the reward groups from the reward pool to be deleted
    let rDPToBeDeletedGroups = [];
    try {
      let rPDToBeDeleted = await db('reward_pool_dynamic_js').where({
        'reward_pool_dynamic_js._id': rewardPoolDynamicId,
      });

      if (rPDToBeDeleted[0].sharerPreRewardGroupId)
        rDPToBeDeletedGroups.push(rPDToBeDeleted[0].sharerPreRewardGroupId);
      if (rPDToBeDeleted[0].sharerPostRewardGroupId)
        rDPToBeDeletedGroups.push(rPDToBeDeleted[0].sharerPostRewardGroupId);
      if (rPDToBeDeleted[0].friendPreRewardGroupId)
        rDPToBeDeletedGroups.push(rPDToBeDeleted[0].friendPreRewardGroupId);
      if (rPDToBeDeleted[0].friendPostRewardGroupId)
        rDPToBeDeletedGroups.push(rPDToBeDeleted[0].friendPostRewardGroupId);
    } catch (error) {
      throw dbError(error, `Error to call 'get' data from ${this.viewName}`);
    }

    // 2. Get all the rewards groups from the others reward pools

    let rDPOthersGroups;
    try {
      rDPOthersGroups = await db('reward_pool_dynamic_js')
        .whereNot({
          _id: rewardPoolDynamicId,
        })
        .andWhere((result) => {
          result
            .whereIn('sharerPreRewardGroupId', rDPToBeDeletedGroups)
            .orWhereIn('sharerPostRewardGroupId', rDPToBeDeletedGroups)
            .orWhereIn('friendPreRewardGroupId', rDPToBeDeletedGroups)
            .orWhereIn('friendPostRewardGroupId', rDPToBeDeletedGroups);
        });
    } catch (error) {
      throw dbError(
        error,
        `Error to call 'get' data from reward_pool_dynamic_js`
      );
    }

    if (rDPOthersGroups && rDPOthersGroups.length > 0) {
      throw Error(
        'The Dynamic Reward Pool cannot be deleted because one of its groups is being shared to another one. Please contact the support.'
      );
    }
  }

  async deleteRPD(rewardPoolDynamicId) {
    // Delete all the reward_group_item related to the reward_group related to the reward_pool_dynamic

    // 1. Get the all the reward groups from the reward pool to be deleted
    let rDPToBeDeletedGroups = [];
    try {
      let rPDToBeDeleted = await db('reward_pool_dynamic_js').where({
        'reward_pool_dynamic_js._id': rewardPoolDynamicId,
      });

      if (rPDToBeDeleted[0].sharerPreRewardGroupId)
        rDPToBeDeletedGroups.push(rPDToBeDeleted[0].sharerPreRewardGroupId);
      if (rPDToBeDeleted[0].sharerPostRewardGroupId)
        rDPToBeDeletedGroups.push(rPDToBeDeleted[0].sharerPostRewardGroupId);
      if (rPDToBeDeleted[0].friendPreRewardGroupId)
        rDPToBeDeletedGroups.push(rPDToBeDeleted[0].friendPreRewardGroupId);
      if (rPDToBeDeleted[0].friendPostRewardGroupId)
        rDPToBeDeletedGroups.push(rPDToBeDeleted[0].friendPostRewardGroupId);
    } catch (error) {
      throw dbError(error, `Error to call 'get' data from ${this.viewName}`);
    }

    // 2. Delete the reward_group_items related to the reward pool dynamic

    try {
      await db('reward_group_item_js')
        .whereIn('groupId', rDPToBeDeletedGroups)
        .delete();
    } catch (error) {
      console.warn(`We could not delete all the rewards groups items`);
    }

    // 3. Delete the Reward Pool Dynamic Group (Needs to be first since there is relation to groupś)
    try {
      await db('reward_pool_dynamic_js')
        .delete()
        .where({ _id: rewardPoolDynamicId });
    } catch (error) {
      console.log(
        `There is no pool dynamic with this Id:${rewardPoolDynamicId}`
      );
    }

    // 4. Delete the reward_group related to the reward pool dynamic
    try {
      await db('reward_group_js').whereIn('_id', rDPToBeDeletedGroups).delete();
    } catch (error) {
      console.warn(`We could not delete all the rewards groups`);
    }
  }

  async delete(rewardPoolDynamicId) {
    //verify if the reward pool dynamic exists
    let rewardPoolDynamic;
    try {
      rewardPoolDynamic = await db('reward_pool_dynamic_js')
        .returning('*')
        .where({ _id: rewardPoolDynamicId });
    } catch (error) {
      throw new Error(error);
    }

    if (!rewardPoolDynamic || rewardPoolDynamic.length === 0) {
      throw new Error(
        `There is no reward group with this Id:${rewardPoolDynamicId}`
      );
    }

    await this.validateDelete(rewardPoolDynamicId);

    await this.deleteRPD(rewardPoolDynamicId);

    return rewardPoolDynamic;
  }
}

const rewardPoolDynamicService = new RewardPoolDynamicService();

module.exports = rewardPoolDynamicService;
