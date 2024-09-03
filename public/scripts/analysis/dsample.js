/**
 *
 * /////////////////////////////
 * // ANALYSIS - DOM SAMPLE
 * /////////////////////////////
 *
 * This script takes the entire DOM page as a string and sends it to an API
 */

function base64encode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
    function toSolidBytes(match, p1) {
      return String.fromCharCode('0x' + p1);
    }));
}

(function(){

  function getSoretoIframeContent(cb){

    var iFrame =  document.getElementById('soretoIFrame');
    var iFrameSourceOrigin = (new URL(iFrame.getAttribute('src'))).origin;

    window.addEventListener('message', event => {
      if (event.origin === iFrameSourceOrigin
          && event.data
          && event.data.domStr) {
        cb(event.data.domStr);
      } else {
        return;
      }
    });

    iFrame.contentWindow.postMessage('sor-give-dom', iFrameSourceOrigin);
  }

  function getScreenData(){

    try {
      return {
        screenWidth: window.screen.width,
        screenHeight:window.screen.height,
        availScreenWidth: window.screen.availWidth,
        availScreenHeight:window.screen.availHeight,
        windowOuterWidth: window.outerWidth,
        windowOuterHeight: window.outerHeight,
        windowInnerWidth: window.innerWidth,
        windowInnerHeight: window.innerHeight,
        windowDocumentInnerWidth: document.documentElement.clientWidth,
        windowDocumentInnerHeight: document.documentElement.clientHeight,
        pageWidth: document.documentElement.scrollWidth,
        pageHeight: document.documentElement.scrollHeight,
        devicePixelRatio: window.devicePixelRatio
      };
    } catch (error) {
      return null;
    }
  }

  try {

    getSoretoIframeContent((iframeContent) => {

      // build sample object
      var sample = {
        domSample:document.documentElement.outerHTML,
        sourceUrl:window.location.href,
        soretoData:window.SORETO,
        soretoPlacementOptions: window.SORETO_PLACEMENT_OPTIONS,
        soretoIframe:iframeContent,
        screenData: getScreenData()
      } ;

      // convert object into string and then into base 64
      var encodedSample = null;

      try {
        encodedSample = base64encode(JSON.stringify(sample));
      } catch (error) {
        // safe handle
        try {
          encodedSample = btoa({
            error
          });
        } catch (errorBtoa) {
          encodedSample = error;
        }
      }

      /**
     * Build HTTP request
     */
      var xhttpUnknownSource = new XMLHttpRequest();
      xhttpUnknownSource.open('POST', '@@TAG_ANALYSIS_DOM_SAMPLE_API_URL' + '/dsample', true);
      xhttpUnknownSource.setRequestHeader('Content-type', 'application/json');

      // send POST
      xhttpUnknownSource.send(encodedSample);

    });

  } catch (error) {
    console.error(error);
  }

})();