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
    }
  }
};

var ReverbUtils = {
  // eslint-disable-next-line no-unused-vars
  extend: function(first,second){
    for(var i=1; i<arguments.length; i++)
      for(var key in arguments[i])
        if(arguments[i].hasOwnProperty(key)) {
          if (typeof arguments[0][key] === 'object'
            && typeof arguments[i][key] === 'object')
            this.extend(arguments[0][key], arguments[i][key]);
          else
            arguments[0][key] = arguments[i][key];
        }
    return arguments[0];
  },
  urlExists: function(url, cb){
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
  },
  getInternalClientId: function(externalId, settings, cb){
    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
      var DONE = 4; // readyState 4 means the request is done.
      var OK = 200; // status 200 is a successful return.

      if (xhr.readyState === DONE) {
        if (xhr.status == OK) {
          cb(JSON.parse(xhr.responseText), settings);
        }
        else {
          console.log('Invalid Soreto client id');
        }
      }
    };

    var testModelParam = '';
    var campaignVersionIdParam = '';

    if(settings){

      if(settings.testMode == true){
        testModelParam = '&test_mode=true';
      }

      if (settings.campaignVersionId){
        campaignVersionIdParam = '&campaign_version_id=' + settings.campaignVersionId;
      }
    }

    xhr.open('GET', '@@BACK_URL' + '/api/v1/clients/tagdetails/' + externalId + '?user_browser_url=' + btoa(window.location.href) + campaignVersionIdParam + testModelParam, true);
    xhr.withCredentials = true;
    xhr.send();
  }

};

window.ReverbUtils = ReverbUtils;

