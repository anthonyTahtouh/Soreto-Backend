var argv = require('yargs').argv;
var async = require('async');
var _ = require('lodash');
var logger = require('./common/winstonLogging');
var roleService = require('./services/role');
var userService = require('./services/user');
var routePermissionService = require('./services/routePermission');
var db = require('./db_pg');
var dbError = require('./common/dbError');
var routePerms = require('./config/routePerms');


var config = require('./config/config');

async.auto({
  // Create roles if no roles exist, or if --roles flag is given
  roles: function (cb) {
    var roleNames = ['admin', 'user', 'client', 'clientUser', 'guest', 'system', 'sales', 'mpUser', 'financial'];
    var queue = [];

    roleService.getRoles({}, function (err, roles) {
      if (roles && roles.length > 0 && !argv.roles && !argv.all) {
        return cb();
      }

      _.each(roleNames, function (roleName) {
        if (!_.find(roles, {name: roleName})) {
          queue.push(function (next) {
            db('role_js')
              .insert({
                name: roleName
              })
              .then(function () {
                return next();
              })
              .catch(function (err) {
                return next(err);
              });
          });
        }
      });

      async.series(queue, function (err) {
        if (err) {
          logger.error('Roles: Failed!' + err);
          return cb(err);
        }

        logger.info('Roles: Created!');
        return cb();
      });
    });
  },
  // Create route permissions if none exist, or override if --perms flag is present
  perms: ['roles', function (cb) {
    routePermissionService.getPerms({}, function (err, perms) {
      if (perms && perms.length > 0 && !argv.perms && !argv.all) {
        return cb();
      }

      routePerms = _.map(routePerms, function (routePerm) {
        routePerm.roles = JSON.stringify(routePerm.roles);
        return routePerm;
      });

      db('route_permission_js')
        .delete()
        .then(function () {
          return db.batchInsert('route_permission_js', routePerms);
        })
        .then(function () {
          logger.info('Perms: Created!');
          return cb();
        })
        .catch(function (err) {
          logger.error('Perms: Failed!' + err);
          return cb(err);
        });
    });
  }],
  // Create admin if not present, or override if --admin flag is given (optional --password)
  admin: ['perms', function (cb) {
    userService.getUserByEmail('wallet@fabacus.com', function (err, user) {
      if (user && !argv.admin && !argv.all) {
        return cb();
      }

      var password = process.env.ADMIN_PASSWORD || 'abcd1234';
      if (!process.env.ADMIN_PASSWORD && process.env.NODE_ENV !== 'test') {
        return cb({
          message: 'Password must be set via env variable when not in test.'
        });
      }

      db('user_js')
        .where({
          email: 'wallet@fabacus.com'
        })
        .delete()
        .then(function () {
          userService.createUser('Admin', 'User', 'wallet@fabacus.com', password, 'admin', {}, false, function (err) {
            if (err) {
              logger.error('Admin: Failed!' + err);
              return cb(err);
            }

            logger.info('Admin: Created!');
            return cb();
          });
        })
        .catch(function (err) {
          logger.error('Admin: Failed!');
          return cb(err);
        });
    });
  }],
  // Create system if not present, or override if --admin flag is given (optional --password)
  system: ['admin', function (cb) {
    userService.getUserByEmail(config.SYSTEM.DEFAULT_USER_EMAIL, function (err, user) {

      if (user && !argv.admin && !argv.all) {
        return cb();
      }

      var password = process.env.ADMIN_PASSWORD || config.SYSTEM.DEFAULT_USER_PASSWORD;
      if (!process.env.ADMIN_PASSWORD && process.env.NODE_ENV !== 'test') {
        return cb({
          message: 'Password must be set via env variable when not in test.'
        });
      }

      db('user_js')
        .where({
          email: config.SYSTEM.DEFAULT_USER_EMAIL
        })
        .delete()
        .then(function () {
          userService.createUser('System', 'User', config.SYSTEM.DEFAULT_USER_EMAIL, password, 'system', {}, false, function (err) {
            if (err) {
              logger.error('System user: Failed!' + err);
              return cb(err);
            }

            logger.info('System user: Created!');
            return cb();
          });
        })
        .catch(function (err) {
          logger.error('System user: Failed!');
          return cb(err);
        });
    });
  }],

  constants: ['system', function (cb) {
    if (config.ENV !== 'test' && !argv.constants && !argv.all) {
      return cb();
    }

    var queue = [];
    var constants = [
      {
        db: 'value_authtokentype_js',
        values: _.keys(require('./models/constants/authTokenType'))
      },
      {
        db: 'value_orderstatus_js',
        values: _.keys(require('./models/constants/orderStatus'))
      },
      {
        db: 'value_processstatus_js',
        values: _.keys(require('./models/constants/processStatus'))
      },
      {
        db: 'value_socialplatform_js',
        values: _.keys(require('./models/constants/socialPlatform'))
      },
      {
        db: 'value_tracktype_js',
        values: _.keys(require('./models/constants/trackType'))
      }
    ];

    _.each(constants, function (constant) {
      queue.push(function (next) {
        var values = _.map(constant.values, function (value) {
          return {value: value};
        });

        async.each(values, function (value, cb) {
          db.raw(`INSERT INTO reverb.${constant.db} AS ${constant.db} ("value") VALUES(?) \
            ON CONFLICT ("value") DO NOTHING`, [value.value])
            .then(function () {
              return cb();
            })
            .catch(function (err) {
              return cb(dbError(err, 'Social_info'));
            });
        }, function (err) {
          return next(err);
        });
      });
    });

    async.series(queue, function (err) {
      if (err) {
        logger.error('Constants: Failed! %s', err);
        return cb(err);
      }

      logger.info('Constants: Created!');
      return cb();
    });
  }]
}, function (err) {
  if (err) {
    logger.error('Setup completed with errors!' + JSON.stringify(err));
    process.exit();
  }
  logger.info('Setup completed successfully!');
  process.exit();
});