var _ = require('lodash');
var roleService = require('./role');
var dbError = require('../common/dbError');
var utilities = require('../common/utility');
var dbQuery = require('../common/dbQuery');
var commonUtility = require('../common/utility');
var constants = require('../common/constants');
var mandrillApi = require('../microservices/send-email/external-services/mandrill-api');
var logger = require('../common/winstonLogging');
var config = require('../config/config');


var db = require('../db_pg');

const createUser = (firstName, lastName, userEmail, userPassword, role, meta, verifiedEmail, cb) => {
  // Get user role object
  roleService.getRoleByName(role, function(err, userRole) {
    if (err) {
      return cb(err);
    }

    if (!userRole) {
      return cb({
        code: 'ERR_ROLE_NOTFOUND',
        message: 'Role not found.',
        data: {}
      });
    }

    if (role === 'clientUser' & (!meta || !meta.clientId)) {
      return cb({
        code: 'ERR_USER_CLIENTNOTSET',
        message: 'Client ID must be set for a client user.',
        data: {}
      });
    }

    var payload = {
      firstName: firstName,
      lastName: lastName,
      email: userEmail ? userEmail.toLowerCase() : null,
      password: userPassword ? db.raw('crypt(\'' + userPassword + '\', gen_salt(\'bf\', 8))') : null,
      roles: JSON.stringify([userRole._id]),
      meta: meta ? JSON.stringify(meta) : null,
      verifiedEmail: verifiedEmail
    };

    if (meta && meta.clientId) {
      payload.clientId = meta.clientId;
    }

    db('user_js')
      .returning('*')
      .insert(payload)
      .then(function (response) {
        return cb(null, _.omit(response[0], 'password'));
      })
      .catch(function (err) {
        return cb(dbError(err, 'User'));
      });

  });
};

const createUserByEmailWhenNotExists = (email) => {

  return new Promise((resolve, reject) => {

    db('user_js')
      .returning('*')
      .where({email})
      .first()
      .then((row) => {

        if(!row){

          let userNameBasedOnEmail = email.substring(0, email.lastIndexOf('@'));

          createUser(
            userNameBasedOnEmail, 'UNREGISTERED', email, utilities.generateRandomKey(), 'user', {}, false,
            (err, user) => {

              // is there an error
              if(err){
                reject(err);
              }

              resolve(user);
            });

        }else{
          return resolve(row);
        }
      })
      .catch((err) => {
        return reject(err);
      });
  });

};

