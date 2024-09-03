var async = require('async'),
  userService = require('../services/user'),
  routePerms = require('../config/routePerms'),
  _ = require('lodash');

var db = require('../db_pg');

const config = require('../config/config');
const globalVarsCache = require('../utils/redisCache')(config.REDIS_VARS_DB);

routePerms = _.map(routePerms, function (routePerm) {
  routePerm.roles = JSON.stringify(routePerm.roles);
  return routePerm;
});

const preTest = function (done) {
  var queue = [];
  var roles = ['user', 'admin', 'client', 'clientUser', 'guest'];

  // Run bootstrapping tasks
  queue.push(function (next) {
    db('auth_token')
      .delete()
      .then(function () {
        return next();
      })
      .catch(function (err) {
        return next(err);
      });
  });

  queue.push(function (next) {
    db('log_reverb_process')
      .delete()
      .then(function () {
        return next();
      })
      .catch(function (err) {
        return next(err);
      });
  });

  queue.push(function (next) {
    db('order')
      .delete()
      .then(function () {
        return next();
      })
      .catch(function (err) {
        return next(err);
      });
  });


  queue.push(function (next) {
    db('oauth_code')
      .delete()
      .then(function () {
        return next();
      })
      .catch(function (err) {
        return next(err);
      });
  });

  queue.push(function (next) {
    db('role')
      .delete()
      .then(function () {
        return next();
      })
      .catch(function (err) {
        return next(err);
      });
  });

  queue.push(function (next) {
    db('route_permission')
      .delete()
      .then(function () {
        return next();
      })
      .catch(function (err) {
        return next(err);
      });
  });

  queue.push(function (next) {
    db('social_post')
      .delete()
      .then(function () {
        return next();
      })
      .catch(function (err) {
        return next(err);
      });
  });

  queue.push(function (next) {
    db('social_auth')
      .delete()
      .then(function () {
        return next();
      })
      .catch(function (err) {
        return next(err);
      });
  });

  queue.push(function (next) {
    db('shared_url')
      .delete()
      .then(function () {
        return next();
      })
      .catch(function (err) {
        return next(err);
      });
  });

  queue.push(function (next) {
    db('shared_url_access')
      .delete()
      .then(function () {
        return next();
      })
      .catch(function (err) {
        return next(err);
      });
  });

  queue.push(function (next) {
    db('oauth_token')
      .delete()
      .then(function () {
        return next();
      })
      .catch(function (err) {
        return next(err);
      });
  });

  queue.push(function (next) {
    db('user')
      .delete()
      .then(function () {
        return next();
      })
      .catch(function (err) {
        return next(err);
      });
  });

  queue.push(function (next) {

    db('client')
      .delete()
      .then(function () {

        return next();
      })
      .catch(function (err) {
        return next(err);
      });
  });

  queue.push(function (next) {
    db('global_vars')
      .delete()
      .then(function () {
        return next();
      })
      .catch(function (err) {
        return next(err);
      });
  });

  queue.push(function (next) {
    db('var_definition')
      .delete()
      .then(function () {
        return next();
      })
      .catch(function (err) {
        return next(err);
      });
  });

  queue.push(function(next) {
    db('country')
      .select('*')
      .where({'name' : 'GB'})
      .first()
      .then((country) => {

        if(!_.isNil(country)){
          console.log('a');
          console.log(country);
          return next(null, {countryId : country._id});
        }else{
          db('country')
            .insert({ 'name' : 'GB', 'country_name': 'Great Britain'})
            .returning('*')
            .then((countries) => {
              console.log('b');
              console.log(countries);
              return next(null, {countryId : countries[0]._id});
            })
            .catch((err) => {
              return next(err);
            });
        }
      })
      .catch((err) => {
        return next(err);
      });
  });

  // Create roles
  _.each(roles, function (role) {
    queue.push(function (next) {
      db('role')
        .insert({
          name: role
        })
        .then(function () {
          return next();
        })
        .catch(function () {
          return next();
        });
    });
  });

  // Add route permissions
  queue.push(function (next) {
    db.batchInsert('route_permission_js', routePerms)
      .then(function () {
        return next();
      })
      .catch(function (err) {
        return next(err);
      });
  });

  // Add admin user
  queue.push(function (next) {
    userService.createUser('Root', 'Admin', 'wallet@fabacus.com', 'abcd1234', 'admin', {}, false, async function (err) {
      await db('user').update({verified_email: true});
      return next(err);
    });
  });

  queue.push(function(next) {
    globalVarsCache.connection.flushdb()
      .then(() => {
        return next();
      })
      .catch((err) => {
        return next(err);
      });
  });

  // Run all tasks
  async.series(queue, function (err, data) {
    return done(err, data);
  });
};

const verifyEmails = async () => {
  await db('user').update({verified_email: true});
};

module.exports = { preTest, verifyEmails };