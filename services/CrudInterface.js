var db = require('../db_pg');
var dbError = require('../common/dbError');
var dbQuery = require('../common/dbQuery');

var msClientFanout = require('../common/senecaClientFanout');
const constants = require('../config/constants');

var _ = require('lodash');


class CrudInterface {

  constructor(_viewName){
    this.viewName = _viewName;
  }

  table(customViewName) {
    return db(customViewName || this.viewName);
  }

  async getById(id) {

    let result = await this.get({_id: id}, null);

    if(result && result.length > 0){
      return result[0];
    }

    return null;
  }

  async get(filter, query, fields = '*') {

    try {
      let select = this.table()
        .select(fields)
        .where(filter);

      return await dbQuery(select, query);

    } catch (error) {
      throw dbError(error, `Error to call 'get' data from ${this.viewName}`);
    }
  }

  async getPage(filter, query, searchBy = null, viewName = null) {

    try {

      const queryForCount = _.omit(query,['$offset','$sort','$limit']);
      const dbObjCount = this.table(viewName).count('*').where(filter);
      let count =  await dbQuery(dbObjCount,queryForCount, searchBy);

      let page = this.table(viewName).returning('*').where(filter);

      page = await dbQuery(page, query, searchBy);

      return {
        page: page,
        totalCount: (count && count.length > 0) ? count[0].count : null
      };

    } catch (error) {
      throw dbError(error, `Error to call 'select' into ${this.viewName}`);
    }
  }

  async getJoinedDataByFilter(filter, innerTable, innerTablePK, contraintFK) {

    try {

      let select = this.table()
        .returning('*')
        .where(filter)
        .innerJoin(innerTable, innerTablePK, contraintFK)
          ;

      return await dbQuery(select, null);

    } catch (error) {
      throw dbError(error, `Error to call 'get' data from ${this.viewName}`);
    }
  }

  async checkUnique(obj, fields, id) {

    let collisions = [];

    try {

      for(let field of fields){
        let select = this.table()
          .returning('*')
          .first();

        if(!Array.isArray(field)){
          select.where({[field]: obj[field]});
        }else {

          for(let item of field){
            select.andWhere({[item]: obj[item]});
          }
        }

        if(id){
          select.andWhere('_id', '!=', id);
        }

        let exists = await select;
        if(exists){
          collisions.push(field);
        }
      }

      return collisions;

    } catch (error) {
      throw dbError(error, `Error to call 'checkUnique' into ${this.viewName}`);
    }
  }

  /**
   *
   * CRUD
   *
   */

  async create(obj) {

    try {

      let tableInstance = this.table();

      let inserted = await tableInstance
        .returning('*')
        .insert(obj);

      let record = inserted[0];

      // notify change
      msClientFanout.client.act(constants.EVENTS.FANOUT.ENTITY_CHANGE, { entity: tableInstance._single.table, record: record });

      return record;

    } catch (error) {
      throw dbError(error, `Error to call 'create' into ${this.viewName}`);
    }
  }

  async update(id, payload) {

    try {

      if(payload.updatedAt){
        payload.updatedAt = new Date();
      }

      let tableInstance = this.table();

      let updated = await tableInstance
        .returning('*')
        .where({ _id: id })
        .update(payload);

      let record = (updated && updated.length > 0) ? updated[0] : {};

      // notify change
      msClientFanout.client.act(constants.EVENTS.FANOUT.ENTITY_CHANGE, { entity: tableInstance._single.table, record: record });

      return record;

    } catch (error) {
      throw dbError(error, `Error to call 'create' into ${this.viewName}`);
    }
  }

  async delete(id) {

    try {

      let filter = { _id: id };

      return await this.deleteByFilter(filter);

    } catch (error) {
      throw dbError(error, `Error to call 'delete' into ${this.viewName}`);
    }
  }

  async deleteByFilter(filter) {

    try {

      let tableInstance = this.table();

      let result = await tableInstance
        .delete()
        .where(filter);

      // if the deletion was based in a "id", notify the change
      if(filter && filter._id){
        // notify change
        msClientFanout.client.act(constants.EVENTS.FANOUT.ENTITY_CHANGE, { entity: tableInstance._single.table, record: filter, delete: true });
      }

      return (result == 1);

    } catch (error) {
      throw dbError(error, `Error to call 'delete' into ${this.viewName}`);
    }
  }

  /**
   *
   * END: CRUD
   *
   */
}

module.exports = CrudInterface;