module.exports = {
  // Create new user
  createUser,
  createUserByEmailWhenNotExists,
  createSocialUser(profile, platform, cb){
    return this.createUser(
      profile.name.givenName,
      profile.name.familyName,
      profile.emails[0].value || `tmp_${profile.id}@${platform}.soreto.com`,
      commonUtility.generateRandomKey(),
      'user',
      {
        passwordSet: false,
        socialAuth: {
          socialPlatform: platform.toUpperCase(),
          id: profile.id
        }
      },
      false,
      function (err, newUser) {
        return cb(err, newUser);
      });
  },
  // Get user by email address
  getUserByEmail: function(userEmail, cb) {
    db('user_js')
      .returning('*')
      .where({
        email: userEmail
      })
      .first()
      .then(function (row) {
        return _.isEmpty(row) ? cb() : cb(null, _.omit(row, 'password'));
      })
      .catch(function (err) {
        return cb(dbError(err, 'User'));
      });
  },
  getUserByEmailSync: async(userEmail) => {
    return db('user_js')
      .returning('*')
      .where({
        email: userEmail
      })
      .first();
  },
  getUserBySocialPlatform: function(profileId, socialPlatform, cb){
    db('user_js')
      .returning('*')
      .whereRaw('(meta)::jsonb->\'socialAuth\'->>\'id\' = ?' +
        ' AND (meta)::jsonb->\'socialAuth\'->>\'socialPlatform\' = ?',
      [profileId,socialPlatform])
      .first()
      .then(function (row) {
        return _.isEmpty(row) ? cb() : cb(null, _.omit(row, 'password'));
      })
      .catch(function (err) {
        return cb(dbError(err, 'User'));
      });
  },
  // Authenticated a user with email and password
  authenticateUser: function (email, password, cb) {
    db('user_js')
      .returning('*')
      .where({
        email: email,
        password: db.raw('crypt(\'' + password + '\', password)')
      })
      .first()
      .then(function (row) {
        return _.isEmpty(row) ? cb() : cb(null, _.omit(row, 'password'));
      })
      .catch(function (err) {
        return cb(dbError(err, 'User'));
      });
  },
  // Authenticated a user with email and password
  authenticateUserId: function (userId, password, cb) {
    db('user_js')
      .returning('*')
      .where({
        _id: userId,
        password: db.raw('crypt(\'' + password + '\', password)')
      })
      .first()
      .then(function (row) {
        return _.isEmpty(row) ? cb() : cb(null, _.omit(row, 'password'));
      })
      .catch(function (err) {
        return cb(dbError(err, 'User'));
      });
  },
  // Get user by ID
  getUser: function(userId, cb) {
    db('user_js')
      .returning('*')
      .where({
        _id: userId
      })
      .first()
      .then(function (row) {
        return _.isEmpty(row) ? cb() : cb(null, _.omit(row, 'password'));
      })
      .catch(function (err) {
        return cb(dbError(err, 'User'));
      });
  },
  // Get user by ID async approach
  getUserAsync: function(userId) {
    return db('user_js')
      .returning('*')
      .where({
        _id: userId
      })
      .first();
  },
  // Get all users
  getUsers : function(filter, query, cb) {
    var dbObj = db('user_js')
      .returning('*')
      .where(filter);

    dbQuery(dbObj, query)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb(null, []) : cb(null, _.map(_.omit(rows, 'password')));
      })
      .catch(function (err) {
        return cb(dbError(err, 'User'));
      });
  },
  // Assign a new role
  assignRole: function(userId, roleName, cb) {
    // Get user
    this.getUser(userId, function(err, user) {
      if(err) {
        return cb({
          code: 'ERR_USER_NOTFOUND',
          message: 'User not found',
          data: err
        });
      }
      // Get role
      roleService.getRoleByName(roleName, function(err, role) {
        if (err) {
          return cb({
            code: 'ERR_USER_ROLEFINDERROR',
            message: 'User role find error',
            data: {}
          });
        }

        if(!role) {
          return cb({
            code: 'ERR_USER_ROLENOTFOUND',
            message: 'User role not found',
            data: {}
          });
        }

        user.roles.push(role._id);

        db('user_js')
          .returning('*')
          .where({
            _id: user._id
          })
          .update({
            roles: JSON.stringify(user.roles)
          })
          .returning()
          .then(function (row) {
            return _.isEmpty(row) ? cb() : cb(null, _.omit(row[0], 'password'));
          })
          .catch(function (err) {
            return cb(dbError(err, 'User'));
          });
      });

    });
  },
  async checkIfUserHaveRole(origin,user){
    const mpRoleId= await new Promise((resolve, reject) => {
      roleService.getRoleByName('mpUser', async (err, role) => {
        if(err){ return reject(err);
        } else {
          resolve(role ?  role._id: null);
        }
      });
    });

    switch(origin){
    case'marketplace':
      if(user.roles.indexOf(mpRoleId)>=0){
        return true;
      }
      return false;
    default:
      return true;
    }
  },
  async userHasRole(roleName, user){
    const mpRoleId= await new Promise((resolve, reject) => {
      roleService.getRoleByName(roleName, async (err, role) => {
        if(err){ return reject(err);
        } else {
          resolve(role ?  role._id: null);
        }
      });
    });

    return user.roles.indexOf(mpRoleId)>=0;
  },
  updateUserStatus: function(userId, status, cb){
    db.raw(`update reverb.user set meta = (meta || jsonb '{"disabled":${status}}') Where _id = ?`,[userId])
      .then(function(){
        return cb(null,'user disabled status is now: '+status);
      })
      .catch(function (err) {
        return cb(dbError(err, 'User'));
      });
  },

  updatePlatformIdOnUserMeta: async function(platform,reverbId,platformId, group){
    try{
      await db.raw(`update reverb.user set meta = (meta || jsonb '{??: {??: {"id":??}}}') where _id=?`,[group, platform,platformId,reverbId]);
      return;
    }catch(err){
      dbError(err, 'User');
    }
  },

  updateUser: function (userId, updates, cb) {
    if (utilities.checkProtectedKeys(updates)) {
      return cb({
        code: 'ERR_USER_PROTECTED',
        message: 'Not authorised to update protected fields.',
        data: {}
      });
    }

    updates = utilities.prepareJson(updates);

    if (updates.password) {
      updates.password = db.raw('crypt(\'' + updates.password + '\', gen_salt(\'bf\', 8))');
    }

    db('user_js')
      .returning('*')
      .where({
        _id: userId
      })
      .update(updates)
      .then(function (rows) {
        return _.isEmpty(rows) ? cb() : cb(null, _.omit(rows[0], 'password'));
      })
      .catch(function (err) {
        return cb(dbError(err, 'User'));
      });

  },

  updateMarketplace : async function (userId, marketplace) {
    const user =  await db('user_js')
      .returning('*')
      .where({
        _id: userId
      })
      .update({'marketplace': marketplace});

    return user[0];
  },

  turnGenericUserIntoMarketplace: async(userId, firstName, lastName, password) => {

    // get all roles
    let roles = [];

    try {
      roles = await new Promise((resolve, reject)=> {
        roleService.getRoles({}, (err, role) => {if(err) return reject(err); else resolve(role);});
      });
    } catch (error) {
      throw error;
    }

    // update user
    try {

      const newRoles = roles
        .filter((r) => r.name == constants.ROLES.USER || r.name == constants.ROLES.MP_USER)
        .map(r => r._id);

      return await db('user_js')
        .update({
          firstName,
          lastName,
          password : db.raw(`crypt(?, gen_salt('bf', 8))`, [password]),
          roles: JSON.stringify(newRoles)
        })
        .where({ _id: userId });

    } catch (error) {

      throw dbError(error, 'User');
    }
  },

  updatePassword: function (userId, currentPassword, newPassword, cb) {
    var self = this;
    self.getUser(userId, function (err) {
      if (err) {
        return cb({
          code: 'ERR_USER_AUTH',
          message: 'An error occurred while verifying the existing account.',
          data: err,
          statusCode: 500
        });
      }

      var authenticate = new Promise(function (resolve, reject) {
        self.authenticateUserId(userId, currentPassword, function (err, userAuth) {
          if (err) {
            return reject({
              code: 'ERR_USER_AUTH',
              message: 'An error occurred while verifying the existing account.',
              data: err,
              statusCode: 500
            });
          }

          if (!userAuth) {
            return reject({
              code: 'ERR_USER_AUTH',
              message: 'Your current password appears to be incorrect.',
              data: err,
              statusCode: 401
            });
          }

          resolve(userAuth);
        });
      });

      authenticate
        .then(function () {
          db('user_js')
            .returning('*')
            .where({
              _id: userId
            })
            .update({
              password: db.raw('crypt(\'' + newPassword + '\', gen_salt(\'bf\', 8))')
            })
            .then(function (rows) {
              return _.isEmpty(rows) ? cb() : cb(null, _.omit(rows[0], 'password'));
            })
            .catch(function (err) {
              return cb(dbError(err, 'User'));
            });
        })
        .catch(function (err) {
          return cb(err);
        });
    });
  },

  getUserHavingRole: async (userId, roleName) => {

    let user = await db('user_js')
      .where({ _id: userId })
      .andWhereRaw(`roles\\?(SELECT _id FROM role_js r WHERE r."name" = ?)`, [roleName])
      .first();

    return user;
  },

  sendWelcomeEmailMarketplaceViaSocialMedia: async (email, firstName) =>{

    var data = {};
    data.templateName = config.MAIL.TEMPLATES.WELCOME_FROM_SOCIALMEDIA_REGISTRATION_MARKETPLACE;
    data.toEmail = email;
    data.subject = 'Welcome to Soreto!';
    data.fromName = 'Soreto';
    data.fromEmail ='marketplace@soreto.com';
    data.userFirstname = firstName;
    data.variables = { MARKETPLACE_URL: config.MARKETPLACE.URL};

    try {
      await mandrillApi.send(data);
    } catch (error) {
      logger.error('MAIL FAIL: %s', error);
    }
  },

  getUserInternalAndExternalOrder: (userId) => {
    return db('agg_order_external_order_user')
      .returning('*')
      .where({ userId });
  }
};
