var db = require('../db_pg');
var dbError = require('../common/dbError');
class TypeValuesService {

  constructor(){
  }

  getValues(type, cb) {
    var query = `select reverb.agg_type_values_js('${type}') as value`;
    db.raw(query)
      .then(function(rows){
        if(rows){
          var result = rows.rows.map(x => ({ type: type, value: x.value}));
          return cb(null,result);
        }
      })
      .catch(function (err) {
        return cb(dbError(err, 'Type Values'));
      });
  }
}

module.exports = TypeValuesService;