var Reverb = (function (w, doc, re) {

  re.init = function(externalClientId, settings) {

    if(window.soreto_lightbox_init) {
      return;
    }

    window.soreto_lightbox_init = true;

    this.BACK_URL = '@@BACK_URL';
    this.FRONT_URL = '@@FRONT_URL';

    ReverbUtils.getInternalClientId(externalClientId, settings,
      (details, settings) => {

        let clientTagDetails = details.clientTagDetails;
        let campaingVersionDetails = details.campaingVersionTagDetails;

        this._clientId = clientTagDetails.clientId ? clientTagDetails.clientId : '';
        this._dimensions = clientTagDetails.dimensions ? clientTagDetails.dimensions : null;
        this._lightboxStyles = clientTagDetails.lightboxStyles ? clientTagDetails.lightboxStyles : {};
        this._showLightbox = clientTagDetails.showLightboxOnConfirmationPage;
        this._lightboxOriginUrlRestriction = clientTagDetails.lightboxOriginUrlRestriction;
        this._debugMode = clientTagDetails.debugMode ? clientTagDetails.debugMode : false;

        // merge fixed Campaign Version Details with data from API
        _campaignVersionDetails = ReverbUtils.extend(_campaignVersionDetails, campaingVersionDetails);

        this._showLightboxMinimumOrderValue = _campaignVersionDetails.globalVars.showLightboxMinimumOrderValue;

        //To support AWIN integration
        if(typeof this.jsSet == 'undefined'){
          this.jsSet = false;
        }

        this.clientSettings = {};
        ReverbUtils.extend(this.clientSettings, settings);

        this.sendEvent({
          event: 'REFERRED PAGE VIEW',
          properties: {
            client_id: this._clientId,
            referrer: w.location.href
          }
        });

        this._availableCampaign = true;
        this._allowedOriginUrl = true;

        // validates if there's no Campaign Version available
        if(!_campaignVersionDetails._id){
          this._availableCampaign = false;
        }

        // if the client is inactive and it is not a test
        // should not open the lightbox
        if((!settings || (settings && !settings.testMode) ) && clientTagDetails.active == false){
          this._showLightbox = false;
        }

        // tests Origin Url Restrictions
        if(this._lightboxOriginUrlRestriction){

          var whiteList = this._lightboxOriginUrlRestriction.whiteList;
          var blackList = this._lightboxOriginUrlRestriction.blackList;

          // tests Whitelist
          if(whiteList && whiteList.length > 0){
            this._allowedOriginUrl = whiteList.some(function (li) {
              return w.location.href.indexOf(li) > -1;
            });
          }

          if(this._allowedOriginUrl){
          // tests Blacklist
            if(blackList && blackList.length > 0){
              this._allowedOriginUrl = !blackList.some(function (li) {
                return w.location.href.indexOf(li) > -1;
              });
            }
          }
        }

        if(this._allowedOriginUrl){

          if (w.reverbSendOrder && typeof w.reverbSendOrder === 'function') {
            console.log('soreto: Start send order');
            w.reverbSendOrder();
            console.log('soreto: End send order');
          }

          if ((w.reverbOpenLightbox && typeof w.reverbOpenLightbox === 'function') && this._showLightbox) {
            console.log('soreto: Start open lightbox');
            w.reverbOpenLightbox();
            console.log('soreto: End open lightbox');
          }

          console.log('soreto: Start generate pixel');
          this.setTrackingPixel();
          console.log('soreto: End generate pixel');
        }else{
          this.blockedByOriginUrl = true;
        }

        // M&S patch
        if(this._clientId == '61e6be3408fae75879f68d8d'){

          // eslint-disable-next-line no-undef
          if(AWIN && AWIN.Tracking && AWIN.Tracking.Sale){

            try {
              // eslint-disable-next-line no-undef
              this.awinSale = JSON.stringify(AWIN.Tracking.Sale);
              this.userCookie = document ? document.cookie : '';
            } catch (error) {
              this.awinSale = 'parse_failed';
            }
          }
        }

        re.externalLog(this, function () {});
      });
  };

  re.sendEvent = function (payload) {
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

    xhr.open('GET', this.BACK_URL + '/analytics?clientId=' + this._clientId + '&info=' + encodeInfo(payload), true);
    xhr.withCredentials = true;
    xhr.send();
  };

  re.externalLog = function (value, cb) {

    var xhttp = new XMLHttpRequest();
    xhttp.open('POST', this.BACK_URL+'/tracking/auditlogtag', true);
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
  };

  re.setTrackingPixel = function () {
    var self = this;
    if (doc.getElementById('reverbPixel')) {
      var reverbPixel = doc.getElementById('reverbPixel');
      reverbPixel.style.display = 'none';

      //Adding email to order object
      self.orderObj.buyerEmail = window.ReverbLightbox.buyerEmail;

      self.orderObj.testMode = window.ReverbLightbox.testMode;

      self.orderObj.sdkv = 'reverb-sdk-1_5_0_js';
      self.orderObj.userBrowserURL = w.location.href;

      //To support AWIN integration
      if(typeof self.orderObj.clientId == 'undefined')
        self.orderObj.clientId = this._clientId;

      if (self.jsSet) {
        console.log('soreto pixel called');
        var encodedInfo = encodeInfo(self.orderObj);
        reverbPixel.src = self.BACK_URL + '/tracking/reverbpixel.png?info=' + encodedInfo;

        return;
      }

      var xhr = new XMLHttpRequest();

      xhr.onreadystatechange = function () {
        var DONE = 4; // readyState 4 means the request is done.
        var OK = 200; // status 200 is a successful return.

        if (xhr.readyState === DONE) {
          if (xhr.status === OK) {
            var tags;
            try {
              tags = JSON.parse(xhr.responseText);
            }
            catch (e) {
              console.log(e);
              tags = [];
            }

            var encodedInfo = getInfo.call(self, tags);
            reverbPixel.src = self.BACK_URL + '/tracking/reverbpixel.png?info=' + encodedInfo;

          } else {
            console.log(xhr.status); // An error occurred during the request.
          }
        }
      };

      xhr.open('GET', this.BACK_URL + '/api/v1/clients/' + this._clientId + '/tags', true);
      xhr.withCredentials = true;
      xhr.send();
    }
  };

  re.getUserPermissions = function(redirect_url) {
    w.open(this.BACK_URL + '/oauth2/authorize?client_id=' + this._clientId + '&response_type=code&redirect_uri=' + redirect_url, 'Reverb Get Permissions', 'width=500,height=500');
  };


  re.options = function(clientSettings){
    if(clientSettings){
      ReverbUtils.extend(this.popupSettings,clientSettings);
    }
  };

  re.getReverbId = function(cb) {
    var xhr = new XMLHttpRequest();

    xhr.onreadystatechange = function () {
      var DONE = 4; // readyState 4 means the request is done.
      var OK = 200; // status 200 is a successful return.

      if (xhr.readyState === DONE) {
        if (xhr.status === OK) {
          return cb(null, JSON.parse(xhr.responseText));
        } else {
          return cb(xhr.status); // An error occurred during the request.
        }
      }
    };

    xhr.open('GET', this.BACK_URL + '/api/v1/getReverbId?clientId=' + this._clientId, true);
    xhr.withCredentials = true;
    xhr.send();
  };

  re.initOrder = function () {
    var self = this;
    var obj = {};
    obj.orderObj = {};
    obj.orderObj.clientId = self._clientId;
    obj.orderObj.lineItems = [];

    obj.setOrderId = function (orderId) {
      console.log('soreto.order.id:'+ orderId);
      this.orderObj.orderId = orderId;


      setTimeout(() => {

        var frame = document.getElementById('soretoLightboxFrame');

        if(frame){

          var windowContent = frame.contentWindow;

          if(windowContent){
            windowContent.postMessage({ orderId }, '*');
          }
        }

      }, 5000);

    };

    obj.setOrderTotal = function (total) {
      console.log('soreto.order.total:'+ total);
      this.orderObj.orderTotal = parseFloat(total);
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

    obj.addCurrency = function (currency) {
      this.orderObj.currency = currency;
    };

    obj.ready = function () {
      console.log('soreto.ready.called: true');
      self.jsSet = true;
      self.orderObj = this.getOrder();
    };

    obj.getOrder = function () {
      return this.orderObj;
    };

    return obj;
  };

  return re;

  function encodeInfo (order) {
    return btoa(JSON.stringify(order));
  }

  function getInfo(tags) {
    var info = {
      clientId: this._clientId,
      orderId: getField(getTagName('reverb-order-id', tags)),
      orderTotal: getField(getTagName('reverb-order-value', tags)),
      lineItems: getLineItems(tags),
      currency: getField(getTagName('.reverb-currency', tags)),
      sdkv:'reverb-sdk-1_5_0_js',
    };

    return encodeInfo(info);
  }

  function getField(selector) {
    try {
      return doc.querySelector(selector).textContent;
    } catch (err) {
      return null;
    }
  }

  function getLineItems(tags) {
    var lineItemNodes = doc.querySelectorAll(getTagName('reverb-line-items', tags) + ' ' + getTagName('reverb-line-item', tags));
    var lineItems = [];
    lineItemNodes.forEach(function (node) {
      lineItems.push(getLineItem(node, tags));
    });
    return lineItems;
  }

  function getLineItem(lineItemNode, tags) {
    return {
      name: getField(getTagName('reverb-line-item-name', tags)),
      description: getField(getTagName('reverb-line-item-description', tags)),
      sku: getField(getTagName('reverb-line-item-sku', tags)),
      quantity: getField(getTagName('reverb-line-item-quantity', tags)),
      price: getField(getTagName('reverb-line-item-price', tags)),
      category: getField(getTagName('reverb-line-item-category', tags))
    };

    function getField(selector) {
      try {
        return lineItemNode.querySelector(selector).textContent;
      } catch (err) {
        return null;
      }
    }
  }

  function getTagName (name, tags) {
    var tag = tags.filter(function (obj) {
      return obj.selectedTag === name;
    })[0];

    return '.' + (tag ? tag.customTag : name);
  }

}(window, document, Reverb || {}));

window.Reverb = Reverb;

var ReverbLightbox = (function(w, doc, obj) {
  /*|--uglipop.js--|
  |--(A Minimalistic Pure JavaScript Modal )--|
  |--Author : flouthoc (gunnerar7@gmail.com)(https://github.com/flouthoc)--|
  |--Contributers : Add Your Name Below--|
  |-- zhuharev (kirill at zhuharev.ru)(https://github.com/zhuharev)--|
  |--Nicolas Dietrich (https://github.com/nidico)--|
  |--Modified by Simon White--|*/
  'use strict';

  //Disabled as it was used only for the escape character attached to the close button
  //function on(el, eventName, handler) {
  //  if (el.addEventListener) {
  //    el.addEventListener(eventName, handler);
  //  } else {
  //    el.attachEvent('on' + eventName, function() {
  //      handler.call(el);
  //    });
  //  }
  //}

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

  obj.settings = {
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
    borderRadius:'10px',
    backgroundDim:true,
    dropShadow:true,
    clickBackgroundToClose:false,
    showCloseButton:true
  };
  obj.hasInited = false;

  obj.options = function(clientSettings){
    if(clientSettings)
      ReverbUtils.extend(this.settings,clientSettings);
  };

  obj.init = function (se) {

    if(window.soreto_lightbox_open) {
      return;
    }

    window.soreto_lightbox_open = true;

    var overlay = doc.createElement('div');
    var content_fixed = doc.createElement('div');
    var popbox = doc.createElement('div');
    var overlay_wrapper = doc.createElement('div');
    var close_button = doc.createElement('div');
    var close_text = doc.createElement('span');

    let mini = se.campaignVersionDetails && se.campaignVersionDetails.globalVars ? se.campaignVersionDetails.globalVars.mini : null;

    close_button.id = 'closeButton';
    close_button.className += ' reverb-lightbox-close';

    close_button.onclick = function () {
      return mini.minimizationEnabled == true ? obj.toggleLightboxState('closeButton') : obj.close();
    };

    close_text.innerHTML = mini && mini.minimizationEnabled == true
      ? '<img src="https://dist.soreto.com/clientsrc/assets/minimize.svg" alt="-">'
      : '<img src="https://s3-eu-west-1.amazonaws.com/dist.soreto.com/clientsrc/assets/X_SORETO.svg" alt="x">';
    close_text.className = 'default-close-text';
    close_button.appendChild(close_text);

    content_fixed.id = 'uglipop_content_fixed';
    content_fixed.className = 'uglipop_content_fixed';

    popbox.id = 'uglipop_popbox';
    overlay.id = 'uglipop_overlay';
    overlay_wrapper.id = 'uglipop_overlay_wrapper';

    if (se.backgroundDim){
      overlay_wrapper.setAttribute('style', 'position:absolute;top:0;bottom:0;left:0;right:0;');
      overlay.setAttribute('style', 'position:fixed;top:0;bottom:0;left:0;right:0;opacity:0.3;width:100%;height:100%;background-color:black;');
    }

    overlay_wrapper.appendChild(overlay);
    content_fixed.appendChild(close_button);
    content_fixed.appendChild(popbox);

    doc.body.appendChild(overlay_wrapper);
    doc.body.appendChild(content_fixed);

    // set the overlays and content_fixed the hide class
    overlay_wrapper.classList.add('hide');
    overlay.classList.add('hide');
    content_fixed.classList.add('hide');

    var insertDropShadow = function(){
      if(self.Reverb._clientId == '5b87dde010fdc02b0907f886'){
        return 'box-shadow: inset 0 1px 3px 0 rgba(0,0,0,0.5), 0 5px 5px 0 rgba(0,0,0,0.05);';
      }
      return'-webkit-box-shadow: 0px 0px 20px 3px rgba(0,0,0,0.75);\
        -moz-box-shadow: 0px 0px 20px 3px rgba(0,0,0,0.75);\
        box-shadow: 0px 0px 20px 3px rgba(0,0,0,0.75);';
    };

    if (se.clickBackgroundToClose){
      overlay.onclick = function () {
        return obj.close();
      };
    }

    var styleLightbox = doc.createElement('style');
    styleLightbox.innerHTML = '.reverb-lightbox{\
      border-radius: '+ (se.lightboxStyles.borderRadius || se.borderRadius)+';\
      background-color:white;\
      overflow: hidden;\
      '+(se.dropShadow ? insertDropShadow():'')+'\
     height:100%;\
    }\
    .uglipop_content_fixed {\
      width:'+se.dimensions.dimD.w+';\
      height:'+se.dimensions.dimD.h+';\
      position:fixed;\
      top: 50%;\
      left: 50%;\
      transform: translate(-50%, -50%);\
      -webkit-transform: translate(-50%, -50%);\
      -ms-transform: translate(-50%, -50%);\
      opacity:1;\
    }\
    @media screen and (max-width: '+se.breakpoints.dimT+'){\
      .uglipop_content_fixed {\
        width: '+se.dimensions.dimT.w+';\
        height: '+se.dimensions.dimT.h+';\
      }\
    }\
    @media screen and (max-width: '+se.breakpoints.dimM+'){\
      .uglipop_content_fixed {\
        width: '+se.dimensions.dimM.w+';\
        height: '+se.dimensions.dimM.h+';\
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
    div.reverb-lightbox-close{\
      width: 35px;\
      height: 35px;\
      position: absolute;\
      top: 0;\
      right: 0;\
      margin-top: -13px;\
      margin-right: -13px;\
      cursor:pointer;\
      border-radius: 50%;\
      text-align: center;\
      -webkit-box-shadow: 0px 5px 5px 0px rgba(0,0,0,0.05);\
      -moz-box-shadow: 0px 5px 5px 0px rgba(0,0,0,0.05);\
      box-shadow: 0px 5px 5px 0px rgba(0,0,0,0.05);\
      z-index:2147483647;\
      display: '+ (se.lightboxStyles && se.lightboxStyles.showCloseButton === false ? 'none;' : 'inline-block;') +'\
    }\
    div.reverb-lightbox-close span {\
      font-family: sans-serif;\
      -webkit-font-smoothing: auto;\
      line-height: 35px;\
      font-size: 20px;\
      font-weight: 400;\
    }\
    .hide {\
      display: none !important;\
      height: 0px !important;\
      opacity: 0 !important;\
      transition: all 200ms linear !important;\
    }';
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

    obj.hasInited = true;
  };

  obj.open = function (opts, email) {

    //Added this showLightbox test here because it seems Awin integration our tag not on a standard way.
    var self = this;

    //Save email to be sent with order data.
    obj.buyerEmail = email;
    obj.testMode = opts.testMode ? opts.testMode : false;

    email = email ? email : '' ;
    var first_name = opts.firstName ? opts.firstName : '' ;
    var test_mode = opts.testMode ? opts.testMode : '' ;
    var client_order_id =  Reverb.orderObj && Reverb.orderObj.orderId ? Reverb.orderObj.orderId : '';
    var user_browser_url = w.location.href;

    if(opts.products && !validateProducts(opts.products)){
      return;
    }
    var products = opts.products;

    var counter = 0;

    setTimeout (function () {
      var openModal = function(){

        let dontShowLightboxMinimumAchieved = (Reverb._showLightboxMinimumOrderValue && Reverb.orderObj && Reverb.orderObj.orderTotal) && Reverb.orderObj.orderTotal < Reverb._showLightboxMinimumOrderValue;

        if (typeof  Reverb._clientId != 'undefined'
            && typeof Reverb._showLightbox != 'undefined'
            && Reverb._showLightbox
            && Reverb._allowedOriginUrl == true
            && Reverb._availableCampaign == true
            && !dontShowLightboxMinimumAchieved){

          // Change the default dimensions data to a custom client definition on meta data
          if(Reverb._dimensions)
          {
            obj.settings.dimensions = Reverb._dimensions;
          }

          obj.settings.lightboxStyles = Reverb._lightboxStyles;

          let extendedSettings = ReverbUtils.extend(obj.settings, { campaignVersionDetails : _campaignVersionDetails});

          // load frame infra uglypop etc..
          obj.hasInited == false ? obj.init(extendedSettings) : null;

          let encodedData = {
            products,
            email,
            first_name,
            test_mode,
            campaign_version_id: _campaignVersionDetails._id || '',
            client_order_id,
            user_browser_url,
            minimization_enabled: _campaignVersionDetails.globalVars.mini.minimizationEnabled,
            sdkv: 'reverb-sdk-1_5_0_js'
          };

          let encoded = window.btoa(JSON.stringify(encodedData));
          var soretoUrl = Reverb.BACK_URL +'/placement/'+ Reverb._clientId +'/lightbox?encoded='+ encoded;

          ReverbUtils.urlExists(soretoUrl,function(isValidUrl){
            if (isValidUrl){
              self.popup({
                class: opts.class || 'reverb-lightbox reverb-lightbox-mini', //styling class for Modal
                source: 'html',
                miniMode: _campaignVersionDetails.globalVars.mini.minimizationEnabled,
                launchMinimized: opts.blockMinimization === false ? false : _campaignVersionDetails.globalVars.mini.launchMinimized,
                content: '<iframe id="soretoLightboxFrame" class="reverb-lightbox-iframe" src="'+ soretoUrl +'"></iframe>'
              });
            }
          });
        } else {
          setTimeout(function(){
            if(counter < 31){
              counter = counter + 1;
              openModal();
            }
          } , 300 );
        }
      };

      openModal();

    }, opts.timeout || 1000);

  };

  obj.popup = function (config) {
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


  obj.close = function () {
    remove();
  };

  obj.toggleLightboxState = function (eventFrom) {
    toggleLightboxState(eventFrom);
  };

  function remove() {
    doc.getElementById('uglipop_overlay_wrapper').style.display = 'none';
    doc.getElementById('uglipop_overlay').style.display = 'none';
    doc.getElementById('uglipop_content_fixed').style.display = 'none';
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

  return obj;
})(window, document, ReverbLightbox || {});

window.ReverbLightbox = ReverbLightbox;

if(window && window.reverbAsyncInit && typeof window.reverbAsyncInit == 'function') {
  window.reverbAsyncInit();
}
