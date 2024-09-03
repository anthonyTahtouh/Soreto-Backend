
/* eslint-disable */

var Reverb = {
  interstitialStateHandling:function(){
    return (function (window, document) {
      if (window.NodeList && !NodeList.prototype.forEach) {
        NodeList.prototype.forEach = Array.prototype.forEach;
      }

      interstitialStateHandling = {};

      const MicroEvent=function(){};MicroEvent.prototype={bind:function(t,e){this._events=this._events||{},this._events[t]=this._events[t]||[],this._events[t].push(e);},unbind:function(t,e){this._events=this._events||{},t in this._events!=!1&&this._events[t].splice(this._events[t].indexOf(e),1);},trigger:function(t){if(this._events=this._events||{},t in this._events!=!1)for(var e=0;e<this._events[t].length;e++)this._events[t][e].apply(this,Array.prototype.slice.call(arguments,1));}},MicroEvent.mixin=function(t){for(var e=['bind','unbind','trigger'],n=0;n<e.length;n++)'function'==typeof t?t.prototype[e[n]]=MicroEvent.prototype[e[n]]:t[e[n]]=MicroEvent.prototype[e[n]];},'undefined'!=typeof module&&'exports'in module&&(module.exports=MicroEvent);

      const Store = function(){
        const self = this;
        this.state = {};

        this.stateOnChange = function(key){
          self.trigger(key, this.state[key]);
        };
      };

      MicroEvent.mixin(Store);

      Store.prototype.init = function(details){
        this.state = details;
      };
      interstitialStateHandling
      Store.prototype.setState = function(key, value){
        this.state[key] = value;
        this.stateOnChange(key);
      };

      Store.prototype.getState = function(){
        return this.state;
      };

      interstitialStateHandling.placementStore = new Store();

      interstitialStateHandling.initInterstitialStateHandling = function(details){
        if (details){
          interstitialStateHandling.placementStore.init(details);

          interstitialStateHandling.placementStore.bind('pageInfo', function(value) {
            document.querySelectorAll('[data-srt-page-state]').forEach((element)=>{
              element.classList.add('srt-hide');
            })
            document.querySelectorAll('[data-srt-page-state='+ value.loadState +']').forEach((element)=>{
              element.classList.remove('srt-hide');
            })
          });

          interstitialStateHandling.placementStore.bind('sharedUrlInfo', function(value) {
            document.querySelectorAll('[data-srt-shared-url-state]').forEach((element)=>{
              element.classList.add('srt-hide');
            })
            document.querySelectorAll('[data-srt-shared-url-state='+ value.state +']').forEach((element)=>{
              element.classList.remove('srt-hide');
            })
          });

          interstitialStateHandling.placementStore.bind('sharedUrlInfo', function(value) {
            document.querySelectorAll('[data-srt-shared-url-type]').forEach((element)=>{
              element.classList.add('srt-hide');
            })
            document.querySelectorAll('[data-srt-shared-url-type='+ value.type +']').forEach((element)=>{
              element.classList.remove('srt-hide');
            })
          });

          interstitialStateHandling.placementStore.bind('dynamicRewardGroup', function(value) {
            document.querySelectorAll('[data-srt-reward-group-alias]').forEach((element)=>{
              element.classList.add('srt-hide');
            })

            if(value){

              value.forEach((item) => {

                if(item.visible){
                  document.querySelectorAll(`[data-srt-reward-group-alias='`+ item.alias +`']`).forEach((element)=>{
                    element.classList.remove('srt-hide');
                  });
                }                
              });              
            }
          });

          interstitialStateHandling.placementStore.bind('requiresUserEmail', function(value) {
            document.querySelectorAll('[data-srt-require-email]').forEach((element)=>{
              element.classList.add('srt-hide');
            })
            document.querySelectorAll('[data-srt-require-email='+ value +']').forEach((element)=>{
              element.classList.remove('srt-hide');
            })
          });

          document.addEventListener('DOMContentLoaded', function() {
            interstitialStateHandling.placementStore.setState('pageInfo', details.pageInfo );
            interstitialStateHandling.placementStore.setState('sharedUrlInfo', details.sharedUrlInfo);
            interstitialStateHandling.placementStore.setState('dynamicRewardGroup', details.dynamicRewardGroup);
            interstitialStateHandling.placementStore.setState('requiresUserEmail', (details.requiresUserEmail === true || details.requiresUserEmail == 'TRUE') ? 'TRUE':'FALSE' );
        });
        }
      }

      return interstitialStateHandling;

    })(window, document);

  },

  ReverbToolbox: function () {
    return (function (w, doc) {
      var toolbox = {};

      toolbox.init = function () {
        this.BACK_URL = '@@BACK_URL';
        this.CLIENT_ID = this.getClientId();
        this.MIXPANEL_TOKEN = '@@MIXPANEL_TOKEN';
        this.SOCIAL_URL = {
          FACEBOOK: 'https://www.facebook.com/sharer/sharer.php?u=',
          TWITTER: 'https://twitter.com/intent/tweet?text=',
          GOOGLE: 'https://plus.google.com/share?url=',
          PINTEREST: 'https://www.pinterest.com/pin/create/button/?url=',
          WHATSAPP: '@@BACK_URL' + '/whatsapp?text=',
          WHATSAPP_DIRECT: 'https://wa.me/?text=',
          MESSENGER: '@@BACK_URL' + '/shareViaMessenger?url=',
          SNAPCHAT: 'https://www.snapchat.com/scan?attachmentUrl=',
          TELEGRAM: 'https://t.me/share/url?url={url}&text={text}',
          EMAIL: '@@BACK_URL' + '/placement/'+this.getClientId()+'/shareviaemail/?url=',
          VIBER: '@@BACK_URL' + '/shareViaViber'
        };
        this.user = null;

      };

      //---------------------------------------------------//
      // SHARING
      //---------------------------------------------------//

      toolbox.addEventListenerToShareIcons = function (reverbElements,eventListener){
        Object.keys(reverbElements).forEach(function(key){
          var el = reverbElements[key];
          var socialPlatform = el.getAttribute('data-reverb-social-platform');
          el.addEventListener('click', function(event) {
            if (socialPlatform){
              event.preventDefault();
              eventListener(socialPlatform);
            }
          });
        });
      };

      toolbox.shareEmailAuth = function (clientId, email, productUrl, socialPlatform, options, clientOrderId, cb) {
        var that = this;

        //detected if it is in test_mode
        var testMode = false;
        if(that.getParameterByName('test_mode')){
          testMode = true;
        }

        var xhttp = new XMLHttpRequest();
        xhttp.open("POST", this.BACK_URL + '/api/v1/sharedurls/emailauth', true);
        xhttp.setRequestHeader("Content-type", "application/json");
        xhttp.withCredentials = true;

        xhttp.onreadystatechange = function () {
          var DONE = 4; // readyState 4 means the request is done.
          var OK = 201; // status 201 created

          if (xhttp.readyState === DONE) {
            if (xhttp.status == OK) {
              cb(null, JSON.parse(xhttp.responseText));
            }
            else {
              cb(JSON.parse(xhttp.responseText));
            }
          }
        };

        xhttp.send(
          JSON.stringify({
            clientId: clientId,
            email: email,
            productUrl: productUrl,
            socialPlatform: socialPlatform,
            clientOrderId: clientOrderId,
            testMode: testMode,
            options:options
          }
        ));
      };

      toolbox.share = function (email, productUrl, socialPlatform, newWindow, options, cb) {
        if (!email || !socialPlatform) {
          console.log('clientId, email and a supported socialPlatform are all required.');
          return;
        }
        var options = options ? options: {};

        // fingerprint increment
        if(_soretoFp){
          options.fp = _soretoFp;
        }

        // utm increment
        if(typeof marketplace !== 'undefined' 
            && typeof marketplace === 'object'){
          options.utmCampaign = marketplace.utmCampaign; 
        }

        socialPlatform = socialPlatform.toUpperCase();

        var trackingObj = {
          category:'bug-hunting',
          action:'user-clicked-share',
          label:'bug-hunting',
          userEmail:email,
          productUrl:productUrl,
          socialPlatform:socialPlatform,
          newWindow:newWindow,
          options:options,
          value:'true'
        }

        var that = this;
        var finalRedirectUrl = null;

        // gets if the user browser supports new window
        var browserSupportsNewWindow = that.infra.browserSupportsNewWindow();
        var windowHeight = !!window.MSInputMethodContext && !!document.documentMode ? 720 : 400; //check if IE 11
        
        var popupPreOpened = null;

        if (newWindow && browserSupportsNewWindow) {

          if(!options.preventPreOpenPopup){

            /**
             * This is the default and legacy behavior
             * it launches the new popup imediatly even with no destination url
             */

            // launch an empty window with no url
            popupPreOpened = w.open('about:blank', '_blank', 'width=400,height='+ windowHeight);
          }else {
            console.log('debug -> click happened');
            /**
             * The not pre open option offers the hability 
             * to raise the share window containing the final url
             * -- When a new window is opened having its final url, 
             *    the device is able to open the APP when installed eg(Twitter, Facebook)
             * 
             * This approach will run an interval until the SU gets generated
             * then it is going to raise the new window
             * It but be done like this bacause Safari does not allow opening new window
             * outside the main event thread
             */
            let openedAlready = false;
            let maxAttempt = 20;

            function openWindowLoop() {
              console.log('debug -> interval started');
              // decrease the max attempt
              maxAttempt--;

              // if the final url is already provided and the window was not already opened
              if(finalRedirectUrl && !openedAlready){
                openedAlready = true;

                console.log('debug -> opening window');
                // open the window
                w.open(finalRedirectUrl, '_blank', 'width=400,height='+ windowHeight);

              }else if(maxAttempt > 0) {

                setTimeout(openWindowLoop, 300);
              }
            }

            openWindowLoop();
            
          }
          
        }

        var clientId = this.CLIENT_ID;
        var clientOrderId = that.getParameterByName('client_order_id') || that.ORDER_ID;

        that.tracking.trackEvent(trackingObj);

        this.shareEmailAuth(clientId, email, productUrl, socialPlatform, options, clientOrderId,  
          function (shareError, payload) {

            if(shareError){

              /***
               * 
               * There was an error calling the endpoint to generate the Shared Url
               * 
               */

              // send tracking
              trackingObj.shareError = shareError
              trackingObj.action = 'shareEmailAuth-error'
              that.tracking.trackEvent(trackingObj);
              
              console.error('ERROR: ', shareError.message);

              
              // is there a pop up available?
              if(newWindow && browserSupportsNewWindow){

                if(!popupPreOpened){
                  popupPreOpened = w.open('about:blank', '_blank', 'width=400,height='+ windowHeight);
                }

                var customMessage = 'Something went wrong, please send us an email: info@soreto.com';

                // is there an specific message to this action?
                if(options && options.messages && shareError.code && options.messages[shareError.code]){
                  customMessage = options.messages[shareError.code];
                }

                if(shareError.html){
                  popupPreOpened.document.body.innerHTML = shareError.html.replace('<%=message%>', customMessage);
                }else {
                  popupPreOpened.document.body.innerHTML = `<h2>Sorry</h2><p>${customMessage}</p>`;
                }
              }
                    
              // is callback available? 
              if(cb){
                cb({error: shareError})
              }

              /**
               * Prevent further execution
               */
              return;
            }

            trackingObj.payload = payload
            trackingObj.action = 'shareEmailAuth-success'
            that.tracking.trackEvent(trackingObj);

            var url = payload.url;
            var productMeta = payload.productMeta;


            var redirect = that.SOCIAL_URL[socialPlatform];

            if(options.preventPreOpenPopup && socialPlatform === 'WHATSAPP'){
              /**
               * Using a new approach trying to open Whatsapp directly
               */
              redirect = that.SOCIAL_URL[socialPlatform+'_DIRECT'];
            }

            if((socialPlatform === 'TWITTER' || socialPlatform === 'WHATSAPP') && options.text) {     
              redirect += encodeURIComponent(options.text + ' '+ url);
            }else if ((socialPlatform === 'TELEGRAM') && options.text) {
              redirect = redirect.replace('{url}', encodeURIComponent(url)).replace('{text}', encodeURIComponent(options.text));
            } else if (socialPlatform === 'VIBER') {
              var urlSize = url ? url.length : 0;
              var textSize = options.text ? options.text.length : 0;
              var totalTextsize = urlSize + textSize;
              
              // The maximum text length is 200 characters in Viber
              if (totalTextsize >= 200) {
                options.text = options.text.substring(0, (200 - urlSize - 4))+ '...' ;
              }

              redirect += `?text=${encodeURIComponent(options.text)}&url=${url}`;
            } else {
              redirect += url;
            }

            if ((socialPlatform === 'MESSENGER') && options.text) {
              redirect += ('&text=' + encodeURIComponent(options.text));
            }

            that.tracking.trackShare({
              client_id: that.CLIENT_ID,
              product_url: productUrl,
              social_platform: socialPlatform,
              user_username: email
            });

            if (socialPlatform === 'PINTEREST' ) {
              if ( options.pinterestImageUrl){
                redirect += '&media=' + encodeURIComponent(options.pinterestImageUrl) + '&description=' + (options && options.text ? encodeURIComponent(options.text) : null);
              }else{
                return console.log('Pinterest requires image url')
              }
            }

            finalRedirectUrl = redirect;

            if (newWindow) {

              // does the browser support new window?
              if(popupPreOpened){

                // redirect the opened window
                popupPreOpened.location.href = redirect;
              }
              else if (!options.preventPreOpenPopup && browserSupportsNewWindow) {

                // create a runtime link and click on it
                let a = document.createElement("a");
                document.body.appendChild(a);
                a.style = "display: none";
                a.href = redirect;
                a.target = '_blank';
                
                a.click();
                document.body.removeChild(a);
              }

            } else if(socialPlatform !== 'EMAIL' && socialPlatform !== 'LINK' && socialPlatform !== 'INSTAGRAM'){
              w.location = redirect;
            }

            if(cb){
              cb({ payload: payload });
            }
            
            trackingObj.action = 'redirect-called'
            that.tracking.trackEvent(trackingObj);

        });
      };

      toolbox.shareDirect = function(productUrl , socialPlatform , newWindow){
        if (!productUrl || !socialPlatform) {
          console.log('productUrl and a supported socialPlatform are all required.');
          return;
        }
        socialPlatform = socialPlatform.toUpperCase();

        if(!this.SOCIAL_URL[socialPlatform]){
          console.log('Please use a supported social platform');
          return;
        }

        if (newWindow) {
          var popup = w.open('about:blank', '_blank', 'width=400,height=400');
          popup.location.href = this.SOCIAL_URL[socialPlatform] + productUrl;
        } else {
          w.location = this.SOCIAL_URL[socialPlatform] + productUrl;
        }
      };

      //---------------------------------------------------//
      // Checkout Lightbox
      //---------------------------------------------------//

      toolbox.getProducts = function(){
        var products = this.getParameterByName('products' , window.location.href);

        if(products){
          return this.parseProducts(products);
        }

        return null;
      };

      //---------------------------------------------------//
      // Analytics
      //---------------------------------------------------//

      toolbox.tracking = {
        
        trackShare: function (data) {
          
          if(typeof gtag == 'undefined' || !gtag) return;

          try {

            gtag('event', 
            'shared via ' + data.social_platform, 
            { 
              'eventCategory': 'SHARED TO SOCIAL CHANNEL'
            }); 
            
          } catch (error) {
            console.error(error);
          }          
        },
        trackEvent:function(data){

          if(typeof gtag === 'undefined' || !gtag) return;

          try {

            data.distinct_id = toolbox.user ? toolbox.user._id : toolbox.getCookie('reverbAnalytics');
          
            gtag('event', 
              data.action, 
              { 
                'eventCategory': data.category,
                'label': data.label,
                'value': data.value
              });
          } catch (error) {
            console.error(error);
          }          
        },
        trackArbitrary:function(data){

          /**
           * 
           * Send track event history
           * 
           */
          data.clientId = toolbox.CLIENT_ID;
          data.campaignVersionId = campaignDetails.campaignVersionId;
          data.sourceTag = campaignDetails.sourceTag;
          data.testMode = campaignDetails.testMode;
          data.sessionId = _sessionId;
          
          if(typeof marketplace !== 'undefined' 
            && typeof marketplace === 'object'){
            data.utmCampaign = marketplace.utmCampaign; 
          }

          if(_soretoFp){
            data.fp = _soretoFp;
          }

          var xhttp = new XMLHttpRequest();
          xhttp.open("POST", toolbox.BACK_URL + '/api/v1/tracking', true);
          xhttp.setRequestHeader("Content-type", "application/json");
          xhttp.send(JSON.stringify(data));

          /**
           * 
           * Send track event to the Fingerprint track API
           * 
           */
          let maxTries = 50;
          const sendTr = (d) => {

            if(maxTries > 0){
              if(_soretoFp){

                maxTries = 0;
                
                // fill the FP
                d.fp = _soretoFp;
                d.sessionId = _sessionId;

                var xhttp2 = new XMLHttpRequest();
                xhttp2.open("POST", '@@TRACKING_API_URL', true);
                xhttp2.setRequestHeader("Content-type", "application/json");
                xhttp2.send(JSON.stringify(d));
              }else {

                // decrease attempts
                maxTries -= 1;

                // after 'X' miliseconds try it again
                setTimeout(() => {
                  sendTr(d);
                }, 500);
              }
            }
          }

          /**
          * Only marketplace will send data to the new tracking
          */
          if(data.campaignType == 'marketplace'){
            sendTr(data);
          }
        }
      };

      //---------------------------------------------------//
      // Utility functions
      //---------------------------------------------------//

      toolbox.getUserEmail = function(cb){
        var that = this;
        var emailParam = toolbox.getParameterByName('email');
        var userEmail = (that.isValidEmail(emailParam) ? emailParam : false) || null;
        cb(null,userEmail);
      };


      toolbox.getParameterByName = function (name, url) {
        if (!url) {
          url = window.location.href;
        }

        //if url is encoded, decode it then return the property value
        if (url.includes('encoded')) {
          let encodedValue = (new RegExp(/encoded=(.*)/g)).exec(url)[1];
          let decodedObject = JSON.parse(atob(decodeURIComponent(encodedValue)));
          return decodedObject[name];
        } else {
          name = name.replace(/[\[\]]/g, '\\$&');
          var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
            results = regex.exec(url);
          if (!results) return null;
          if (!results[2]) return '';
          return decodeURIComponent(results[2].replace(/\+/g, '+'));
        }
      };

      toolbox.parseProducts = function (encoded) {
        // Takes Base64 string and returns array of objects
        var products;
        try {
          products = JSON.parse(w.atob(encoded));
        } catch (e) {
          products = [];
          console.error('An error occurred while decoding product info: ' + e);
        }

        return products;
      };

      toolbox.getClientId = function () {
        if(typeof campaignDetails !== 'undefined'){
          if (campaignDetails.clientId){
              return campaignDetails.clientId
          }
        }
        // Assumes path format is e.g. /clientsrc/:clientId/filename.html
        var pathname = w.location.pathname ? w.location.pathname.split('/') : null;
        return pathname ? pathname[pathname.indexOf('clientsrc') + 1] : null;
      };

      toolbox.updateValue = function (id, value) {
        doc.getElementById(id).value = value;
      };

      toolbox.updateHTML = function (id, value) {
        doc.getElementById(id).innerHTML = value;
      };

      toolbox.handleErrors = function (response) {
        if (!response.ok) {
          return response.json() // return the result of the inner promise, which is an error
            .then(function(json) {
              var err = {};
              err.message = json.message;
              err.stackTrace = json.stackTrace;
              throw new Error(err);
            });
        }
        return response;
      };

      toolbox.isValidEmail = function(email){
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
      };

      toolbox.getCookie = function(name){
        var pattern = RegExp(name + '=.[^;]*');
        var matched = document.cookie.match(pattern);
        if(matched){
          var cookie = matched[0].split('=');
          return cookie[1];
        }
        return false;
      };
      
      toolbox.setOrderId = function (orderId) {
        this.ORDER_ID = orderId;
      };

      toolbox.getTimestamp = function (){
        return Math.floor(Date.now() / 1000);
      };

      toolbox.infra = {

        /**
         * Validates if a browser supports new window opening
         * @returns boolean
         */
        browserSupportsNewWindow : function () {
          
          var ua = navigator.userAgent || navigator.vendor || window.opera;
          
          return ua.indexOf("GSA") <= -1;

        }
      };

      w.addEventListener('message', function(event) {
        
        if (typeof event.data == 'object' && event.data.orderId) {
          toolbox.setOrderId(event.data.orderId);
        }
      }, false);

      //---------------------------------------------------//

      return toolbox;

    })(window, document);
  }
};

