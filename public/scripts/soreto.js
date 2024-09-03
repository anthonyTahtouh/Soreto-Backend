/**
 * Create a random session Id
 */
const _sessionId = Math.random().toString().replace('.', '');

/**
 *
 *
 *
 * TAG LOG (START)
 *
 *
 *
 */

/**
 * load env Tag Log configuration
 */
var _tagLogAllowedClientIds = ('@@TAG_LOG_ALLOWED_CLIENT_IDS' && '@@TAG_LOG_ALLOWED_CLIENT_IDS'.length > 0 )
  ? '@@TAG_LOG_ALLOWED_CLIENT_IDS'.replace(/\s/, '').split(',')
  : null ;
var _tagLogAllowedUrls = ('@@TAG_LOG_ALLOWED_URLS' && '@@TAG_LOG_ALLOWED_URLS'.length > 0)
  ? '@@TAG_LOG_ALLOWED_URLS'.replace(/\s/, '').split(',')
  : null;

function tagLog(step, extraProps) {

  try {

    /**
   * Is the 'window' available?
   */
    if(!window){

      /**
       *
       * Log unknown source
       *
       */
      const allowUnknownSource = '@@TAG_LOG_ALLOW_UNKNOWN_SOURCE';
      if(allowUnknownSource == 'true'){

        /**
         * Build HTTP request
         */
        var xhttpUnknownSource = new XMLHttpRequest();
        xhttpUnknownSource.open('POST', '@@TAG_LOG_URL', true);
        xhttpUnknownSource.setRequestHeader('Content-type', 'application/json');

        // send POST
        xhttpUnknownSource.send(
          btoa(JSON.stringify({
            step: step,
            sessionId: _sessionId,
            unknownSource: true
          }))
        );
      }

      return;
    }

    /**
     *
     * Check if the Tag Log is allowed for the context
     *
     */

    var allowedTagLog = false;

    /**
     * Check allowance via Client Id
     */
    if(_tagLogAllowedClientIds
      && Array.isArray(_tagLogAllowedClientIds)
      && _tagLogAllowedClientIds.length > 0
      && window.SORETO
      && window.SORETO.Client
      && window.SORETO.Client.id){

      // does the current implemented tag match a configured client id?
      allowedTagLog = _tagLogAllowedClientIds.includes(window.SORETO.Client.id);
    }

    /**
     * Check allowance via url
     */
    if(!allowedTagLog
      && _tagLogAllowedUrls
      && Array.isArray(_tagLogAllowedUrls)
      && _tagLogAllowedUrls.length > 0){

      // does the current url location match a configured url?
      allowedTagLog = _tagLogAllowedUrls.some(function (url) {
        return window.location.href.includes(url);
      });

    }

    if(!allowedTagLog){

      // not allowed
      return;
    }

    /**
     * Build the log object
     */
    var logObj = {
      step: step,
      sessionId: _sessionId,
      url: window.location.href,
      windowVarSoreto: window.SORETO,
      windowVarAWIN: window.AWIN,
    };

    Object.assign(logObj, extraProps);

    /**
     * Build HTTP request
     */
    var xhttp = new XMLHttpRequest();
    xhttp.open('POST', '@@TAG_LOG_URL', true);
    xhttp.setRequestHeader('Content-type', 'application/json');

    // send POST
    xhttp.send(
      btoa(JSON.stringify(logObj))
    );
  } catch (error) {
    console.error(error);
  }
}

/**
 * Tag Log primordial call
 */
tagLog('load');

/**
 *
 *
 *
 * TAG LOG (END)
 *
 *
 *
 */

