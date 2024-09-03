var _soretoJam = require('soreto-cookie-jam');
var config = require('../config/config');
var logger = require('../common/winstonLogging');

let _soretoJamClient = null;

// calc the total minutes for default expiration
let _defaultExpirationDelay = config.COOKIE.DAYS * 1440;

// Soreto'a Chocolat Chip cookie model
// set 'expirationDelay' for a custom time,
// otherwise it will assume the default expiration
const _chocolat_chip_model = {
  sharerUserIds : [{
    value: '',
    uniqueId: true
  }],
  sharedUrlIds : [{
    value: '',
    uniqueId: true
  }],
  interstitialLoadedCount:[{
    value: '',
    uniqueId: true
  }],
  interstitialCTACount:[{
    value: '',
    uniqueId: true
  }],
  sharedUrlAccessIds : [{
    value: '',
    uniqueId: true
  }],
  firstSharedUrlAccessIds : [{
    value: '',
    uniqueId: true
  }],
  generatedSharedUrls : [{
    value: ''
  }],
  givenDiscountCodes : [{
    value : '',
    uniqueId: true
  }],
  overridedCampaignVersions : [{
    value : ''
  }],
  urlVouchers : [{
    value : ''
  }],
  cookied : {
    value : '',
    disableCleanByOversize: true,
    expirationDelay: 60
  }
};

/**
 * Soreto Cookie Jam Options
 */
const _options = {
  cookieName: 'soreto_chocolat_chip',
  model: _chocolat_chip_model,
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

    req.cookieHandler = new Handlers(_soretoJamClient).instance;


    next();
  }
};

class Handlers {

