const async = require('async');
const faker = require('faker');
const testBootstrap = require('../../common/testBootstrap');
const clientService = require('../../services/client');
const campaignService = require('../../services/campaign');
const userService = require('../../services/user');
const campaignVersionService = require('../../services/campaignVersion');
const globalVarsService = require('../../services/sharedServices/globalVars');
const db = require('../../db_pg');
const moment = require('moment');
const _ = require('lodash');
const should = require('should');
let globalConfigs = [
  {
    context: 'CLIENT',
    setting_key: 'COUNTRY',
    type: 'TEXT',
    description: faker.lorem.words(12),
    fallback_value: ['GB'],
    value_option: ['GB', 'PT', 'FR'],
    restrict: false,
    multi_value: false
  },
  {
    context: 'CLIENT',
    setting_key: 'TIMEZONE',
    type: 'TEXT',
    description: faker.lorem.words(12),
    fallback_value: ['UTC-4'],
    value_option: ['UTC', 'UTC-4', 'UTC-3'],
    restrict: false,
    multi_value: false
  },
  {
    context: 'CLIENT',
    setting_key: 'ORDER_EXPIRATION_IN_DAYS',
    type: 'NUMERIC',
    description: faker.lorem.words(12),
    fallback_value: [40],
    value_option: [ 30, 40, 60 ],
    restrict: false,
    multi_value: false
  },
  {
    context: 'POST_REWARD',
    setting_key: 'ALLOWED_ORDER_STATUS',
    type: 'TEXT',
    description: faker.lorem.words(12),
    fallback_value: [ 'PAID' ] ,
    value_option: [ 'PAID','PENDING','CANCELLED','VOID','THIRD_PARTY_PENDING' ] ,
    restrict: false,
    multi_value: true
  },
  {
    context: 'CAMPAIGN',
    setting_key: 'WEEK_DAYS_TO_SHOW',
    type: 'TEXT',
    description: faker.lorem.words(12),
    fallback_value: [ 'WED', 'SUN' ] ,
    value_option: [ 'SUN','MON','TUE','WEB','THU','FRY', 'SAT' ],
    restrict: false,
    multi_value: true
  }
];

var countryId;

