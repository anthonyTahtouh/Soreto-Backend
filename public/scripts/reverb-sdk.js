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
  getInternalClientId: function(externalId, settings,cb){
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

    xhr.open('GET', '@@BACK_URL' + '/api/v1/clients/tagdetails/' + externalId, true);
    xhr.withCredentials = true;
    xhr.send();
  }

};

window.ReverbUtils = ReverbUtils;

var Reverb = (function (w, doc, re) {




  re.init = function(externalClientId,settings) {
    this.BACK_URL = '@@BACK_URL';
    this.FRONT_URL = '@@FRONT_URL';
    ReverbUtils.getInternalClientId(externalClientId, settings, (clientTagDetails, settings) => { // eslint-disable-line
      this._clientId = clientTagDetails.clientId ? clientTagDetails.clientId : '';
      this._dimensions = clientTagDetails.dimensions ? clientTagDetails.dimensions : null;

      this.jsSet = false;
      this.clientSettings = {};
      //ReverbUtils.extend(this.clientSettings,settings);

      this.sendEvent({
        event: 'REFERRED PAGE VIEW',
        properties: {
          client_id: this._clientId,
          referrer: w.location.href
        }
      });

      if (w.reverbSendOrder && typeof w.reverbSendOrder === 'function') {
        w.reverbSendOrder();
      }

      if (w.reverbOpenLightbox && typeof w.reverbOpenLightbox === 'function') {
        w.reverbOpenLightbox();
      }

      this.setTrackingPixel();
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

  re.setTrackingPixel = function () {
    var self = this;
    if (doc.getElementById('reverbPixel')) {
      var reverbPixel = doc.getElementById('reverbPixel');

      //Adding email to order object
      self.orderObj.buyerEmail = window.ReverbLightbox.buyerEmail;

      self.orderObj.testMode = window.ReverbLightbox.testMode;

      self.orderObj.sdkv = 'reverb-sdk_js';

      if (self.jsSet) {
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

  /*eslint-disable */
  re.options = function(clientSettings){

  };
  /*eslint-enable */

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
      this.orderObj.orderId = orderId;
    };

    obj.setOrderTotal = function (total) {
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
      currency: getField(getTagName('.reverb-currency', tags))
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
    clickBackgroundToClose:false
  };
  obj.hasInited = false;
  /*eslint-disable */
  obj.options = function(clientSettings){
    //ReverbUtils.extend(this.settings,clientSettings);
  };
  /*eslint-enable */

  obj.init = function (se) {

    var overlay = doc.createElement('div');
    var content_fixed = doc.createElement('div');
    var popbox = doc.createElement('div');
    var overlay_wrapper = doc.createElement('div');
    var close_button = doc.createElement('div');
    var close_text = doc.createElement('span');

    close_button.className += ' reverb-lightbox-close';
    close_button.onclick = function () {
      return obj.close();
    };
    close_text.innerHTML = 'x';
    close_button.appendChild(close_text);

    content_fixed.id = 'uglipop_content_fixed';
    content_fixed.setAttribute('style', 'position:fixed;top: 50%;left: 50%;transform: translate(-50%, -50%);-webkit-transform: translate(-50%, -50%);-ms-transform: translate(-50%, -50%);opacity:1;');
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
    doc.getElementById('uglipop_overlay_wrapper').style.display = 'none';
    doc.getElementById('uglipop_overlay').style.display = 'none';
    doc.getElementById('uglipop_content_fixed').style.display = 'none';

    var insertDropShadow = function(){
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
      border-radius: '+se.borderRadius+';\
      background-color:white;\
      overflow: hidden;\
      '+(se.dropShadow ? insertDropShadow():'')+'\
     height:100%;\
    }\
    #uglipop_content_fixed {\
      width:'+se.dimensions.dimD.w+';\
      height:'+se.dimensions.dimD.h+';\
    }\
    @media screen and (max-width: '+se.breakpoints.dimT+'){\
      #uglipop_content_fixed {\
        width: '+se.dimensions.dimT.w+';\
        height: '+se.dimensions.dimT.h+';\
      }\
    }\
    @media screen and (max-width: '+se.breakpoints.dimM+'){\
      #uglipop_content_fixed {\
        width: '+se.dimensions.dimM.w+';\
        height: '+se.dimensions.dimM.h+';\
      }\
    }\
    #uglipop_content_fixed{\
      z-index:16777271;\
    }\
    #uglipop_overlay_wrapper{\
      z-index:16777270;\
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
      color: #FFF;\
      border-radius: 50%;\
      background: #2d2d2d;\
      text-align: center;\
      display: inline-block;\
      -webkit-box-shadow: -1px 1px 5px 0px rgba(77,77,77,1);\
      -moz-box-shadow: -1px 1px 5px 0px rgba(77,77,77,1);\
      box-shadow: -1px 1px 5px 0px rgba(77,77,77,1);\
    }\
    div.reverb-lightbox-close span {\
      font-family: sans-serif;\
      -webkit-font-smoothing: auto;\
      line-height: 35px;\
      font-size: 20px;\
      font-weight: 400;\
    }';
    doc.head.appendChild(styleLightbox);

    // Disabled option to close lightbox throught the escape key
    //on(w, 'keydown', function(e) {
    //  if (e.keyCode == 27) {
    //    remove();
    //  }
    //});

    obj.hasInited = true;
  };

  obj.open = function (opts,email) {
    var self = this;
    var products = '&products=' + btoa(JSON.stringify(opts.products));

    //Save email to be sent with order data.
    obj.buyerEmail = email;
    obj.testMode = opts.testMode ? opts.testMode : false;

    email = email ? '&email=' + email : '' ;
    var firstName = opts.firstName ? '&first_name=' + opts.firstName : '' ;
    var testMode = opts.testMode ? '&test_mode=' + opts.testMode : '' ;
    if(opts.products && !validateProducts(opts.products)){
      return;
    }

    // Change the default dimensions data to a custom client definition on meta data
    if(Reverb._dimensions)
    {
      obj.settings.dimensions = Reverb._dimensions;
    }

    obj.hasInited == false ? obj.init(obj.settings) : null;
    setTimeout (function () {
      var soretoUrl = Reverb.BACK_URL +'/placement/'+ Reverb._clientId +'/lightbox?'+products+''+ email +''+ firstName + testMode + '&sdkv=reverb-sdk_js';
      ReverbUtils.urlExists(soretoUrl,function(isValidUrl){
        if (isValidUrl){
          self.popup({
            class: opts.class || 'reverb-lightbox', //styling class for Modal
            source: 'html',
            content: '<iframe class="reverb-lightbox-iframe" src="'+ soretoUrl +'"></iframe>'
          });
        }
      });
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

    doc.getElementById('uglipop_overlay_wrapper').style.display = '';
    doc.getElementById('uglipop_overlay').style.display = '';
    doc.getElementById('uglipop_content_fixed').style.display = '';
  };


  obj.close = function () {
    remove();
  };

  function remove() {
    doc.getElementById('uglipop_overlay_wrapper').style.display = 'none';
    doc.getElementById('uglipop_overlay').style.display = 'none';
    doc.getElementById('uglipop_content_fixed').style.display = 'none';
  }

  return obj;
})(window, document, ReverbLightbox || {});

window.ReverbLightbox = ReverbLightbox;

if(window && window.reverbAsyncInit && typeof window.reverbAsyncInit == 'function') {
  window.reverbAsyncInit();
}