  constructor(_client){

    this._client = _client;
    const ONE_DAY_IN_MINUTES = 1440;
    this.instance = {

      /**
       * @name SharerUserIds
       * @summary This cookie is a list of User Ids that have generated a Shared Url
       *  the user is generally cookied with it during the Shared Url access
       */
      sharerUserIds : {

        get : (clientId) => {
          return this._client.get('sharerUserIds', undefined, clientId);
        },

        set : (clientId, userId, overrideExistent = true, timeout = undefined) => {

          try {

            this._client.set('sharerUserIds', userId, clientId, { overrideExistent, timeout });
            this._client.commit();

          } catch (error) {
            logger.error(`Error setting 'sharerUserIds' value on cookie:${error}`);
          }
        }
      },

      /**
       * @name SharedUrlIds
       * @summary This cookie is a list of Ids from accessed Shared Urls
       */
      sharedUrlIds : {

        get : (clientId) => {
          return this._client.get('sharedUrlIds', undefined, clientId);
        },

        set : (clientId, sharedUrlId, overrideExistent = true, timeout = undefined) => {

          try {

            this._client.set('sharedUrlIds', sharedUrlId, clientId, { overrideExistent, timeout });
            this._client.commit();

          } catch (error) {
            logger.error(`Error setting 'sharedUrlIds' value on cookie:${error}`);
          }
        }
      },

      /**
       * This property store the number of times someone refreshes the lightbox
       * before clicking on the 'getCode' button
       */
      interstitialLoadedCount : {

        get : (sharedUrlId) => {
          return this._client.get('interstitialLoadedCount', undefined, sharedUrlId);
        },

        set : (sharedUrlId, value) => {

          try {

            this._client.set(
              'interstitialLoadedCount' ,
              value,
              sharedUrlId,
              {
                overrideExistent: true,
                timeout: ONE_DAY_IN_MINUTES,
                keepOriginalExpirationDate: true
              }
            );
            this._client.commit();

          } catch (error) {
            logger.error(`Error setting 'interstitialLoadedCount ${sharedUrlId}' value on cookie:${error}`);
          }
        }
      },

      /**
       * This property store the number of times someone refreshes the lightbox
       * after clicking on the 'getCode' button, when the 'showCode' query param is true.
       */
      interstitialCTACount : {

        get : (sharedUrlId) => {
          return this._client.get('interstitialCTACount', undefined, sharedUrlId);
        },

        set : (sharedUrlId, value) => {

          try {

            this._client.set(
              'interstitialCTACount' ,
              value,
              sharedUrlId,
              {
                timeout: ONE_DAY_IN_MINUTES,
                overrideExistent: true,
                keepOriginalExpirationDate: true
              }
            );
            this._client.commit();

          } catch (error) {
            logger.error(`Error setting 'interstitialCTACount ${sharedUrlId}' value on cookie:${error}`);
          }
        }
      },

      /**
       * This property stores a sharedUrlAccees._id for each sharedURL to use the same
       * sharedUrlAccessId on the productUrl everytime the interstitial page is refreshed.
       */
      firstSharedUrlAccessIds : {

        get : (sharedUrlId) => {
          return this._client.get('firstSharedUrlAccessIds', undefined, sharedUrlId);
        },

        set : (sharedUrlId, firstSharedUrlAccessId) => {

          try {
            this._client.set(
              'firstSharedUrlAccessIds',
              firstSharedUrlAccessId,
              sharedUrlId,
              {
                timeout: ONE_DAY_IN_MINUTES,
                overrideExistent: true,
                keepOriginalExpirationDate: true
              }
            );
            this._client.commit();
          } catch (error) {
            logger.error(`Error setting 'firstSharedUrlAccessId' value on cookie:${error}`);
          }

        }
      },

      /**
       * @name sharedUrlAccessIds
       * @summary This cookie is a list of Access Ids from accessed Shared Urls
       */
      sharedUrlAccessIds : {

        get : (clientId) => {
          return this._client.get('sharedUrlAccessIds', undefined, clientId);
        },

        set : (clientId, sharedUrlAccessId, overrideExistent = true, timeout = undefined) => {

          try {

            this._client.set('sharedUrlAccessIds', sharedUrlAccessId, clientId, { overrideExistent, timeout });
            this._client.commit();

          } catch (error) {
            logger.error(`Error setting 'sharedUrlAccessIds' value on cookie:${error}`);
          }
        }
      },

      /**
       * @name GeneratedSharedUrls
       * @summary This cookie list contains all the generated SHared Urls
      */
      generatedSharedUrls : {

        get : (id) => {
          return this._client.get('generatedSharedUrls', id);
        },

        set : (value) => {

          try {

            this._client.set('generatedSharedUrls', value, undefined, { overrideExistent : false });
            this._client.commit();

          } catch (error) {
            logger.error(`Error setting 'generatedSharedUrls' value on cookie:${error}`);
          }
        }
      },

      /**
       * @name GivenDiscountCodes
       * @summary This cookie list contains the given discount codes
      */
      givenDiscountCodes : {

        get : (sessionId, sharedUrlId, rewardId) => {

          let key = `${sessionId}_${sharedUrlId}${rewardId ? `_${rewardId}`: ''}`;

          return this._client.get('givenDiscountCodes', undefined, key);
        },

        set : (sessionId, sharedUrlId, rewardId, value) => {

          try{

            // pick specific props
            value = {
              _id: value._id,
              valueAmount: value.valueAmount,
              code: value.code
            };

            let key = `${sessionId}_${sharedUrlId}${rewardId ? `_${rewardId}`: ''}`;

            this._client.set('givenDiscountCodes', value, key, { overrideExistent : true });
            this._client.commit();

          }catch(error){
            logger.error(`Error setting 'givenDiscountCodes' value on cookie:${error}`);
          }
        }
      },

      /**
       * @name Cookied
       * @summary This cookie sets that at least one page access happended
       * 'showCode' pages look for it before open, otherwhise the navigation goes back to the original url
      */
      cookied : {

        get : () => {
          return this._client.get('cookied');
        },

        set : (sessionId) => {
          try {

            this._client.set('cookied', sessionId);
            this._client.commit();

          } catch (error) {
            logger.error(`Error setting 'cookied' value on cookie:${error}`);
          }
        }
      },

      /**
       * @name OverridedCampaignVersions
       * @summary This cookie is used to set when a user sees
       *  a landing page where the content was overrided by another campaign version
      */
      overridedCampaignVersions : {

        get : (clientId) => {
          return this._client.get('overridedCampaignVersions', undefined, clientId);
        },

        set : (clientId, campaignVersionId, overrideExistent = true, timeout = undefined) => {

          try {

            this._client.set('overridedCampaignVersions', campaignVersionId, clientId, { overrideExistent, timeout });
            this._client.commit();

          } catch (error) {
            logger.error(`Error setting 'overridedCampaignVersions' value on cookie:${error}`);
          }
        },

        delete : (clientId) => {

          try {

            this._client.delete('overridedCampaignVersions', undefined, clientId);
            this._client.commit();

          } catch (error) {
            logger.error(`Error deleting 'overridedCampaignVersions' value on cookie:${error}`);
          }
        }
      },

      /**
       * @name Urlvoucher
       * @sumary This cookie is set when a 'infoUrl'(base64) parameter is present on the accessed URL
       * obs: this cookie seems deprecated
      */
      urlVoucher : {

        get : (sharedUrlId) => {
          return this._client.get('urlVouchers', undefined, sharedUrlId);
        },

        set : (sharedUrlId, value) => {

          try {

            this._client.set('urlVouchers', value, sharedUrlId);
            this._client.commit();

          } catch (error) {
            logger.error(`Error setting 'urlVoucher' value on cookie:${error}`);
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