var SoretoJS = (function (w, doc, SoretoJS) {
  'use strict';

  var BACK_URL = '@@BACK_URL';
  var _clientId = null;
  var _debugMode = false;
  var _dimensions = null;
  var _positions = null;
  var _lightboxStyles = {};
  var _onUserDataVErrorForceTSL = false;
  var _allowNoFirstnameOnTag = false;
  var clientFeatures = {};
  var _clientDomSampleConfiguration = null;
  var _staticPageDimensions = null;
  var _lightboxOriginUrlRestriction = null;
  var _campaignVersionDetails = {
    globalVars: {
      mini: {
        minimizationEnabled: false,
        launchMinimized: false,
        toggleButtonInnerHtml: '<span>-</span>',
        miniLarge: {
          minWidthBreakpointPx: 992,
          dimensions: {
            width: '300px',
            heigth: '150px'
          },
          position: {
            top: null,
            bottom: '0px',
            left: null,
            right: '0px'
          },
          closeButton: {
            show: true
          },
          border: {
            showShadow: true,
            radius: '10px'
          },
          toggleButton: {
            show: true,
            marginTop: '-15px',
            marginBottom: null,
            marginRight: null,
            marginLeft: '-15px'
          }
        },
        miniMedium: {
          minWidthBreakpointPx: 768,
          dimensions: {
            width: '100%',
            heigth: '100px'
          },
          position: {
            top: null,
            bottom: '0px',
            left: null,
            right: '0px'
          },
          closeButton: {
            show: true
          },
          border: {
            showShadow: true,
            radius: '10px'
          },
          toggleButton: {
            show: true,
            marginTop: '-15px',
            marginBottom: null,
            marginRight: null,
            marginLeft: '-15px'
          }
        },
        miniSmall: {
          minWidthBreakpointPx: 576,
          dimensions: {
            width: '100%',
            heigth: '100px'
          },
          position: {
            top: null,
            bottom: '0px',
            left: null,
            right: '0px'
          },
          closeButton: {
            show: true
          },
          border: {
            showShadow: true,
            radius: '10px'
          },
          toggleButton: {
            show: true,
            marginTop: '-15px',
            marginBottom: null,
            marginRight: null,
            marginLeft: '-15px'
          }
        }
      },
      userJourney : {
        deliverPersonalSharedUrlOnShare: false
      },
      accessibility: {
        modalAriaLabel: ''
      }
    }
  };
  var _lightboxOpeningParameters = null;

  var _dynamicRouteBaseUrl = {
    'AWIN': `@@AWIN_DYNAMIC_ROUTES_BASE_URL`,
    'PARTNERIZE': `@@PARTNERIZE_DYNAMIC_ROUTES_BASE_URL`
  };

  var hasInited = false;

  const WIDGET_STATIC_PAGE_ELEMENT_NAME = 'soretosharewidget';

  function isClientIdValid(data) {
    var valid = true;
    if(!data) {
      console.log('Soreto: SORETO variable not declared!');
      valid = false;
    }

    if(!data.Client) {
      console.log('Soreto: SORETO.Client variable not declared!');
      valid = false;
    } else if(!data.Client.id) {
      console.log('Soreto: SORETO.Client.id variable not declared!');
      valid = false;
    }

    return valid;
  }

  function externalLog(value,cb) {
    var xhttp = new XMLHttpRequest();
    xhttp.open('POST', BACK_URL+'/tracking/auditlogtag', true);
    xhttp.withCredentials = true;
    xhttp.setRequestHeader('Content-type', 'application/json');

    // add windows location to the call
    if(value){
      value.userBrowserURL = w.location.href;
    }

    xhttp.send(
      JSON.stringify(value)
    );
    xhttp.onreadystatechange = function() {
      if (xhttp.readyState === 4) {
        if (cb) {
          return cb();
        }
        return;
      }
    };
  }

  function debugLog(message, details = ''){
    if(_debugMode){
      console.log('Soreto: '+ message, details);
    }
    return;
  }

  function isDataValid(data) {
    var valid = true;
    var validConfigString =
      `%c Refer below for a valid configuration of our Soreto variable:
      // ##### SORETO TAG VARIABLE EXAMPLE #####
      var SORETO = {};
      SORETO.Client = {};
      SORETO.User = {};
      SORETO.Order = {};
      SORETO.Lightbox = {}
      /*** Set your transaction parameters ***/
      SORETO.Client.id = '123456';
      SORETO.User.firstName = 'John';
      SORETO.User.email = 'john@doe.com';
      SORETO.Order.id = 'ABCD';
      SORETO.Order.total = '100.10';
      `;
      //SORETO.Order.country = 'GB';
      //SORETO.Order.currency = '{{ Currency }}';
      //SORETO.Order.voucherCode = '{{ Voucher Code }}';
      //SORETO.testMode = true;
      //SORETO.Client.campaignVersionId = '123456';

    function isUserDataValid(){
      if(!data.User) {
        debugLog('SORETO.User variable not declared!');
        return false;
      } else {
        if(!_allowNoFirstnameOnTag) {
          if(data.User.firstName == null) {
            debugLog('SORETO.User.firstName variable not declared!');
            return false;
          } else if(data.User.firstName == '') {
            debugLog('SORETO.User.firstName cannot be empty');
            return false;
          } else if(nonLatin(data.User.firstName)){
            debugLog('SORETO.User.firstName has invalid characters');
            return false;
          }
        }

        if(data.User.email == null) {
          debugLog('%c SORETO.User.email variable not declared!','color: red');
          return false;
        } else if(data.User.email == '') {
          debugLog('%c SORETO.User.email cannot be empty','color: red');
          return false;
        } else if(!validateEmail(data.User.email) || nonLatin(data.User.email)) {
          debugLog('SORETO.User.email value is invalid!');
          return false;
        }
      }
      return true;
    }

    function isOrderDataValid(){

      if(data.originalSourceTag == 'DYNAMIC'){
        return true;
      }

      if(data.Order) {
        if(!data.Order.id) {
          debugLog('SORETO.Order.id variable not declared!');
          return false;
        } else if(data.Order.id == '') {
          debugLog('SORETO.Order.id cannot be empty');
          return false;
        }
        if(data.Order.total === undefined) {
          debugLog('SORETO.Order.total variable not declared!');
          return false;
        } else if(data.Order.total === '') {
          debugLog('SORETO.Order.total cannot be empty');
          return false;
        } else if(!isValidNumeric(data.Order.total,-1)){
          debugLog('SORETO.Order.total: ' + data.Order.total + ' is invalid. It should follow the pattern ###.##');
          return false;
        }
        return true;
      }
      return true;
    }

    if(!data.Lightbox) data.Lightbox = {};
    data.Lightbox.twoStepLightbox = clientFeatures.twoStepLightbox ? clientFeatures.twoStepLightbox : false;

    if (!clientFeatures.twoStepLightbox){

      if(_onUserDataVErrorForceTSL && !isUserDataValid()) {

        // force two steps lightbox if user data is invalid.
        data.Lightbox.twoStepLightbox = true;
        valid = isOrderDataValid();

        //log missing data from client
        data.forcedTwoStepLightbox = true;
        externalLog(data);
      }
      else {
        valid = isOrderDataValid() && isUserDataValid();
      }

    } else {

      // is a forced two step

      valid = isOrderDataValid();
      data.Lightbox.twoStepLightbox = true;
    }

    if(!valid || data.forcedTwoStepLightbox && data.originalSourceTag != 'DYNAMIC'){
      debugLog(validConfigString, 'color: red');
    } else{
      debugLog('%c Soreto Setup is done!', 'color: green');
    }
    return valid;
  }

  function isOriginUrlAllowed(lightboxOriginUrlRestriction) {

    var allowedOriginUrl = true;

    // tests Origin Url Restrictions
    if(lightboxOriginUrlRestriction){

      var whiteList = lightboxOriginUrlRestriction.whiteList;
      var blackList = lightboxOriginUrlRestriction.blackList;

      // tests Whitelist
      if(whiteList && whiteList.length > 0){
        allowedOriginUrl = whiteList.some(function (li) {
          return w.location.href.indexOf(li) > -1;
        });
      }

      if(allowedOriginUrl){
        // tests Blacklist
        if(blackList && blackList.length > 0){
          allowedOriginUrl = !blackList.some(function (li) {
            return w.location.href.indexOf(li) > -1;
          });
        }
      }
    }

    return allowedOriginUrl;
  }

  function isValidNumeric(val) {
    // If the last digit is a . then add a 0 before testing so if they type 25. it will be accepted
    val = val.toString();
    var lastChar = val.substring(val.length - 1);
    if (lastChar == '.') val = val + '0';

    var objRegExp = new RegExp('^\\d+(\\.\\d{1,25})?$', 'g');
    return objRegExp.test(val);
  }

  function validateEmail(email) {
    var re = /^[\w-+.]+@([\w-]+\.)+[\w-]{2,4}$/g;
    return re.test(String(email).toLowerCase());
  }

  function nonLatin(str) {

    // eslint-disable-next-line no-control-regex
    return /[^\u0000-\u00ff]/g.test(str);
  }

  function vanishUnsupportedFields(data) {

    // avoid null reference
    if(!data.User){
      return;
    }

    // vanish firstName if it has non-latin chars
    if(nonLatin(data.User.firstName)){
      data.originalUserFirstName = data.User.firstName;
      data.userNameVanishedNonLatin = true;
      data.User.firstName = '';
    }

    // vanish email if it has non-latin chars
    if(nonLatin(data.User.email)){
      data.originalUserEmail = data.User.email;
      data.userEmailVanishedNonLatin = true;
      data.User.email = '';
    }
  }

  function urlExists(url, cb){
    var http = new XMLHttpRequest();
    http.open('HEAD', url, true);
    http.timeout = 4000;
    http.onload = function() {
      if (this.readyState == this.DONE) {
        cb( this.status != 404 && this.status != 400 && this.status != 403);
      }
    };
    http.ontimeout = function () {
      cb( false );
    };
    http.send();
  }

  function extendObj(){
    for(var i=1; i<arguments.length; i++)
      for(var key in arguments[i])
        if(arguments[i].hasOwnProperty(key)) {
          if (typeof arguments[0][key] === 'object'
            && typeof arguments[i][key] === 'object')
            extendObj(arguments[0][key], arguments[i][key]);
          else
            arguments[0][key] = arguments[i][key];
        }
    return arguments[0];
  }

  function getClientDetails(externalId, campaignVersionId, country, sourceTag, widgetType, testMode, cb){
    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
      var DONE = 4; // readyState 4 means the request is done.
      var OK = 200; // status 200 is a successful return.

      if (xhr.readyState === DONE) {
        if (xhr.status == OK) {
          cb(JSON.parse(xhr.responseText));
        }
        else {
          console.log('Invalid Soreto client id');
        }
      }
    };

    var query = '?user_browser_url=' + btoa(w.location.href);

    if(campaignVersionId){
      query += '&campaign_version_id=' + campaignVersionId;
    }

    if(country){
      query += '&country=' + country;
    }

    if(sourceTag){
      query += '&source_tag=' + sourceTag;
    }

    if(widgetType){
      query += '&widget_type=' + widgetType;
    }

    if(testMode == true){
      query += '&test_mode=' + testMode;
    }

    xhr.open('GET', '@@BACK_URL' + '/api/v1/clients/tagdetails/' + externalId + query, true);
    xhr.withCredentials = true;
    xhr.send();
  }

  function reverbSendOrder(data) {
    var order = initOrder();
    order.setClientId(_clientId);
    order.setOrderId(data.Order.id);
    order.setOrderTotal(data.Order.total);
    order.setVoucherCode(data.Order.voucherCode);
    order.setCurrency(data.Order.currency);
    order.setCountry(data.Order.country);
    order.setBuyerEmail(data.User.email);
    order.setTestMode(data.testMode);
    order.ready();
  }

  function track (type, data){

    let t = {};
    t.type = type;
    t.clientId = _clientId;
    t.campaignVersionId = _campaignVersionDetails ? _campaignVersionDetails._id : null;
    t.sourceTag = data.sourceTag;
    t.testMode = data.testMode;

    var xhttp = new XMLHttpRequest();
    xhttp.open('POST', BACK_URL + '/api/v1/tracking', true);
    xhttp.setRequestHeader('Content-type', 'application/json');

    xhttp.send(JSON.stringify(t));
  }

  function primaryCheck (data, cb) {

    /**
     * If the INIT control flag was alerady set
     * callback false
     */
    if(window.SORETO_ALREADY_INIT){
      return cb(false);
    }

    /**
     *
     * BASIC DATA VALIDATION
     *
     */
    if(!data ||
      (
        data.affiliate !== 'AWIN' &&
        data.affiliate !== 'PARTNERIZE'
      ) ||
      !data.Client ||
      !data.Client.id ||
      data.sourceTag !== 'DYNAMIC'){

      return cb(true);
    }

    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
      var DONE = 4; // readyState 4 means the request is done.
      var OK = 200; // status 200 is a successful return.

      if (xhr.readyState === DONE) {
        if (xhr.status == OK) {
          try {

            // parse result into JSON
            let parsedContent = JSON.parse(xhr.responseText);

            // look for a config matching the current url
            let config = parsedContent.find(r => w.location.href.indexOf(r.url) > -1);

            if(!config){
              // no config found, the can't continue
              // return false
              return cb(false);
            }

            // Nike BR: 17652
            // Centaruo: BR 17806

            if(data.Client.id == '17652' || data.Client.id == '17806'){

              /**
               * PATCH: New doorman flow
               *
               * This flow will only be applied by Nike BR and Centauro BR
               *
               * When we fell ok with this strategy, it will became the new flow
               */

              // validates if there's the stategy prop
              if(!config.strategies || !Array.isArray(config.strategies) || config.strategies.length < 1){

                // no strategy found, the can't continue
                // return false
                return cb(false);
              }

              // get ordered strategies
              var strategies = config.strategies.sort(function (a, b) { return a.checkOrder - b.checkOrder; });

              // iterate over all the available strategies and search for the first match
              var dynamicConfig = strategies.find(function (strategy) {

                // does this strategy have challenges?
                if(strategy.challenges && Array.isArray(strategy.challenges) && strategy.challenges.length > 0){

                  // iterate over the strategy challenges
                  return strategy.challenges.find(function (challenge) {

                    /**
                     ***********************
                     * Query selector match
                     ***********************
                     * It will return a true when a DOM item could be found
                     * based on a attribute name and value
                     *
                     */
                    if(challenge.type == 'querySelectorMatch'){
                      return document.querySelector(`[${challenge.attribute}=${challenge.value}]`);
                    }

                  });
                }

                // there's no challenge to take
                // so, it is a simple URL match strategy
                return true;
              });

              // is there a dynamic config match?
              if(!dynamicConfig){

                // it was not possible to find a dynamic config

                // return false
                return cb(false);
              }

              /**
               * A dynamic config was found
               *
               * Let's override the current values to the ones on it
               *
               */

              if(dynamicConfig.sourceTag){

                data.sourceTag = dynamicConfig.sourceTag;
              }

              if(dynamicConfig.widget){

                data.Widget = dynamicConfig.widget;
              }

            }else {

              if(config.sourceTag){
                // override sourceTag field with the value on config file
                data.originalSourceTag = data.sourceTag;
                data.sourceTag = config.sourceTag;
              }

              if(config.widget){
                // override Widget with the value on config file
                data.Widget = config.widget;
              }
            }

            // all good!
            return cb(true);
          } catch (error) {

            // there was an error
            return cb(false);
          }
        }
        else {
          // request error
          return cb(false);
        }
      }
    };

    var baseDynamicRouteUrl = _dynamicRouteBaseUrl[data.affiliate];

    xhr.open('GET', `${baseDynamicRouteUrl}${data.Client.id}.json`, true);
    xhr.send();
  }

  /**
   * Initialize the TAG
   */
  function init(data) {


    primaryCheck(data, function (canContinue) {

      if(window.SORETO_ALREADY_INIT || !canContinue){

        /**
         * Tag Log init-blocked-already-init
         */
        tagLog( window.SORETO_ALREADY_INIT ? 'init-blocked-already-init' : 'init-blocked-doorman');

        return;
      }

      /**
       * Tag Log init-started
       */
      tagLog('init-started');

      // this flag controls concurrent opening requests
      window.SORETO_ALREADY_INIT = true;

      /**
     * Pre validaton of required fields on the tag
     */
      if(!isClientIdValid(data)){
        return;
      }

      /**
     * Get Client Details
     */
      getClientDetails(
        data.Client.id,
        data.Client.campaignVersionId,
        (data.Order && data.Order.country) ? data.Order.country : data.Client.country,
        data.sourceTag,
        (data.Widget ? data.Widget.widgetType : null),
        data.testMode,
        (details) => {

          let clientTagDetails = details.clientTagDetails;
          let campaingVersionDetails = details.campaingVersionTagDetails;

          _clientId = clientTagDetails.clientId ? clientTagDetails.clientId : '';
          _debugMode = clientTagDetails.debugMode ? clientTagDetails.debugMode : false;
          _dimensions = clientTagDetails.dimensions ? clientTagDetails.dimensions : null;
          _positions = clientTagDetails.positions ? clientTagDetails.positions : null;
          _lightboxStyles = clientTagDetails.lightboxStyles ? clientTagDetails.lightboxStyles : {};
          clientFeatures = clientTagDetails.features ? clientTagDetails.features : {};
          _clientDomSampleConfiguration = clientTagDetails.domSample;
          _onUserDataVErrorForceTSL = clientTagDetails.onUserDataVErrorForceTSL ? clientTagDetails.onUserDataVErrorForceTSL : false;
          _allowNoFirstnameOnTag = clientTagDetails.allowNoFirstnameOnTag ? clientTagDetails.allowNoFirstnameOnTag : false;
          _lightboxOriginUrlRestriction = clientTagDetails.lightboxOriginUrlRestriction;
          _staticPageDimensions = clientTagDetails.staticPageDimensions ? clientTagDetails.staticPageDimensions : null;

          // merge fixed Campaign Version Details with data from API
          _campaignVersionDetails = extendObj(_campaignVersionDetails, campaingVersionDetails);

          let lightboxLaunchTimeout = 1500;
          let showLightbox = clientTagDetails.showLightboxOnConfirmationPage;
          let showSoretoWidget = false; // Optional, false by default. Opens lightbox as static page
          let widgetType = '';

          vanishUnsupportedFields(data);

          externalLog(data);

          // validates invalid data from TAG
          if(!isDataValid(data)){
            data.invalidTagArgs = true;
            externalLog(data);
            return;
          }

          // if the client is inactive and it is not a test
          // should not open the lightbox
          if(!data.testMode && clientTagDetails.active == false){
            showLightbox = false;
          }

          // is the client configured not to show the lightbox?
          if(clientTagDetails.showLightbox === false){
            showLightbox = false;
          }

          // validates if there's no Campaign Version available
          if(!_campaignVersionDetails._id){
            data.noAvailableCampaign = true;
            externalLog(data);
            showLightbox = false;
          }

          // tests Origin Url Restrictions
          if(!isOriginUrlAllowed(_lightboxOriginUrlRestriction)){

            if(_debugMode){
              data.blockedByOriginUrl = true;
              externalLog(data);
            }

            return;
          }

          if(data.Order){
            debugLog('Start send order');
            reverbSendOrder(data);
            debugLog('End send order');
          } else {
            debugLog('no order');
          }

          sendEvent({
            event: 'REFERRED PAGE VIEW',
            properties: {
              client_id: clientTagDetails.clientId,
              referrer: w.location.href
            }
          });

          // lightbox show is already false?
          if(showLightbox != false){

            if(data.Lightbox && ('doNotShow' in data.Lightbox)){
              debugLog('Local do not show value is:'+ data.Lightbox.doNotShow);
              if(data.Lightbox.doNotShow){
                showLightbox = false; // if do not show is true don't show lightbox
              }else{
                showLightbox = true; // if do not show is false then explicitly show lightbox
              }
            }
          }

          // lightbox show is already false?
          if(showLightbox != false){

            if(data.Lightbox && ('show' in data.Lightbox)){

              debugLog('Local show prop value is:'+ data.Lightbox.show);

              if(data.Lightbox.show == false){
                showLightbox = false; // if do not show is true don't show lightbox
              }else{
                showLightbox = true; // if do not show is false then explicitly show lightbox
              }
            }
          }

          if(data.Widget && ('showWidget' in data.Widget) && ('widgetType' in data.Widget)){
            debugLog('Local do widget show value is:'+ data.Widget);
            if(data.Widget.showWidget){
              showSoretoWidget = true;
            }else{
              showSoretoWidget = false;
            }

            if(data.Widget.widgetType){
              widgetType = data.Widget.widgetType;
            }
          }

          if(SoretoJS.orderObj){
            debugLog('Start generate pixel');
            setTrackingPixel(SoretoJS.orderObj);
            debugLog('End generate pixel');

            //Check if minimum order value required to show lightbox is present in the global vars
            if (_campaignVersionDetails.globalVars && _campaignVersionDetails.globalVars.showLightboxMinimumOrderValue){

              //Check if order value is lower than minimum order value required to show lightbox, if so, lightbox should not be shown
              if(SoretoJS.orderObj.orderTotal < _campaignVersionDetails.globalVars.showLightboxMinimumOrderValue){
                showLightbox = false;
              }
            }
          }

          debugLog('Start open lightbox');

          if(data.Lightbox){
            if (data.Lightbox.lightboxLaunchTimeout != null){ //allow timeout to be 0
              lightboxLaunchTimeout = data.Lightbox.lightboxLaunchTimeout;
            }
          }

          SoretoJS.opts = {
            timeout: lightboxLaunchTimeout,
            firstName: data.User.firstName,
            email: data.User.email,
            testMode: data.testMode,
            campaignVersionId: _campaignVersionDetails._id,
            dimensions: _dimensions,
            positions: _positions,
            country: data.Order ? data.Order.country : '',
            sourceTag: data.sourceTag,
            twoStepLightbox : data.Lightbox.twoStepLightbox,
            showSoretoWidget : showSoretoWidget,
            widgetType : widgetType,
            staticPageDimensions: _staticPageDimensions,
            blockMinimization: data.blockMinimization
          };

          // keep this data to be used later when necessary
          // eg: programmatically lightbox opening.
          _lightboxOpeningParameters = data;

          // show lightbox?
          if(showLightbox){

            debugLog('the lightbox has been set to show.');

            /**
             * Tag Log opening-lightbox
             */
            tagLog('opening-lightbox');

            SoretoJS.openLightbox(data);
          }
          else {
            debugLog('the lightbox has been set not to show.');
          }

          /**
           * Apply specific patch functionalities
           */
          initPatch(_clientId);

          debugLog('End open lightbox');
        });
    });
  }

  let initPatched =  false;

  /**
   * Apply client specific patches in the init process
   */
  function initPatch(clientId) {

    // is the PassMeFast client?
    if(clientId === '644ab5137008b30ff92276c6'){

      if(initPatched){
        return;
      }

      initPatched = true;

      /**
       * Passmefast patch
       *
       * It should listen to url changes, since their website is a SPA
       *
       * The lightbox should be shown only in a navigation from the payment process
       * and only in the dashboard page a single time
       */

      var dashboardUrlStaging = 'students-staging.passmefast.co.uk/dashboard';
      var friendReferUrlStaging = 'students-staging.passmefast.co.uk/refer-a-friend';
      var dashboardUrlProd = 'students.passmefast.co.uk/dashboard';
      var friendReferUrlProd = 'students.passmefast.co.uk/refer-a-friend';

      var alreadyOpenedConfirmationTimeout = 2000;

      var lightboxAlreadyOpened = false;
      var staticPageAlreadyOpened = false;

      try {

        // the navigation comes from the payment flow, let's start to listen to route changes

        let previousUrl = '';

        // instantiating the observer
        const observer = new MutationObserver(function () {

          // there was a navigation?
          if (window.location.href !== previousUrl) {

            // is the current page the dashboard?
            if(
              (
                window.location.href.includes(dashboardUrlStaging)
                ||
                window.location.href.includes(dashboardUrlProd)
              )
              && !lightboxAlreadyOpened
            ){

              // start the timeout to set it as already opened
              // it is going to prevent a "false opening" among system flow redirections
              setTimeout(() => {

                // does the current location matches the desired one yet?
                if(window.location.href.includes(dashboardUrlStaging)
                  || window.location.href.includes(dashboardUrlProd)){

                  /**
                   *  DASHBOARD
                   */

                  // reinit soreto var
                  var SORETO = {};
                  SORETO.Client = {};
                  SORETO.User = {};
                  SORETO.Client.id = '644ab5137008b30ff92276c6';

                  SORETO.sourceTag = 'CONFIRMATION_PAGE';

                  window.SORETO = SORETO;

                  // reset variables
                  window.SORETO_ALREADY_INIT = false;
                  _lightboxOpeningParameters = false;

                  SoretoJS.reInit();

                  if(!lightboxAlreadyOpened){
                    hasInited = false;
                  }

                  // show lightbox
                  SoretoJS.showLightbox();

                  lightboxAlreadyOpened = true;

                }
              }, alreadyOpenedConfirmationTimeout);

            }
            else if (window.location.href.includes(friendReferUrlStaging)
              || window.location.href.includes(friendReferUrlProd)) {

              /**
               *  REFER A FRIEND
               */

              if(doc.getElementById('uglipop_overlay_wrapper')){
                doc.getElementById('uglipop_overlay_wrapper').style.display = 'none';
                doc.getElementById('uglipop_overlay').style.display = 'none';
                doc.getElementById('uglipop_content_fixed').style.display = 'none';
              }

              var soretoIFrame = doc.getElementById('soretoIFrame');

              if(soretoIFrame){
                soretoIFrame.remove();
              }

              // reinit soreto var
              var SORETO = {};
              SORETO.Client = {};
              SORETO.User = {};
              SORETO.Client.id = '644ab5137008b30ff92276c6';

              SORETO.Widget = {};
              SORETO.Widget.showWidget = true;
              SORETO.Widget.widgetType = 'sharestaticpage';
              SORETO.sourceTag = 'STATIC_PAGE_ON_CLIENT';

              // reset variables
              window.SORETO = SORETO;
              window.SORETO_ALREADY_INIT = false;
              _lightboxOpeningParameters = false;

              SoretoJS.reInit();

              if(!staticPageAlreadyOpened){
                hasInited = false;
              }

              SoretoJS.showLightbox();

              staticPageAlreadyOpened = true;
            }
            else if(lightboxAlreadyOpened){

              doc.getElementById('uglipop_overlay_wrapper').style.display = 'none';
              doc.getElementById('uglipop_overlay').style.display = 'none';
              doc.getElementById('uglipop_content_fixed').style.display = 'none';
            }

            previousUrl = window.location.href;
          }
        });

        observer.observe(document, { subtree: true, childList: true });

      } catch (error) {
        console.error(error);
      }
    }
  }

  function sendEvent(payload) {
    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
      var DONE = 4; // readyState 4 means the request is done.
      var OK = 200; // status 200 is a successful return.

      if (xhr.readyState === DONE) {
        if (xhr.status !== OK) {
          console.log(xhr.status); // An error occurred during the request.
        }
      }
    };

    xhr.open('GET', BACK_URL + '/analytics?clientId=' + _clientId + '&info=' + encodeInfo(payload), true);
    xhr.withCredentials = true;
    xhr.send();
  }

  function setTrackingPixel(orderObj) {

    orderObj.sdkv = 'soreto_js';
    orderObj.userBrowserURL = w.location.href;

    var ensSoretoImg = document.createElement('img');
    ensSoretoImg.setAttribute('id', 'reverbPixel');
    ensSoretoImg.style.display = 'none';

    document.body.appendChild(ensSoretoImg);

    if (doc.getElementById('reverbPixel')) {
      var reverbPixel = doc.getElementById('reverbPixel');

      debugLog('soreto pixel called');

      var encodedInfo = encodeInfo(orderObj);
      reverbPixel.src = BACK_URL + '/tracking/reverbpixel.png?info=' + encodedInfo;
      return;
    }
  }

  function initOrder() {
    var self = SoretoJS;
    var obj = {};
    obj.orderObj = {};
    obj.orderObj.lineItems = [];

    obj.setClientId = function (clientId) {
      this.orderObj.clientId = clientId;
    };

    obj.setBuyerEmail = function (email) {
      this.orderObj.buyerEmail = email;
    };

    obj.setTestMode = function (testMode) {
      this.orderObj.testMode = testMode ? testMode : false;
    };

    obj.setOrderId = function (orderId) {
      debugLog('soreto.order.id:'+ orderId);
      this.orderObj.orderId = orderId;
    };

    obj.setVoucherCode = function (voucherCode) {
      if(voucherCode){
        this.orderObj.voucherCode = voucherCode;
      }
    };

    obj.setOrderTotal = function (total) {
      var totalAsFloat =  parseFloat(total);
      function evenRound(num, decimalPlaces) {//bankers rounding
        var d = decimalPlaces || 0;
        var m = Math.pow(10, d);
        var n = +(d ? num * m : num).toFixed(8); // Avoid rounding errors
        var i = Math.floor(n), f = n - i;
        var e = 1e-8; // Allow for rounding errors in f
        var r = (f > 0.5 - e && f < 0.5 + e) ?
          ((i % 2 == 0) ? i : i + 1) : Math.round(n);
        return d ? r / m : r;
      }

      function precision(a) {
        if (!isFinite(a)) return 0;
        var e = 1, p = 0;
        while (Math.round(a * e) / e !== a) { e *= 10; p++; }
        return p;
      }

      if(precision(totalAsFloat)>6){
        totalAsFloat = evenRound(totalAsFloat,6);
      }

      debugLog('soreto.order.total:'+ totalAsFloat);
      this.orderObj.orderTotal = totalAsFloat;
    };

    obj.addLineItem = function (name, description, sku, quantity, price, category) {
      this.orderObj.lineItems.push({
        name: name,
        description: description,
        sku: sku,
        quantity: quantity,
        price: price,
        category: category
      });
    };

    obj.setCurrency = function (currency) {
      if(currency){
        this.orderObj.currency = currency;
      }
    };

    obj.setCountry = function (country) {
      if(country){
        this.orderObj.country = country;
      }
    };

    obj.ready = function () {
      debugLog('soreto.ready.called: true');
      self.orderObj = this.getOrder();
    };

    obj.getOrder = function () {
      return this.orderObj;
    };

    return obj;
  }

  function encodeInfo (order) {
    return btoa(JSON.stringify(order));
  }

  //REVERB BLOCK - END

  //REVERBLIGHTBOX BLOCK - START

  function validateProducts(prods){
    if (!prods.length){
      return false;
    }
    for(var i = 0; i < prods.length; i++){
      var item = prods[i];
      if(!item.hasOwnProperty('image')||!item.hasOwnProperty('productUrl')){
        console.error('Soreto failed to launch: Product '+ (i+1) + ' is missing a required value');
        return false;
      }
    }
    return true;
  }

  function takeDomSample(skipRateValidation) {

    try {

      // is there any configuration?
      if(!_clientDomSampleConfiguration){
        return;
      }

      // find a configuration matching the current browser url
      let allowedConfig = _clientDomSampleConfiguration.find((au) => {
        return !au.url || window.location.href.includes(au.url);
      });

      // is there any configuration available?
      // is the sampleRate configured?
      if(!allowedConfig ||
        !allowedConfig.sampleRate ||
        isNaN(allowedConfig.sampleRate)){
        return;
      }

      // calc the samplerate
      if(!skipRateValidation){
        if(!(Math.random() < allowedConfig.sampleRate / 100)){
          return;
        }
      }

      var sampleDelay = ((allowedConfig.delay && !isNaN(allowedConfig.delay))? allowedConfig.delay : 3000);

      setTimeout(function () {

        try {

          // Inject DOM sample script
          const script = document.createElement('script');
          script.async = true;
          script.src = '@@TAG_ANALYSIS_SCRIPT_URL/dsample/' + _clientId + '.min.js';
          document.head.appendChild(script);

        } catch (error) {
          console.error(error);
        }

      }, sampleDelay);

    } catch (error) {
      console.error(error);
    }
  }

  SoretoJS.settings = {
    dimensions:{
      dimD:{
        w:'800px',
        h:'500px'
      },
      dimT:{
        w:'800px',
        h:'500px'
      },
      dimM:{
        w:'300px',
        h:'450px'
      }
    },
    breakpoints:{
      dimT:'1024px',
      dimM:'850px'
    },
    positions:{
      posD: {
        top: '50%',
        left: '50%'
      },
      posT: {
        top: '50%',
        left: '50%'
      },
      posM: {
        top: '50%',
        left: '50%'
      }
    },
    borderRadius:'10px',
    backgroundDim:true,
    dropShadow:true,
    clickBackgroundToClose:false,
    showCloseButton:true,
    closeButtonStyle:'hoverOut',
    closeButtonColor:'white'
  };

  /**
   * Export 'init' method to be called from outside
   */
  SoretoJS.reInit = function () {

    /**
     * Tag Log reload
     */
    tagLog('reload');

    // call init
    init(window.SORETO);
  };

  SoretoJS.staticPageSettings = {
    dimensions:{
      dimD:{
        w:'100%',
        h:'100%'
      },
      dimT:{
        w:'100%',
        h:'100%'
      },
      dimM:{
        w:'100%',
        h:'100%'
      }
    }
  };

  SoretoJS.initLightbox = function (se) {

    // create basic elements
    var overlay = doc.createElement('div');
    var content_fixed = doc.createElement('div');
    var popbox = doc.createElement('div');
    var overlay_wrapper = doc.createElement('div');
    var close_button = doc.createElement('div');
    var close_text = doc.createElement('span');

    let mini = se.campaignVersionDetails && se.campaignVersionDetails.globalVars ? se.campaignVersionDetails.globalVars.mini : null;

    /////////////////
    // CONTENT FIXED
    /////////////////
    content_fixed.id = 'uglipop_content_fixed';
    content_fixed.className = 'uglipop_content_fixed';
    content_fixed.setAttribute('role', 'dialog');
    content_fixed.setAttribute('aria-modal', 'true');
    content_fixed.setAttribute('aria-label', se.campaignVersionDetails.globalVars.accessibility.modalAriaLabel);

    ///////////////
    // CLOSE BUTTON
    ///////////////

    close_button.id = 'closeButton';
    close_button.className += ' reverb-lightbox-close';
    close_button.setAttribute('aria-label', 'Close');

    close_button.onclick = function () {
      return mini.minimizationEnabled == true ? SoretoJS.toggleLightboxState('closeButton') : SoretoJS.close();
    };

    close_text.className = 'default-close-text';
    close_text.innerHTML = mini && mini.minimizationEnabled == true? '-' : 'x';
    close_button.appendChild(close_text);

    // if there is any version of render set on CPV, no close button must show
    // this outside close button is part of the old implemenattion
    if(se.campaignVersionDetails.globalVars && se.campaignVersionDetails.globalVars.lightboxRenderVersion){
      se.showCloseButton = false;
    }

    // add to content_fixed
    content_fixed.appendChild(close_button);

    /////////////////
    // POP BOX
    /////////////////

    popbox.id = 'uglipop_popbox';

    // add to content_fixed
    content_fixed.appendChild(popbox);

    /////////////////
    // OVERLAYS
    /////////////////
    overlay.id = 'uglipop_overlay';
    overlay_wrapper.id = 'uglipop_overlay_wrapper';

    if (se.backgroundDim){

      overlay_wrapper.setAttribute('style', 'position:absolute;top:0;bottom:0;left:0;right:0;');
      overlay.setAttribute('style', 'position:fixed;top:0;bottom:0;left:0;right:0;width:100%;height:100%;opacity:0.3;background-color:black;');

      for (var overlayStyle in se.overlayStyles) {
        if (se.overlayStyles.hasOwnProperty(overlayStyle)) {
          overlay.style.setProperty(overlayStyle, se.overlayStyles[overlayStyle]);
        }
      }
    }

    // add overlay to overlay_wrapper
    overlay_wrapper.appendChild(overlay);

    // append overlay_wrapper and content_fixed to body
    doc.body.appendChild(overlay_wrapper);
    doc.body.appendChild(content_fixed);

    // set the overlays and content_fixed the hide class
    overlay_wrapper.classList.add('hide');
    overlay.classList.add('hide');
    content_fixed.classList.add('hide');

    var insertDropShadow = function(){
      return'-webkit-box-shadow: 0px 0px 20px 3px rgba(0,0,0,0.75);\
        -moz-box-shadow: 0px 0px 20px 3px rgba(0,0,0,0.75);\
        box-shadow: 0px 0px 20px 3px rgba(0,0,0,0.75);';
    };

    var insertCloseButtonStyles = function(styleName){
      if (styleName == 'hoverIn'){
        return'div.reverb-lightbox-close{\
          width: 25px;\
          height: 35px;\
          position: absolute;\
          top: 0;\
          right: 0;\
          cursor:pointer;\
          color: '+ se.closeButtonColor +';\
          text-align: center;\
          display: '+ (se.showCloseButton ? 'inline-block;': 'none;') +'\
          z-index:2147483647;\
        }\
        div.reverb-lightbox-close span{\
          display:none;\
          content:"";\
        }\
        div.reverb-lightbox-close:after{\
          display: inline-block;\
          content: "\\00d7";\
          font-size: 34px;\
          font-weight: 100;\
          line-height: 19px;\
        }';
      }else if (styleName == 'squareIn'){
        return'div.reverb-lightbox-close{\
          position: absolute;\
          right: 2px;\
          top: 5px;\
          width: 27px;\
          background-color: '+ se.closeButtonBGColor +';\
          text-align: center;\
          cursor:pointer;\
          height: 23px;\
          font-family: Arial;\
        }\
        div.reverb-lightbox-close span{\
          display:none;\
          content:"";\
        }\
        div.reverb-lightbox-close::before{\
          color: '+ se.closeButtonColor +';\
          content: "\\2715";\
          font-size: 17px;\
          font-weight: 100;\
        }';
      }else if (styleName == 'custom'){
        return'div.reverb-lightbox-close{\
          position: absolute;\
          right: '+ se.closeButtonSpaceRight +';\
          top: '+ se.closeButtonSpaceTop +';\
          width: '+ se.closeButtonImageWidth +';\
          height: '+ se.closeButtonImageHeight +';\
          background-size: cover !important;\
          background: url('+ se.closeButtonImageURL +') no-repeat center;\
          cursor:pointer;\
        }\
        div.reverb-lightbox-close span{\
          display:none;\
          content:"";\
        }';
      }

      return'div.reverb-lightbox-close{\
        width: 35px;\
        height: 35px;\
        position: absolute;\
        top: 0;\
        right: 0;\
        margin-top: -13px;\
        margin-right: -13px;\
        cursor:pointer;\
        color: '+ se.closeButtonColor +';\
        border-radius: 50%;\
        background: #2d2d2d;\
        text-align: center;\
        display: '+ (se.showCloseButton ? 'inline-block;': 'none;') +'\
        -webkit-box-shadow: -1px 1px 5px 0px rgba(77,77,77,1);\
        -moz-box-shadow: -1px 1px 5px 0px rgba(77,77,77,1);\
        box-shadow: -1px 1px 5px 0px rgba(77,77,77,1);\
        z-index:2147483647;\
      }\
      div.reverb-lightbox-close span {\
        font-family: sans-serif;\
        -webkit-font-smoothing: auto;\
        line-height: 35px;\
        font-size: 20px;\
        font-weight: 400;\
      }';
    };

    if (se.clickBackgroundToClose){
      overlay.onclick = function () {
        return SoretoJS.close();
      };
    }

    //
    // LIGHTBOX DIMENSION
    //
    // * overrides the default value when it is set on the campaign version global var
    //
    var cvLightboxDimensions = se.campaignVersionDetails.globalVars.lightboxDimensions;

    // large
    var largeDimensions = {
      w: (cvLightboxDimensions && cvLightboxDimensions.large && cvLightboxDimensions.large.w) || se.dimensions.dimD.w,
      h: (cvLightboxDimensions && cvLightboxDimensions.large && cvLightboxDimensions.large.h) || se.dimensions.dimD.h
    };

    // medium
    var mediumDimensions = {
      w: (cvLightboxDimensions && cvLightboxDimensions.medium && cvLightboxDimensions.medium.w) || se.dimensions.dimT.w,
      h: (cvLightboxDimensions && cvLightboxDimensions.medium && cvLightboxDimensions.medium.h) || se.dimensions.dimT.h
    };

    // small
    var smallDimensions = {
      w: (cvLightboxDimensions && cvLightboxDimensions.small && cvLightboxDimensions.small.w) || se.dimensions.dimM.w,
      h: (cvLightboxDimensions && cvLightboxDimensions.small && cvLightboxDimensions.small.h) || se.dimensions.dimM.h
    };

    var styleLightbox = doc.createElement('style');

    styleLightbox.innerHTML = '.reverb-lightbox{\
      border-radius: '+se.borderRadius+';\
      background-color:white;\
      overflow: hidden;\
      '+(se.dropShadow ? insertDropShadow():'')+'\
      height:100%;\
    }\
    .uglipop_content_fixed {\
      width:'+largeDimensions.w+';\
      height:'+largeDimensions.h+';\
      top:'+se.positions.posD.top+';\
      left:'+se.positions.posD.left+';\
      position:fixed;\
      transform: translate(-50%, -50%);\
      -webkit-transform: translate(-50%, -50%);\
      -ms-transform: translate(-50%, -50%);\
    }\
    @media screen and (max-width: '+se.breakpoints.dimT+'){\
      .uglipop_content_fixed {\
        width: '+mediumDimensions.w+';\
        height: '+mediumDimensions.h+';\
        top:'+se.positions.posT.top+';\
        left:'+se.positions.posT.left+';\
      }\
    }\
    @media screen and (max-width: '+se.breakpoints.dimM+'){\
      .uglipop_content_fixed {\
        width: '+smallDimensions.w+';\
        height: '+smallDimensions.h+';\
        top:'+se.positions.posM.top+';\
        left:'+se.positions.posM.left+';\
      }\
    }\
    .uglipop_content_fixed{\
      z-index:2147483647;\
    }\
    #uglipop_overlay_wrapper{\
      z-index:2147483647;\
    }\
    #uglipop_popbox > iframe{\
      display:block;\
    }\
    .reverb-lightbox-iframe {\
      overflow: hidden;\
      width: 100%;\
      height: 100%;\
      border: none;\
    }\
    .hide {\
      display: none !important;\
      height: 0px !important;\
      opacity: 0 !important;\
      transition: all 200ms linear !important;\
    }\
    '+ (insertCloseButtonStyles(se.closeButtonStyle));

    // add main lightbox style DOM element to the document
    doc.head.appendChild(styleLightbox);

    ///////////////////
    // MINI STYLES
    ///////////////////

    // is the minification enabled?
    if(mini && mini.minimizationEnabled == true){

      // default mini styles
      var styleMiniLightbox = `

        .uglipop_content_fixed_mini {
          position: fixed;
          opacity: 1;
          z-index: 2147483647;
        }

        .uglipop_content_fixed_mini > div.reverb-lightbox {
          background-color: transparent;
        }

        /* hide toogle button when the lightbox window is in regular size */
        div.reverb-lightbox-close > .toggle-button {
          display: none;
        }

        /* display toogle button when the lightbox window is in mini mode */
        div.reverb-lightbox-close-mini > .toggle-button {
          display: block;
        }

        /* hide regular close button content when the lightbox window is in mini mode */
        div.reverb-lightbox-close-mini > .default-close-text {
          display: none;
        }
      `;

      var last = null;

      // iterate over all mini options by size
      for(let size of [mini.miniLarge, mini.miniMedium, mini.miniSmall]){

        styleMiniLightbox += `

          @media screen and (min-width: ${size.minWidthBreakpointPx}px)
            ${last ? `and (max-width: ${last.minWidthBreakpointPx}px)` : ''}
          {

              /* this class defines the size and position of the mini version of the lightbox */

              .uglipop_content_fixed_mini {
                width: ${ size.dimensions.width };
                height: ${ size.dimensions.heigth };
                top: ${ size.position.top || 'auto' };
                bottom: ${ size.position.bottom || 'auto' };
                left: ${ size.position.left || 'auto' };
                right: ${ size.position.right || 'auto' };
              }

              .uglipop_content_fixed_mini iframe {
                height: ${ size.dimensions.heigth };
              }

              /* this class defines the size and position of the close icon */

              div.reverb-lightbox-close-mini {
                display: ${size.closeButton.show == true ? 'block' : 'none'} !important;
                top: ${ size.position.top ? 'auto' : '0px' } !important;
                bottom: ${ size.position.bottom ? 'auto' : '0px' } !important;
                right: ${ size.position.right ? 'auto' : '0px'  } !important;
                left: ${ size.position.left ? 'auto' : '0px'  } !important;
                margin-top: ${ size.closeButton.marginTop || 'auto' } !important;
                margin-bottom: ${ size.closeButton.marginBottom || 'auto' } !important;
                margin-right: ${ size.closeButton.marginRight || 'auto' } !important;
                margin-left: ${ size.closeButton.marginLeft || 'auto' } !important;
              }

              /* this class defines the aspects of the "border" of the lightbox */

              .reverb-lightbox-mini {
                border-radius: ${size.border.radius} !important;
                ${size.border.showShadow == false ? 'box-shadow:none !important;': ''}
              }
          }
        `;

        last = size;
      }

      // create mini style DOM element
      let miniStyle = doc.createElement('style');
      miniStyle.innerHTML = styleMiniLightbox;

      // add mini style element to the doc
      doc.head.appendChild(miniStyle);

      // is there a custom toggle button HTML
      if(mini.toggleButtonInnerHtml){

        // it only will be visible on mini mode
        var toggleButton = doc.createElement('div');
        toggleButton.classList.add('toggle-button');
        toggleButton.innerHTML = mini.toggleButtonInnerHtml;

        close_button.append(toggleButton);
      }
    }

    hasInited = true;
  };

  SoretoJS.initShareStaticPage = function (staticPageSettings) {

    // new style section
    var staticPageWidget = doc.createElement('style');

    staticPageWidget.innerHTML = '.reverb-static-lightbox{\
      width:'+staticPageSettings.dimensions.dimD.w+';\
      height:'+staticPageSettings.dimensions.dimD.h+';\
    }\
    #'+WIDGET_STATIC_PAGE_ELEMENT_NAME+' {\
      width:'+staticPageSettings.dimensions.dimD.w+';\
      height:'+staticPageSettings.dimensions.dimD.h+';\
    }\
    #'+WIDGET_STATIC_PAGE_ELEMENT_NAME+' > iframe{\
      display:block;\
    }\
    .reverb-static-lightbox-iframe {\
      overflow: hidden;\
      width: 100%;\
      height: 100%;\
      border: none;\
    }\
    ';

    doc.head.appendChild(staticPageWidget);

    hasInited = true;
  };

  SoretoJS.openLightbox  = function (data) {

    var self = SoretoJS;
    var opts = SoretoJS.opts;

    var email = opts.email ? opts.email : '' ;
    var first_name = opts.firstName ? opts.firstName : '';
    var test_mode = opts.testMode ? opts.testMode : '';
    var campaign_version_id = opts.campaignVersionId ? opts.campaignVersionId : '' ;
    var country = opts.country ? opts.country : '' ;
    var source_tag = opts.sourceTag ? opts.sourceTag : '' ;
    var two_step_lightbox = opts.twoStepLightbox ? opts.twoStepLightbox : '' ;
    var client_order_id =  data.Order && data.Order.id ? data.Order.id : '';
    var user_browser_url = w.location.href;
    var minimization_enabled = _campaignVersionDetails.globalVars.mini.minimizationEnabled;
    var window_sizes = { x: window.innerWidth, y: window.innerHeight };

    // dpsuonshare : deliver_personal_su_on_share (a short version to save size on the placement url)
    var dpsuonshare = _campaignVersionDetails.globalVars.userJourney.deliverPersonalSharedUrlOnShare;
    var referrer = doc.referrer;

    if(opts.products && !validateProducts(opts.products)){
      return;
    }
    var products = opts.products;

    if(opts.showSoretoWidget){

      // Change the default dimensions data
      if(opts.staticPageDimensions)
      {
        SoretoJS.staticPageSettings.dimensions = opts.staticPageDimensions;
      }

      let extendedSettings = extendObj(SoretoJS.staticPageSettings, data.staticPageSettings);

      if(opts.widgetType == 'sharestaticpage'){

        hasInited == false ? SoretoJS.initShareStaticPage(extendedSettings) : null;

        setTimeout (function () {

          let encodedData = {
            products,
            email,
            first_name,
            test_mode,
            campaign_version_id,
            country,
            sourceTag: source_tag,
            client_order_id,
            two_step_lightbox,
            user_browser_url,
            minimization_enabled,
            window_sizes,
            dpsuonshare,
            referrer,
            sdkv: 'soreto_js'
          };

          let encoded = encodeInfo(encodedData);
          var soretoUrl = BACK_URL + '/placement/'+ _clientId +'/sharestaticpage?encoded=' + encoded;

          urlExists(soretoUrl,function(isValidUrl){
            if (isValidUrl){
              self.inject({
                class: opts.class || 'reverb-static-lightbox', //styling class for Modal
                source: 'html',
                content: '<iframe class="reverb-static-lightbox-iframe" src="'+ soretoUrl +'" allow="clipboard-read; clipboard-write"></iframe>'
              });

              // store the data options into a window variable to be used by the dom sample
              window.SORETO_PLACEMENT_OPTIONS = {
                campaignVersionId : campaign_version_id,
                minimizationEnabled: minimization_enabled,
                sourceTag: source_tag
              };

              takeDomSample();
            }
          });

        }, opts.timeout || 1000);
      }

    }else {

      // Change the default dimensions data
      if(opts.dimensions){
        SoretoJS.settings.dimensions = opts.dimensions;
      }
      // Change the default positions data
      if(opts.positions){
        SoretoJS.settings.positions = opts.positions;
      }

      // possible settings
      // - SoretoJS.settings : fixed in this file default
      // - data.lighboxSettings : data from TAG implementation fields
      // - _lightboxStyles : from Client's meta information field
      // _campaignVersionDetails

      let extendedSettings = extendObj(SoretoJS.settings, data.lighboxSettings, _lightboxStyles, { campaignVersionDetails : _campaignVersionDetails});

      hasInited == false ? SoretoJS.initLightbox(extendedSettings) : null;

      setTimeout (function () {

        let encodedData = {
          products,
          email,
          first_name,
          test_mode,
          campaign_version_id,
          country,
          source_tag,
          client_order_id,
          two_step_lightbox,
          user_browser_url,
          minimization_enabled,
          window_sizes,
          dpsuonshare,
          referrer,
          sdkv: 'soreto_js'
        };

        let encoded = encodeInfo(encodedData);
        var soretoUrl = '';

        if(campaign_version_id &&
          extendedSettings.campaignVersionDetails &&
          extendedSettings.campaignVersionDetails.globalVars &&
          extendedSettings.campaignVersionDetails.globalVars.lightboxRenderVersion){
          soretoUrl = BACK_URL +
            '/lightbox/v' + extendedSettings.campaignVersionDetails.globalVars.lightboxRenderVersion +
            '/' + _clientId + '/' + campaign_version_id +
            '?encoded=' + encoded;
        }else {
          soretoUrl = BACK_URL + '/placement/'+ _clientId +'/lightbox?encoded=' + encoded;
        }

        urlExists(soretoUrl, function(isValidUrl){
          if (isValidUrl){
            self.popup({
              class: opts.class || 'reverb-lightbox reverb-lightbox-mini', //styling class for Modal
              source: 'html',
              miniMode: _campaignVersionDetails.globalVars.mini.minimizationEnabled,
              launchMinimized: opts.blockMinimization === false ? false : _campaignVersionDetails.globalVars.mini.launchMinimized,
              content: '<iframe id="soretoIFrame" class="reverb-lightbox-iframe" src="'+ soretoUrl +'" allow="clipboard-read; clipboard-write"></iframe>'
            });

            // store the data options into a window variable to be used by the dom sample
            window.SORETO_PLACEMENT_OPTIONS = {
              campaignVersionId : campaign_version_id,
              minimizationEnabled: minimization_enabled,
              sourceTag: source_tag
            };

            takeDomSample();
          }
        });

      }, opts.timeout || 1000);
    }
  };

  SoretoJS.popup = function (config) {

    if (config) {
      if (typeof config.class == 'string' && config.class) {
        doc.getElementById('uglipop_popbox').setAttribute('class', config.class);
      }
      if (config.keepLayout && (!config.class)) {
        doc.getElementById('uglipop_popbox').setAttribute('style', 'position:relative;height:300px;width:300px;background-color:white;opacity:1;');
      }

      if (typeof config.content == 'string' && config.content && config.source == 'html') {
        doc.getElementById('uglipop_popbox').innerHTML = config.content;
      }

      if (typeof config.content == 'string' && config.content && config.source == 'div') {
        doc.getElementById('uglipop_popbox').innerHTML = doc.getElementById(config.content).innerHTML;
      }

      /**
       * Tag Log lightbox-iframe-raised
       */
      tagLog('lightbox-iframe-raised');
    }

    // change DOM elements to make the lightbox visible

    var overlayWrapper = doc.getElementById('uglipop_overlay_wrapper');
    var overlay = doc.getElementById('uglipop_overlay');
    let contentFixed = doc.getElementById('uglipop_content_fixed');

    // unhide FIXED content
    contentFixed.classList.remove('hide');

    // is mini mode enabled?
    if(!config.miniMode){

      // mini mode disabled, just make the overlays visible

      overlayWrapper.classList.remove('hide');
      overlay.classList.remove('hide');
    }else{

      // Mini mode enabled

      // sometimes the lightbox mode does not require an overlay
      // eg: minimized state
      if(config.launchMinimized){

        // mini mode
        // toggle 'uglipop_content_fixed' class to 'uglipop_content_fixed_mini'
        contentFixed.classList.remove('uglipop_content_fixed');
        contentFixed.classList.add('uglipop_content_fixed_mini');

        // add class 'reverb-lightbox-close-mini' to close button
        let close_button = doc.getElementById('closeButton');
        close_button.classList.add('reverb-lightbox-close-mini');

      }else{

        // mini mode is enabled but not set to launch like that
        // just make the overlays visible
        overlayWrapper.classList.remove('hide');
        overlay.classList.remove('hide');
      }
    }

    // IFRAME body click event
    // It must listen to the click event inside the the IFRAME document

    window.addEventListener('message', function (e) {

      switch(e.data){
      case 'toogle-lightbox':
        // toogle lishtbox state
        toggleLightboxState();
        break;
      case 'close-lightbox':
        // close lightbox
        remove();
        break;
      }

    }, false);
  };

  SoretoJS.showLightbox = function (force) {

    var attempts = 12;
    var delay = 250;

    var open = function () {

      // is there attempts left?
      if(!attempts){

        //
        // no attempts left
        //

        console.warn(`The lightbox can't be shown.`);
        return;
      }

      // is the required variable already available?
      if(!_lightboxOpeningParameters){

        //
        // the required variable is not available
        //

        // decrease the attempts
        attempts--;

        // run the recursion after the delay
        setTimeout(open, delay);

        // return preventing further execution
        return;
      }

      attempts = 0;

      /**
       * Taking the Soreto Iframe DOM reference
       */
      var soretoIFrame = doc.getElementById('soretoIFrame');

      if(!soretoIFrame){

        /**
         * No iframe found
         *
         * Just init it
         */
        SoretoJS.openLightbox(_lightboxOpeningParameters);
      }
      else if(force) {

        /**
         * Iframe found & force execution
         */

        // remove the existing Iframe
        soretoIFrame.remove();

        // open the lightbox
        SoretoJS.openLightbox(_lightboxOpeningParameters);

        // show the ugly structure again
        unRemove();
      }
      else {

        /**
         * Iframe found & no force execution
         */

        // only show the ugly structure again
        unRemove();
      }

    };

    open();
  };

  SoretoJS.inject = function (config) {
    if (config) {
      if (typeof config.class == 'string' && config.class) {
        doc.getElementById(WIDGET_STATIC_PAGE_ELEMENT_NAME).setAttribute('class', config.class);
      }

      if (typeof config.content == 'string' && config.content && config.source == 'html') {
        doc.getElementById(WIDGET_STATIC_PAGE_ELEMENT_NAME).innerHTML = config.content;
      }
    }
  };

  SoretoJS.close = function () {
    remove();
  };

  SoretoJS.toggleLightboxState = function (eventFrom) {
    toggleLightboxState(eventFrom);
  };

  /**
   * Close lightbox by hidding the Overlays and content FIXED
   */
  function remove() {

    track('lightbox-close-cta', window.SORETO);

    doc.getElementById('uglipop_overlay_wrapper').style.display = 'none';
    doc.getElementById('uglipop_overlay').style.display = 'none';
    doc.getElementById('uglipop_content_fixed').style.display = 'none';
  }

  function unRemove() {

    var uOverlayWrapper = doc.getElementById('uglipop_overlay_wrapper');
    var uOverlay = doc.getElementById('uglipop_overlay');
    var uContentFixed = doc.getElementById('uglipop_content_fixed');

    if(uOverlayWrapper){
      uOverlayWrapper.style.display = 'initial';
    }

    if(uOverlay){
      uOverlay.style.display = 'initial';
    }

    if(uContentFixed){
      uContentFixed.style.display = 'initial';
    }
  }

  /**
   * Toggle lightb box Window state from Maximzed to Minimized and vice versa
   */
  function toggleLightboxState (eventFrom) {

    // get close button from DOM
    let close_button = doc.getElementById('closeButton');

    // if an event is from the close button and the lightbox is already minimized
    // it means the lightbox must be closed
    if(eventFrom == 'closeButton'
      && close_button.classList
      && close_button.classList.contains('reverb-lightbox-close-mini')){
      remove();
      return;
    }

    // backdrop overlay
    doc.getElementById('uglipop_overlay_wrapper').classList.toggle('hide');
    doc.getElementById('uglipop_overlay').classList.toggle('hide');

    // iframe container
    let contentFixed = doc.getElementById('uglipop_content_fixed');
    contentFixed.classList.toggle('uglipop_content_fixed');
    contentFixed.classList.toggle('uglipop_content_fixed_mini');

    // close button
    close_button.classList.toggle('reverb-lightbox-close-mini');
  }

  // Start lightbox openning process
  init(window.SORETO);

  return SoretoJS;

}(window, document, SoretoJS || {}));

export default SoretoJS;