var getRandomNumber = function (min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

var createFakeData = (countryId, callback) =>{

  async.auto({
    users: function (next) {
      var cntArr = new Array(50);

      async.mapSeries(cntArr, function (x, cb) {
        userService.createUser(faker.name.firstName(), faker.name.lastName(), faker.internet.email().toLowerCase(), 'demouser', 'user', {}, false, function (err, user) {

          return cb(null, user);
        });
      }, function (err, results) {
        if (err) {
          return next(err);
        }

        return next(null, results);
      });
    },
    clients: ['users', function (next) {

      var cntArr = new Array(15);

      var getCategories = function () {
        var cntArr = new Array(getRandomNumber(0,5));
        var categories = [];

        _.each(cntArr, function () {
          categories.push({
            name: faker.commerce.department(),
            value: getRandomNumber(1,10)
          });
        });

        return categories;
      };

      async.mapSeries(cntArr, function (x, cb) {
        clientService.createClient({
          name: faker.company.companyName(),
          countryId: countryId,
          email: faker.internet.email().toLowerCase(),
          referer: getRandomNumber(1, 3) % 3 === 0 ? [faker.internet.domainName(), faker.internet.domainName()] : [faker.internet.domainName()],
          percentCommission: {
            default: getRandomNumber(1, 5),
            categories: getCategories()
          }
        }, function (err, client) {
          return cb(null, client);
        });
      }, function (err, results) {
        if (err) {
          return next(err);
        }

        return next(null, results);
      });
    }],
    clientsCampaigns: ['clients', function (next, results) {
      var clients = results.clients;

      async.mapSeries(clients, function (client, cb) {
        campaignService.createCampaign({
          clientId: client._id,
          expiry: moment().add(1, 'years').format('YYYY-MM-DD')
        }, function (err, user) {
          return cb(null, user);
        });
      }, function (err, results) {
        if (err) {
          return next(err);
        }

        return next(null, results);
      });
    }],
    clientsCampaignVersions: ['clientsCampaigns', function (next, results) {
      //var clientsRewardPools = results.clientsRewardPools;
      var clientsCampaigns = results.clientsCampaigns;
      let count = 0;

      async.mapSeries(clientsCampaigns, function (camp, cb) {
        campaignVersionService.createCampaignVersion({
          campaignId: clientsCampaigns[count]._id,
          name: faker.lorem.word(),
          exposure: 100,
          active:true,
          alias: ''
        },function (err, campaignVersion) {
          return cb(null, campaignVersion);
        });
        count++;
      }, function (err, results) {
        if (err) {
          return next(err);
        }

        return next(null, results);
      });
    }],
    globalVars: ['clientsCampaignVersions', (next) => {

      async.mapSeries(globalConfigs, (config, cb) => {

        db('var_definition')
          .returning('*')
          .insert(config)
          .then((vDef) => {
            return cb(null, vDef);
          })
          .catch((err) => {
            return next(err);
          });

      }, (err, results) => {

        if (err) {
          return next(err);
        }

        return next(null, results);

      });

    }]
  }, (err, results) => {
    callback(err, results);
  });
};

describe('Global vars service test', () => {

  let createdClients;
  let createdCampaigns;
  let createdCampaignVersions;

  before(function(done) {
    var queue = [];

    queue.push(function (next) {
      testBootstrap.preTest(function (err, data) {
        if(data){
          let country = data.find(v => v && v['countryId']);
          if(country){
            countryId = country.countryId;
          }
        }
        next();
      });
    });

    queue.push(function (next) {
      createFakeData(countryId, function (err, results) {

        if(err) return done(err);

        createdClients = results.clients;
        createdCampaigns = results.clientsCampaigns;
        createdCampaignVersions = results.clientsCampaignVersions;

        return next();
      });
    });

    async.series(queue, function () {
      return done();
    });
  });

  it('Given a client, it should return the right amount of global vars with no specialization for CLIENT context', (done) => {

    let client1 = createdClients[1];

    globalVarsService.getClientSettings('CLIENT', null, client1._id, null)
      .then((settings) => {

        settings.should.have.length(_.filter(globalConfigs, (c) => c.context == 'CLIENT').length);

        done();
      })
      .catch((err) => {
        return done(err);
      });

  });

  it('Given a client, it should return the right amount of global vars with no specialization for POST_REWARD context', (done) => {

    let client1 = createdClients[1];

    globalVarsService.getClientSettings('POST_REWARD', null, client1._id, null)
      .then((settings) => {

        settings.should.have.length(_.filter(globalConfigs, (c) => c.context == 'POST_REWARD').length);

        done();
      })
      .catch((err) => {
        return done(err);
      });

  });

  it('Given a invalid context, it should return an error', (done) => {

    let client1 = createdClients[1];

    globalVarsService.getClientSettings('X1X2X3X4X5', null, client1._id, null)
      .then(() => {

        return done('IT SHOULD RETURN AN ERROR');
      })
      .catch(() => done());

  });

  it('Given a context with no Var configured, it should return an empty array', (done) => {

    let client1 = createdClients[1];

    globalVarsService.getClientSettings('REWARD', null, client1._id, null)
      .then((settings) => {

        settings.should.have.length(0);

        done();
      })
      .catch((err) => {
        return done(err);
      });

  });

  it('Specializing a global config for CAMPAIGN context, it should have no error', (done) => {

    let campaign1 = createdCampaigns[1];

    globalVarsService.getClientSettings('CAMPAIGN', null, campaign1._id, null)
      .then((settings) => {

        let setting =  _.findLast(settings, set => set.settingKey == 'WEEK_DAYS_TO_SHOW');

        setting.value = [ 'SUN', 'TUE' ];
        setting.objectId = campaign1._id;

        globalVarsService.updateSettings([setting])
          .then(() => {
            done();
          })
          .catch((err) => {
            return done(err);
          });
      })
      .catch((err) => {
        return done(err);
      });
  });

  it('Specializing a global config for CAMPAIGN context, it should return the right specialized value', (done) => {

    let campaign2 = createdCampaigns[2];

    globalVarsService.getClientSettings('CAMPAIGN', null, campaign2._id, null)
      .then((settings) => {

        let setting =  _.findLast(settings, set => set.settingKey == 'WEEK_DAYS_TO_SHOW');

        setting.value = [ 'SUN', 'WED' ];
        setting.objectId = campaign2._id;

        globalVarsService.updateSettings([setting])
          .then(() => {

            globalVarsService.getClientSettings('CAMPAIGN', null, campaign2._id, null)
              .then((ret) => {

                let setting2 =  _.findLast(ret, set => set.settingKey == 'WEEK_DAYS_TO_SHOW');

                setting2.should.have.property('value');
                setting2.should.have.property('objectId');
                should.exist(setting2.value);
                should.exist(setting2.objectId);
                setting2.value.should.be.eql([ 'SUN', 'WED' ]);
                setting2.objectId.should.be.eql(campaign2._id);
                setting2.fallbacked.should.be.eql(false);

                done();

              }).catch((err) => {
                return done(err);
              });
          })
          .catch((err) => {
            return done(err);
          });
      })
      .catch((err) => {
        return done(err);
      });
  });

  it('Specializing 2 correct values and one of them wrong, it should not save the correct ones and rollback everything', (done) => {

    let client5 = createdCampaigns[5];

    globalVarsService.getClientSettings('CLIENT', null, client5._id, null)
      .then((settings) => {

        settings.should.have.length(3);

        for(let setting of settings){

          if(setting.settingKey == 'TIMEZONE'){
            setting.value = ['UTC-4'];
            setting.objectId = client5._id;
          }
          if(setting.settingKey == 'COUNTRY'){
            setting.value = ['IT'];
            setting.objectId = client5._id;
          }
          if(setting.settingKey == 'ORDER_EXPIRATION_IN_DAYS'){
            setting.objectId = client5._id;
            setting.value = 'FAIL IT';
          }
        }

        globalVarsService.updateSettings(settings)
          .then(() => {
            return done('IT SHOULD FAIL');
          })
          .catch(() => {

            globalVarsService.getClientSettings('CLIENT', null, client5._id, null)
              .then((settings) => {

                for(let setting of settings){

                  setting.fallbacked.should.be.eql(true);
                  should.not.exist(setting.value);
                  should.not.exist(setting.objectId);
                  should.not.exist(setting.clientId);
                  should.not.exist(setting.globalVarSettingId);
                }

                done();

              }).catch((err) => {
                return done(err);
              });
          })
          .catch((err) => {
            return done(err);
          });
      }).catch((err) => {
        return done(err);
      });
  });

  it('Searching for CAMPAIGN context, using a campaign that did not have a specialization, it should return the global value', (done) => {

    let campaign3 = createdCampaigns[3];

    globalVarsService.getClientSettings('CAMPAIGN', null, campaign3._id, null)
      .then((settings) => {

        settings.should.have.length(1);

        let setting = settings[0];

        setting.fallbacked.should.be.eql(true);
        should.not.exist(setting.value);
        should.not.exist(setting.objectId);
        should.not.exist(setting.clientId);
        should.not.exist(setting.globalVarSettingId);

        done();

      })
      .catch((err) => {
        return done(err);
      });

  });

  it('Creating a Custom Var, it should have no error', (done) => {

    let campaignVersion1 = createdCampaignVersions[0];
    let client1 = createdClients[0];

    let custom = {
      context: 'CAMPAIGN_VERSION',
      settingKey: 'my_custom_key',
      objectId: campaignVersion1._id,
      fallbackValue: [1000],
      value: [1000],
      clientId: client1._id,
      type: 'NUMERIC',
      restrict: false,
      multiValue: false
    };

    globalVarsService.updateSettings([custom])
      .then(() => {
        done();
      })
      .catch((err) => {
        return done(err);
      });

  });

  it('Searching for a already created Custom Var, it should return the right value', (done) => {

    let campaignVersion1 = createdCampaignVersions[0];
    let client1 = createdClients[0];

    globalVarsService.getClientSettings('CAMPAIGN_VERSION', client1._id, campaignVersion1._id, null)
      .then((settings) => {

        settings.should.have.length(1);

        let setting = settings[0];

        should.exist(setting.value);
        should.exist(setting.objectId);
        should.exist(setting.clientId);
        setting.context.should.be.eql('CAMPAIGN_VERSION');
        setting.settingKey.should.be.eql('my_custom_key');
        setting.objectId.should.be.eql(campaignVersion1._id);
        setting.clientId.should.be.eql(client1._id);
        setting.value.should.be.eql(['1000']);

        done();

      })
      .catch((err) => {
        return done(err);
      });

  });

  it('Searching for a already created Custom Var, using a different "client_id", it should return an empty array', (done) => {

    let campaignVersion1 = createdCampaignVersions[0];
    let client2 = createdClients[1];

    globalVarsService.getClientSettings('CAMPAIGN_VERSION', client2._id, campaignVersion1._id, null)
      .then((settings) => {

        settings.should.have.length(0);

        done();

      })
      .catch((err) => {
        return done(err);
      });

  });

  it('Searching for a already created Custom Var, using a different "object_id", it should return an empty array', (done) => {

    let campaignVersion2 = createdCampaignVersions[1];
    let client1= createdClients[0];

    globalVarsService.getClientSettings('CAMPAIGN_VERSION', client1._id, campaignVersion2._id, null)
      .then((settings) => {

        settings.should.have.length(0);

        done();

      })
      .catch((err) => {
        return done(err);
      });

  });

  it('Creating the same Custom Var, for the same client and same object it should fail', (done) => {

    let campaignVersion1 = createdCampaignVersions[0];
    let client1 = createdClients[0];

    let custom = {
      context: 'CAMPAIGN_VERSION',
      settingKey: 'my_custom_key',
      objectId: campaignVersion1._id,
      fallbackValue: [1000],
      value: [1000],
      clientId: client1._id,
      type: 'NUMERIC',
      restrict: false,
      multiValue: false
    };

    globalVarsService.updateSettings([custom])
      .then(() => {
        return done('IT SHOULD FAIL');
      })
      .catch(() => {
        done();
      });

  });

  it('Creating the same Custom Var, for the same "context" and "client_id" with different "object_id", it should fail', (done) => {

    let campaignVersion1 = createdCampaignVersions[0];
    let client1 = createdClients[0];

    let custom = {
      context: 'CAMPAIGN_VERSION',
      settingKey: 'my_custom_key',
      objectId: campaignVersion1._id,
      fallbackValue: [1000],
      value: [1000],
      clientId: client1._id,
      type: 'NUMERIC',
      restrict: false,
      multiValue: false
    };

    globalVarsService.updateSettings([custom])
      .then(() => {
        return done('IT SHOULD FAIL');
      })
      .catch(() => {
        done();
      });

  });

  it('Creating the same Custom Var, for the same "context" and "object id" with different "client_id", it should have no error', (done) => {

    let campaignVersion1 = createdCampaignVersions[0];
    let client2 = createdClients[1];

    let custom = {
      context: 'CAMPAIGN_VERSION',
      settingKey: 'my_custom_key',
      objectId: campaignVersion1._id,
      fallbackValue: [1000],
      value: [1000],
      clientId: client2._id,
      type: 'NUMERIC',
      restrict: false,
      multiValue: false
    };

    globalVarsService.updateSettings([custom])
      .then(() => {
        done();
      })
      .catch((error) => {
        done(error);
      });

  });

  it('Creating 2 correct Custom Vars and one of them wrong, it should not save the correct ones and rollback everything', (done) => {

    let campaignVersion4 = createdCampaignVersions[4];
    let client6 = createdClients[6];

    let custom1 = {
      context: 'CAMPAIGN_VERSION',
      settingKey: 'my_custom_key1',
      objectId: campaignVersion4._id,
      fallbackValue: [1000],
      value: [1000],
      clientId: client6._id,
      type: 'NUMERIC',
      restrict: false,
      multiValue: false
    };

    let custom2 = {
      context: 'CAMPAIGN_VERSION',
      settingKey: 'my_custom_key2',
      objectId: campaignVersion4._id,
      fallbackValue: [1000],
      value: [1000],
      clientId: client6._id,
      type: 'NUMERIC',
      restrict: false,
      multiValue: false
    };

    let custom3 = {
      context: 'CAMPAIGN_VERSION',
      //settingKey: 'my_custom_key2', TO FAIL
      objectId: campaignVersion4._id,
      fallbackValue: [1000],
      value: [1000],
      clientId: client6._id,
      type: 'NUMERIC',
      restrict: false,
      multiValue: false
    };

    globalVarsService.updateSettings([custom1, custom2, custom3])
      .then(() => {
        return done('IT SHOULD FAIL');
      })
      .catch(() => {

        globalVarsService.getClientSettings('CAMPAIGN_VERSION', client6._id, campaignVersion4._id, null)
          .then((settings) => {
            settings.should.have.length(0);

            done();

          })
          .catch((err) => {
            return done(err);
          });

      });

  });

  it('Searching for a Var that was not specialized, GET_VAR function should return the fallback value', (done) => {

    let client7 = createdClients[7];

    globalVarsService.getVar('COUNTRY', 'CLIENT', client7._id)
      .then((setting) => {

        should.exist(setting);

        let c = _.findLast(globalConfigs, c => c.setting_key == 'COUNTRY');

        setting.should.be.eql(c.fallback_value);

        done();

      })
      .catch((err) => {
        return done(err);
      });

  });

  it('Searching for a var that does not exists, GET_VAR function should return no value', (done) => {

    let client7 = createdClients[7];

    globalVarsService.getVar('LAB', 'CLIENT', client7._id)
      .then((setting) => {

        should.exist(setting);

        setting.should.be.eql([]);

        done();

      })
      .catch((err) => {
        return done(err);
      });
  });

  it('Specializing a Var, GET_VAR function should return the specialized value ', (done) => {

    let campaign5 = createdCampaigns[5];

    globalVarsService.getClientSettings('CAMPAIGN', null, campaign5._id, null)
      .then((settings) => {

        let setting =  _.findLast(settings, set => set.settingKey == 'WEEK_DAYS_TO_SHOW');

        setting.value = [ 'FRY' ];
        setting.objectId = campaign5._id;

        globalVarsService.updateSettings([setting])
          .then(() => {

            globalVarsService.getVar('WEEK_DAYS_TO_SHOW', 'CAMPAIGN', campaign5._id)
              .then((setting) => {

                should.exist(setting);

                setting.should.be.eql(['FRY']);

                done();

              })
              .catch((err) => {
                return done(err);
              });

          })
          .catch((err) => {
            return done(err);
          });
      })
      .catch((err) => {
        return done(err);
      });

  });

  it('Specializing a Var twice, GET_VAR function should return the last specialized value', (done) => {

    let campaign5 = createdCampaigns[5];

    globalVarsService.getClientSettings('CAMPAIGN', null, campaign5._id, null)
      .then((settings) => {

        let setting =  _.findLast(settings, set => set.settingKey == 'WEEK_DAYS_TO_SHOW');

        setting.value = [ 'FRY' ];
        setting.objectId = campaign5._id;

        globalVarsService.updateSettings([setting])
          .then(() => {

            setting.value = [ 'SUN', 'MON' ];
            globalVarsService.updateSettings([setting])
              .then(() => {
                globalVarsService.getVar('WEEK_DAYS_TO_SHOW', 'CAMPAIGN', campaign5._id)
                  .then((setting) => {

                    should.exist(setting);

                    setting.should.be.eql(['SUN', 'MON']);

                    done();

                  })
                  .catch((err) => {
                    return done(err);
                  });
              })
              .catch((err) => {
                return done(err);
              });
          })
          .catch((err) => {
            return done(err);
          });
      })
      .catch((err) => {
        return done(err);
      });

  });

  it('Create a custom Var, GET_VAR function should return right value', (done) => {

    let client8 = createdClients[8];

    let custom = {
      context: 'CLIENT',
      settingKey: 'my_custom_key',
      objectId: client8._id,
      fallbackValue: [1000],
      value: [1000],
      clientId: client8._id,
      type: 'NUMERIC',
      restrict: false,
      multiValue: false
    };

    globalVarsService.updateSettings([custom])
      .then(() => {

        globalVarsService.getVar('my_custom_key', 'CLIENT', client8._id)
          .then((setting) => {

            should.exist(setting);

            setting.should.be.eql(['1000']);

            done();

          })
          .catch((err) => {
            return done(err);
          });

      })
      .catch((err) => {
        return done(err);
      });

  });

  it('Create a custom Var, search it using GET_VAR and then search it using GET_VAR_FROM_CACHE function, it should return right value', (done) => {

    let client9 = createdClients[9];

    let custom = {
      context: 'CLIENT',
      settingKey: 'my_custom_key',
      objectId: client9._id,
      fallbackValue: [1000],
      value: [1000],
      clientId: client9._id,
      type: 'NUMERIC',
      restrict: false,
      multiValue: false
    };

    globalVarsService.updateSettings([custom])
      .then(() => {

        globalVarsService.getVar('my_custom_key', 'CLIENT', client9._id)
          .then(() => {

            globalVarsService.getVarFromCache('my_custom_key', 'CLIENT', client9._id)
              .then((setting) => {

                should.exist(setting);

                setting.should.be.eql(['1000']);

                done();
              }).catch((err) => {
                return done(err);
              });
          })
          .catch((err) => {
            return done(err);
          });
      })
      .catch((err) => {
        return done(err);
      });

  });

  it('Create a custom Var, deleting it, search it using GET_VAR function and then search it using GET_VAR_FROM_CACHE function, it should not return value', (done) => {

    let client8 = createdClients[8];

    let custom = {
      context: 'CLIENT',
      settingKey: 'my_custom_key_to_be_deleted',
      objectId: client8._id,
      fallbackValue: [2000],
      value: [2000],
      clientId: client8._id,
      type: 'NUMERIC',
      restrict: false,
      multiValue: false
    };

    globalVarsService.updateSettings([custom])
      .then(() => {

        globalVarsService.getClientSettings('CLIENT', client8._id, client8._id, 'my_custom_key_to_be_deleted')
          .then((settings) => {

            settings.should.have.length(1);

            globalVarsService.getVar('my_custom_key_to_be_deleted', 'CLIENT', client8._id, client8._id)
              .then((setting1) => {

                globalVarsService.getVarFromCache('my_custom_key_to_be_deleted', 'CLIENT', client8._id, client8._id)
                  .then((setting2) => {

                    setting1.should.have.length(1);
                    setting2.should.have.length(1);
                    setting1.should.be.eql(setting2);

                    let setting = settings[0];
                    setting.setToRemove = true;

                    globalVarsService.updateSettings([setting])
                      .then(() => {

                        globalVarsService.getVarFromCache('my_custom_key_to_be_deleted', 'CLIENT', client8._id, client8._id)
                          .then((settingFinal) => {

                            should.exist(settingFinal);

                            settingFinal.should.be.eql([]);

                            done();
                          }).catch((err) => {
                            return done(err);
                          });

                      })
                      .catch((err) => {
                        return done(err);
                      });

                  }).catch((err) => {
                    return done(err);
                  });

              }).catch((err) => {
                return done(err);
              });

          })
          .catch((err) => {
            return done(err);
          });
      })
      .catch((err) => {
        return done(err);
      });

  });

  it('Create a custom Var, update it, search it using GET_VAR function and then search it using GET_VAR_FROM_CACHE function, it should return the right value', (done) => {

    let client8 = createdClients[8];

    let custom = {
      context: 'CLIENT',
      settingKey: 'my_custom_key_to_be_updated',
      objectId: client8._id,
      fallbackValue: [2000],
      value: [2000],
      clientId: client8._id,
      type: 'NUMERIC',
      restrict: false,
      multiValue: false
    };

    globalVarsService.updateSettings([custom])
      .then(() => {

        globalVarsService.getClientSettings('CLIENT', client8._id, client8._id, 'my_custom_key_to_be_updated')
          .then((settings) => {

            settings.should.have.length(1);

            globalVarsService.getVar('my_custom_key_to_be_updated', 'CLIENT', client8._id, client8._id)
              .then((setting1) => {

                globalVarsService.getVarFromCache('my_custom_key_to_be_updated', 'CLIENT', client8._id, client8._id)
                  .then((setting2) => {

                    setting1.should.have.length(1);
                    setting2.should.have.length(1);
                    setting1.should.be.eql(setting2);

                    let setting = settings[0];
                    setting.value = [5000];

                    globalVarsService.updateSettings([setting])
                      .then(() => {

                        globalVarsService.getVar('my_custom_key_to_be_updated', 'CLIENT', client8._id, client8._id)
                          .then((settingFinal1) => {

                            globalVarsService.getVarFromCache('my_custom_key_to_be_updated', 'CLIENT', client8._id, client8._id)
                              .then((settingFinal2) => {

                                should.exist(settingFinal2);

                                settingFinal1.should.have.length(1);
                                settingFinal2.should.have.length(1);
                                settingFinal1.should.be.eql(settingFinal2);

                                settingFinal2.should.be.eql(['5000']);

                                done();
                              }).catch((err) => {
                                return done(err);
                              });

                          }).catch(() => {

                          });

                      })
                      .catch((err) => {
                        return done(err);
                      });

                  }).catch((err) => {
                    return done(err);
                  });

              }).catch((err) => {
                return done(err);
              });

          })
          .catch((err) => {
            return done(err);
          });
      })
      .catch((err) => {
        return done(err);
      });

  });

});