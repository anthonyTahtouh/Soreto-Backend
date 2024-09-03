var _ = require('lodash');
var knex = require('knex')({
  client: 'pg'
});

var dbOriginal = require('../db_pg');

module.exports = function (db, query, ftFields, count) {

  _.each(query, function (value, key) {
    // If query param does not appear to be relevant, skip
    if (key.indexOf('$') === -1) {
      return;
    }

    if (key === '$offset') {
      db = db.offset(value);
      return;
    }

    if (key === '$limit') {
      db = db.limit(value);
      return;
    }

    // Build full text search
    if (key === '$search') {
      _.each(value.split(';'), function (val) {
        db = db.where(function () {
          var inner = this;
          _.each(ftFields, (field) => {
            if(field.includes('::money') ){
              inner.orWhere(knex.raw(` trunc(${field.split('::').shift()},2)::varchar like ?`,`%${val}%`));
            } else if (field.indexOf('->') > -1) {
              inner.orWhere(knex.raw(field + ' ilike ?',`%${val}%`));
            } else {
              inner.orWhere(knex.raw('"' + field + '" ilike ?',`%${val}%`));
            }
          });
        });
      });
    }

    if (key === '$sort') {
      if (value instanceof Array){
        _.forEach(value , function(query){
          var direction = query.indexOf('-') === 0 ? 'desc' : 'asc';
          db = db.orderBy(query.replace(/-/g, ''), direction);
        });
      }else{
        var direction = value.indexOf('-') === 0 ? 'desc' : 'asc';
        db = db.orderBy(value.replace(/-/g, ''), direction);
      }
      return;
    }

    var split = key.split('_$');
    var column = split[0].replace(/\$/g, '');
    if (key.split('_$')[1] === 'null') {
      db = db.whereNull(column);
      return;
    }

    if (key.split('_$')[1] === 'notNull') {
      db = db.whereNotNull(column);
      return;
    }

    // Get operator for query
    if (key.indexOf('_$') > -1) {
      // Get column name from key
      var operator;

      switch (split[1]) {
      case 'eq':
        operator = '=';
        break;
      case 'gt':
        operator = '>';
        break;
      case 'lt':
        operator = '<';
        break;
      case 'gte':
        operator = '>=';
        break;
      case 'lte':
        operator = '<=';
        break;
      case 'like':
        operator = 'like';
        break;
      default:
        operator = '=';
        break;
      }

      db = db.where(column, operator, value);
    }
  });

  if(count) {
    db = dbOriginal(knex.raw('(' + db.toString() + ') innerQuery')).count();
  }

  return db;
};