function setCookie(name, value, exDays) {
  const d = new Date();
  d.setTime(d.getTime() + (exDays*24*60*60*1000));
  let expires = "expires=" + d.toUTCString();
  document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(cookieName) {
  let cookie = {};
  document.cookie.split(';')
    .forEach(function(el) {
      let [key,value] = el.split('=');
      cookie[key.trim()] = value;
  });

  return cookie[cookieName];
}

/**
 * Session GUID
 *
 * This session guid will remain the same
 * during the user navigation and will be recreated on wich reload
 */
 const _sessionId = Math.random().toString().replace('.', '');

/**
 * 
 * FINGERPRINT LOAD
 * 
 */
let _soretoFp = null;

try {

  // at first, try to get the FP value from the user's browser
  _soretoFp = getCookie("soreto_fp");

	var fpScript = document.createElement('script');
	
	/**
	 * Fingerprint script load event
	 */
	fpScript.onload = function () {
	
	    // eslint-disable-next-line no-undef
	    const fpPromise = soretoFP.load();
	
	    // Get the visitor identifier when you need it.
	    fpPromise
	      .then((fp) => fp.get())
	      .then((result) => { 
          
          if(result){

            // set value on cookie first of all
            setCookie("soreto_fp", result.visitorId, 2);

            _soretoFp = result.visitorId;            
          }
        });
	};
	
	fpScript.src = '@@FP_JS_URL';

  // append script to the document head
  document.head.appendChild(fpScript);

} catch (error) {
	console.log(error);
}
/**
 * 
 * FINGERPRINT LOAD (END)
 * 
 */

module.exports = {
  ReverbToolbox:Reverb.ReverbToolbox,
  interstitialStateHandling:Reverb.interstitialStateHandling
}
