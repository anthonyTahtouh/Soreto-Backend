const AbstractPromiseService = require('./AbstractPromiseService');

const _ = require('lodash');
const db = require('../db_pg');
const dbError = require('../common/dbError');
const dbQuery = require('../common/dbQuery');
class CountryCodeService extends AbstractPromiseService {

  constructor() {
    super('reverb.country_code_js');
  }

  getAgg(filter, query) {

    let select = db('reverb.country_code_js')
      .leftJoin('reverb.client', 'clientId', 'reverb.client._id')
      .leftJoin('reverb.country', 'countryId', 'reverb.country._id')
      .where(filter);
    let selectCount = select.clone();

    let queryPage = select.select(['reverb.country_code_js.*',
      'reverb.country.name as countryName' ,
      'reverb.client.name as clientName']);
    let queryCount = selectCount.count('*');

    let count = new Promise((resolve, reject)=>{

      const queryForCount = _.omit(query,['$offset','$sort','$limit']);
      dbQuery(queryCount, queryForCount)
        .then( (count) => {
          resolve(_.isEmpty(count) ? 0 : count[0]['count'] );
        })
        .catch( (err) => {
          reject(err);
        });
    });

    let page = new Promise((resolve, reject)=>{

      dbQuery(queryPage, query)
        .then( (row) => {
          resolve(_.isEmpty(row) ? [] : row);
        })
        .catch( (err) => {
          reject(err);
        });
    });

    return new Promise((resolve,reject)=>{
      Promise.all([page, count])
        .then((values) => {
          resolve({
            page:values[0],
            totalCount:values[1]
          });
        }).catch((err) => {
          reject(dbError(err, 'reverb.country_code_js'));
        });
    });
  }
}

const countryCodeService =  new CountryCodeService();

module.exports = countryCodeService;