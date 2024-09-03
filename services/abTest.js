const AbstractCrudInterface = require('./CrudInterface');
const abTestCampaignVersion = require('./abTestCampaignVersion');
const _ = require('lodash');
var db = require('../db_pg');
var dbQuery = require('../common/dbQuery');
var dbError = require('../common/dbError');

class AbTest extends AbstractCrudInterface {
  constructor() {
    super('reverb.ab_test');
  }

  async create(payload) {
    const { name, description, startDate, endDate, type, responsibleUserIds, campaignVersionIds, kpis } = payload;

    const newAbTestRow = await super.create({
      name,
      description,
      start_date: startDate,
      end_date: endDate,
      type,
      responsible_user_ids: responsibleUserIds,
      kpis,
    });

    const abTestId = newAbTestRow._id;
    if (campaignVersionIds && campaignVersionIds.length > 0) {
      for (const campaignVersionId of campaignVersionIds) {
        await abTestCampaignVersion.create({
          ab_test_id: abTestId,
          campaign_version_id: campaignVersionId,
        });
      }
    }

    return newAbTestRow;
  }

  async update(id, payload) {
    const { name, description, startDate, endDate, type, responsibleUserIds, campaignVersionIds, kpis } = payload;

    // Update the AB Test row
    const updatedAbTestRow = await super.update(id, {
      name,
      description,
      start_date: startDate,
      end_date: endDate,
      type,
      responsible_user_ids: responsibleUserIds,
      kpis,
      updated_at: new Date(),
    });

    // Check if the updatedAbTestRow is not empty
    if (!updatedAbTestRow || updatedAbTestRow.length === 0) {
      throw new Error(`No record found for the ID: ${id}`);
    }

    // Remove old associations and create new ones
    await abTestCampaignVersion.deleteByAbTestId(id);
    for (const campaignVersionId of campaignVersionIds) {
      await abTestCampaignVersion.create({
        ab_test_id: id,
        campaign_version_id: campaignVersionId,
      });
    }

    return updatedAbTestRow;
  }

  async delete(id) {
    await abTestCampaignVersion.deleteByAbTestId(id);
    return super.delete(id);
  }

  async getById(id) {
    let query = db('agg_ab_test_js')
      .first()
      .where('_id', id);
    return query;
  }

  async getPage(filter, query, searchBy = null) {

    try {
      const queryForCount = _.omit(query,['$offset','$sort','$limit']);
      const dbObj = db('reverb.agg_ab_test_js');
      const dbObjCount = dbObj.count('*').where(filter);
      let count =  await dbQuery(dbObjCount, queryForCount, searchBy);

      let page = db('reverb.agg_ab_test_js').returning('*');

      page = await dbQuery(page, query, searchBy);
      return {
        page: page,
        totalCount: (count && count.length > 0) ? count[0].count : null
      };

    } catch (error) {
      throw dbError(error, `Error to call 'select' into ${this.viewName}`);
    }
  }
}

let abTest = new AbTest();

module.exports = abTest;
