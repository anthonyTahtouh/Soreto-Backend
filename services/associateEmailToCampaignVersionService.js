const _ = require('lodash');
const AbstractPromiseService = require('./AbstractPromiseService');
const db = require('../db_pg');
const dbError = require('../common/dbError');
const utilities = require('../common/utility');

class AssociateEmailToCampaignVersionService extends AbstractPromiseService {

  constructor() {
    super('agg_assoc_join_campaign_versions_email_templates_js');
  }

  create(obj) {
    return new Promise((resolve,reject)=>{
      db('assoc_campaigns_email_templates_js')
        .returning('*')
        .insert(obj)
        .then(function (response) {
          resolve(response[0]);
        })
        .catch( (err) => {
          reject(dbError(err, `Error to call 'create' into assoc_campaigns_email_templates_js`));
        });
    });
  }

  update(id, payload) {
    return new Promise((resolve, reject) => {
      db('assoc_campaigns_email_templates_js')
        .returning('*')
        .where({
          _id: id
        })
        .update(utilities.prepareJson(payload))
        .then( (rows) => {
          return _.isEmpty(rows) ? resolve() : resolve(rows[0]);
        })
        .catch( (err) =>{
          reject(dbError(err, `Error to call 'update' into assoc_campaigns_email_templates_js`));
        });
    });
  }

  delete(id) {
    return new Promise((resolve,reject)=>{
      db('assoc_campaigns_email_templates_js')
        .returning('*')
        .where({
          emailTemplateId: id
        })
        .del()
        .then( () => {
          resolve({success: true});
        })
        .catch( (err) => {
          reject(dbError(err, `Error to call 'delete' data from assoc_campaigns_email_templates_js`));
        });
    });
  }

}

const associateEmailToCampaignService =  new AssociateEmailToCampaignVersionService();

module.exports = associateEmailToCampaignService;