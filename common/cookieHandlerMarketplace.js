var _soretoJam = require('soreto-cookie-jam');
var config = require('../config/config');
var logger = require('./winstonLogging');

let _soretoJamClient = null;

// calc the total minutes for default expiration
let _defaultExpirationDelay = config.COOKIE.DAYS * 1440;

// Soreto'a Chocolat Chip cookie model
// set 'expirationDelay' for a custom time,
// otherwise it will assume the default expiration
const _chocolat_chip_mp_model = {
  marketPlaceSharedUrlAccessIds: [{
    value: '',
    uniqueId: true
  }]
};

/**
 * Soreto Cookie Jam Options
 */
const _options = {
  cookieName: 'soreto_chocolat_chip_mp',
  model: _chocolat_chip_mp_model,
  domain: config.COOKIE.DOMAIN,
  useBase64: true,
  sameSite: 'None',
  secure: config.COOKIE.SECURE,
  defaultExpirationDelay: _defaultExpirationDelay
};

/**
 * Node express endpoint middleware
 * @param {*} req Node Express JS Request
 * @param {*} res Node Express JS Response
 * @param {*} next Callback
 */
module.exports = {
  start: function(req, res, next) {

    // start a new intance of the Soreto Jam
    _soretoJamClient = new _soretoJam(req, res, _options);

    req.cookieHandlerMarketplace = new Handlers(_soretoJamClient).instance;

    next();
  }
};

class Handlers {

  constructor(_client){

    this._client = _client;
    const ONE_DAY_IN_MINUTES = 1440;
    this.instance = {

      /**
       * @name marketPlaceSharedUrlAccessIds
       * @summary List of shared_url_access ids from the B2B (soreto-maggie)
       */
      marketPlaceSharedUrlAccessIds : {

        get : (campaignVersionId, loggedUserId) => {

          let id = campaignVersionId + (loggedUserId ? '_' + loggedUserId : '');
          return this._client.get('marketPlaceSharedUrlAccessIds', undefined, id);

        },

        set : (campaignVersionId, loggedUserId, sharedUrlAccessId, overrideExistent = true ) => {

          try {

            let id = campaignVersionId + (loggedUserId ? '_' + loggedUserId : '');
            this._client.set('marketPlaceSharedUrlAccessIds', sharedUrlAccessId, id, { overrideExistent, timeout: ONE_DAY_IN_MINUTES });
            this._client.commit();

          } catch (error) {
            logger.error(`Error setting 'marketPlaceSharedUrlAccessIds' value on cookie:${error}`);
          }
        }
      },

      /**
       * @name All
       * @summary Handle with wall cookies
       */
      all : {
        get : () => {
          return this._client.get();
        },
      }
    };
  }
}
