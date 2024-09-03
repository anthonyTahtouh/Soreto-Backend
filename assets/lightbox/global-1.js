/* eslint-disable no-undef */

/**
 *
 * SORETO LIGHTBOX V1
 * 2024
 *
 */


const reverbToolbox = Webpack.ReverbToolbox();
reverbToolbox.init();

const _sessionId = reverbToolbox.getTimestamp();

const _screenStates = {
  USER_INFO_CAPTURE: 'USER_INFO_CAPTURE',
  SHARE: 'SHARE',
};

const _sharingStates = {
  INITIAL: 'INITIAL',
  SHARING: 'SHARING',
};

const _cacheDomItemsByStep = {
  USER_INFO_CAPTURE: [],
  SHARE: [],
};

const _copyLinkBehaviorPlatforms = [
  'LINK', 'INSTAGRAM'
];

let _userEmail = null;
let _userFirstName = null;
let _selectedSocialPlatform = '';
let _alreadySharedPlatforms = [];
let _triggerShareAfterUserInfoCapture = false;
let _stepOptionAfterShareAlreadyHandled = false;
let _generatedCopyLink = {
  LINK: '',
  INSTAGRAM: ''
};

let _sE = {
  sorMobileContainer: {},
  sorStepDesktop: {},
  sorStepMobile: {},
  sorUserInfoForm: {},
  sorSharePanelSocialOptionItem: {},
  sorToggle: {},
  sorUserInfoInputFirstNameForm: {},
  sorUserInfoInputEmailForm: {},
  sorShareTitleMobile: {},
  sorShareSubtitleMobile: {},
  sorShareTitleDesktop: {},
  sorShareSubtitleDesktop: {},
  sorSharePanelSocialOptionPreviewShareBtn: {},
  sorSharePanelSocialOptionPreviewTitle: {},
  sorSharePanelSocialOptionPreviewDescription: {},
  sorSharePanelSocialOptionPreviewLink: {},
  sorSharePanelContainer: {},
  sorSharePanelPostPreviewImage: {},
  sorNavigationDotsGroup: {},
  sorMiniVirtualContainer: {}
};

trackLogEnhanced('lightbox-pre-load');

/**
 *
 * LOAD ALL THE SOR- ELEMENTS INTO THE _sE OBJECT
 *
 */
Object.keys(_sE).forEach(function (key) {

  var domElementPropertyName = camelToKebabe(key);

  // take the dom elements
  var elements = document.querySelectorAll('[' + domElementPropertyName + ']');

  // set to the control object
  _sE[key] = elements;

  if(elements.length == 0){
    console.warn('Missing the DOM Soreto element:' + domElementPropertyName);
  }
});

/**
 *
 * CACHE STEPS CONTAINERS [START]
 *
 * it takes all the containers that will change its visibility based on state
 *
 */

Array.from(_sE.sorStepDesktop)
  .concat(Array.from(_sE.sorStepMobile))
  .forEach(function (element) {
    var attr =
            element.getAttribute('sor-step-desktop') ||
            element.getAttribute('sor-step-mobile');

    if (_cacheDomItemsByStep[attr]) {
      _cacheDomItemsByStep[attr].push(element);
    }
  });

/**
 *
 * CACHE STEPS CONTAINERS [END]
 *
 */

/**
 *
 * STATE CHANGE LISTENER
 *
 */
document.addEventListener('stateChange', function (e) {
  Object.keys(_cacheDomItemsByStep).forEach(function (key) {
    _cacheDomItemsByStep[key].forEach(function (element) {
      displayFade(element, e.detail.state == key);
    });
  });
});

/**
 *
 * SHARING STATE CHANGE LISTENER
 *
 */
document.addEventListener('sharingStateChange', function (e) {
  _sE.sorSharePanelContainer
    .forEach(function (element) {
      element.classList[
        e.detail.state == _sharingStates.SHARING ? 'add' : 'remove'
      ]('sharing');
    });
});

if (!__campaignVersionGlobalVars.forceUserInfoCapture) {
  // TODO: set it render time
  _userEmail = getUrlParameterByName('email');
  _userFirstName = getUrlParameterByName('first_name');

  if (_userEmail) {
    dispatchEvent('stateChange', { state: _screenStates.SHARE });
  }
}

/**
 *
 * ATTACH THE EVENT LISTENERS [START]
 *
 */

_sE.sorUserInfoForm.forEach(function (element) {

  /**
   * WATCH THE FORM SUBMISSION
   */
  element.addEventListener('submit', function (e) {
    e.preventDefault();

    // LOG
    trackLogEnhanced('lightbox-user-input-cta');

    if (_triggerShareAfterUserInfoCapture) {
      share(e);
    }

    // CHANGE THE STATE
    dispatchEvent('stateChange', { state: _screenStates.SHARE });
  });
});

_sE.sorSharePanelSocialOptionItem.forEach(function (element) {
  let socialPlatform = element.getAttribute(
    'sor-share-panel-social-option-item'
  );

  // select the default option
  if (__socialShareOptionsConfig[socialPlatform].default) {
    handleSelectedSocialOptionChange(socialPlatform);
  }

  // watch click event
  element.addEventListener('click', function (e) {
    e.preventDefault();

    // send event
    trackLogEnhanced('lightbox-social-icon-cta', socialPlatform);

    handleSelectedSocialOptionChange(socialPlatform);
  });

});

_sE.sorToggle.forEach(function (element) {

  // watch click event
  element.addEventListener('click', function (e) {
    e.preventDefault();

    // check if it is a explicit close call
    var toggleValue = element.getAttribute('sor-toggle');
    if(toggleValue == 'close'){

      // send message to the parent (soreto.js)
      window.parent.postMessage('close-lightbox', '*');

      return;
    }

    // is minimization enabled?
    if (__campaignVersionGlobalVars.minimizationEnabled) {

      // log
      trackLog('lightbox-toogle-cta');

      // send message to the parent (soreto.js)
      window.parent.postMessage('toogle-lightbox', '*');
    } else {

      // send message to the parent (soreto.js)
      window.parent.postMessage('close-lightbox', '*');
    }
  });
});

_sE.sorUserInfoInputFirstNameForm.forEach(function (element) {
  if (element.value) {
    _userFirstName = element.value;
  }

  // watch change event
  element.addEventListener('change', function (e) {
    _userFirstName = e.target.value;
  });
});

_sE.sorUserInfoInputEmailForm.forEach(function (element) {
  if (element.value) {
    _userEmail = element.value;
  }

  // watch change event
  element.addEventListener('change', function (e) {
    _userEmail = e.target.value;
  });
});

_sE.sorSharePanelSocialOptionPreviewShareBtn.forEach(function (element) {

  // watch click event
  element.addEventListener('click', shareBtnClickHandler);
});

_sE.sorMiniVirtualContainer.forEach(function (element) {

  // if the IFRAME has the same width as the screen, set on it a class
  try {

    var windowSizes = getUrlParameterByName('window_sizes');

    if(windowSizes){
      if(windowSizes.x == window.innerWidth){
        element.classList.add('contained');
      }
    }

  } catch (error) {
    console.warn('Error binding minimized container');
  }

  element.classList.remove('dnone');
});

/**
 *
 * ATTACH THE EVENT LISTENERS [END]
 *
 */

/**
 *
 * HANDLES SOCIAL OPTION SELECTION CHANGE
 *
 * @param {*} selectedSocialPlatform
 */
function handleSelectedSocialOptionChange(selectedSocialPlatform) {

  _selectedSocialPlatform = selectedSocialPlatform;

  // set the active option class
  _sE.sorSharePanelSocialOptionItem
    .forEach((element) => {

      if(element.classList.contains('active')){
        element.classList.remove('active');
      }

      if(element.getAttribute('sor-share-panel-social-option-item') == selectedSocialPlatform){
        element.classList.add('active');
      }
    });

  let selectedSocialOptionSettings = takeSocialPlatformSettings(selectedSocialPlatform);

  var optionAlreadyShared = _alreadySharedPlatforms.find(
    (sp) => sp == selectedSocialPlatform
  );

  _sE.sorSharePanelContainer.forEach(function (element) {
    element.setAttribute(
      'sor-share-panel-container',
      selectedSocialPlatform
    );

    if (optionAlreadyShared) {
      if (!selectedSocialOptionSettings.multiShare) {
        element.classList.add('already-shared');
      }
    }
  });

  changeInnerHtml(_sE.sorSharePanelSocialOptionPreviewShareBtn, optionAlreadyShared ? selectedSocialOptionSettings.afterShareButtonText: selectedSocialOptionSettings.shareButtonText);
  _sE.sorSharePanelSocialOptionPreviewShareBtn.forEach(function (element) {
    if (!selectedSocialOptionSettings.multiShare &&
        optionAlreadyShared &&
        !_copyLinkBehaviorPlatforms.includes(selectedSocialPlatform)) {

      element.setAttribute(
        'sor-share-panel-social-option-preview-share-btn',
        'ALREADY_SHARED'
      );
    } else {
      element.setAttribute(
        'sor-share-panel-social-option-preview-share-btn',
        'INITIAL'
      );
    }
  });

  _sE.sorSharePanelPostPreviewImage
    .forEach(function (element) {
      element.classList[
        selectedSocialOptionSettings.preview.showPostImage
          ? 'remove'
          : 'add'
      ]('dnone');
    });

  ///
  // CHANGE MESSAGES
  //

  var changeMessage = optionAlreadyShared && !selectedSocialOptionSettings.multiShare;

  changeInnerHtml(_sE.sorShareTitleMobile, __shareStepMobile[`title${changeMessage ? 'AfterShare': ''}`]);
  changeInnerHtml(_sE.sorShareSubtitleMobile, __shareStepMobile[`subtitle${changeMessage ? 'AfterShare': ''}`]);
  changeInnerHtml(_sE.sorShareTitleDesktop, __shareStepDesktop[`title${changeMessage ? 'AfterShare': ''}`]);
  changeInnerHtml(_sE.sorShareSubtitleDesktop, __shareStepDesktop[`subtitle${changeMessage ? 'AfterShare': ''}`]);
  changeInnerHtml(_sE.sorSharePanelSocialOptionPreviewTitle, selectedSocialOptionSettings.preview[`title${changeMessage ? 'AfterShare': ''}`]);
  changeInnerHtml(_sE.sorSharePanelSocialOptionPreviewLink, selectedSocialOptionSettings.preview[`link${changeMessage ? 'AfterShare': ''}`]);

  _sE.sorSharePanelSocialOptionPreviewDescription.forEach(function (element) {

    if(changeMessage && _copyLinkBehaviorPlatforms.includes(selectedSocialPlatform)){
      element.innerHTML = _generatedCopyLink[selectedSocialPlatform];
    }else {
      element.innerHTML = selectedSocialOptionSettings.preview[`description${changeMessage ? 'AfterShare': ''}`];
    }

  });
}

/**
 *
 * @param {*} selectedSocialPlatform
 * @returns
 */
function handleSocialOptionAfterShare(selectedSocialPlatform) {
  // add platform to the already shares ones
  if (!_alreadySharedPlatforms.find((sp) => sp == selectedSocialPlatform)) {
    _alreadySharedPlatforms.push(selectedSocialPlatform);
  }
  handleSelectedSocialOptionChange(selectedSocialPlatform);
}

/**
 * For mobile devices, we must change the step dots order after share
 * if the share dot is not the last, it must be set
 */
function handleStepOptionAfterShare() {
  // it must be done just a single time
  if (_stepOptionAfterShareAlreadyHandled) {
    return;
  }

  _stepOptionAfterShareAlreadyHandled = true;

  var navigationDotsContainer = _sE.sorNavigationDotsGroup.length > 0 ? _sE.sorNavigationDotsGroup[0] : null;

  if (navigationDotsContainer) {
    var lastDot = navigationDotsContainer.querySelector('span:last-child');

    if (
      lastDot &&
            lastDot.getAttribute('sor-navigation-dots') !== 'SHARE'
    ) {
      var shareDot = document.querySelector(
        '[sor-navigation-dot="SHARE"]'
      );

      if (shareDot) {
        shareDot.remove();

        var newShareDot = document.createElement('span');
        newShareDot.setAttribute('sor-navigation-dot', 'SHARE');
        navigationDotsContainer.appendChild(newShareDot);
      }
    }
  }
}

/**
 *
 * SHARE BUTTON CLICK HANDLER
 *
 * @param {*} e
 * @returns
 */
function shareBtnClickHandler(e) {
  e.preventDefault();

  if(_copyLinkBehaviorPlatforms.includes(_selectedSocialPlatform)
  && optionAlreadyShared(_selectedSocialPlatform)){

    //
    // COPY ACTION
    //
    var copyText = _sE.sorSharePanelSocialOptionPreviewDescription[0];

    navigator.clipboard.writeText(copyText.innerText);

    // if it is INSTAGRAM, redirect to
    if(_selectedSocialPlatform == 'INSTAGRAM'){
      window.open('http://instagr.am/', '_blank');
    }

    return;
  }

  //
  // SHARE
  //

  share();
}

/**
 *
 * @param {*} e
 * @returns
 */
function share() {

  // validates if the email is filled up
  if (!_userEmail) {

    _triggerShareAfterUserInfoCapture = true;

    dispatchEvent('stateChange', {
      state: _screenStates.USER_INFO_CAPTURE,
    });

    return;
  }

  dispatchEvent('sharingStateChange', { state: _sharingStates.SHARING });

  let socialOptionSettings = takeSocialPlatformSettings(
    _selectedSocialPlatform
  );

  let openPopUp = !['EMAIL', 'LINK', 'INSTAGRAM'].includes(_selectedSocialPlatform);

  reverbToolbox.share(
    _userEmail,
    null,
    _selectedSocialPlatform,
    openPopUp,
    {
      emailAttributes: {
        USERFIRSTNAME: _userFirstName,
        REWARD: 'REWARD', // is it being used?
      },
      pinterestImageUrl: __socialShareOptionsConfig['FALLBACK'].postImageUrl,
      campaignVersionId: __campaignVersionId,
      text:
                socialOptionSettings.preview.title +
                '. ' +
                socialOptionSettings.preview.description,
      firstName: _userFirstName,
    },
    function (suReturn) {
      dispatchEvent(
        'sharingStateChange',
        { state: _sharingStates.INITIAL },
        500
      );

      if(suReturn.error){
        console.warn(suReturn.error);
      }

      if(!suReturn.payload){
        // there's no payload
        return;
      }

      _generatedCopyLink[_selectedSocialPlatform] = suReturn.payload.url;

      handleSocialOptionAfterShare(_selectedSocialPlatform);
    }
  );

  handleStepOptionAfterShare();

  trackLog('lightbox-share-cta');
}

/**
 *
 * Take social platform settings
 *
 * @param {*} socialPlatform
 * @returns
 */
function takeSocialPlatformSettings(socialPlatform) {
  let socialOptionSettings = __socialShareOptionsConfig[socialPlatform];
  return deepMerge(__socialShareOptionsConfig.FALLBACK, socialOptionSettings);
}

function optionAlreadyShared(selectedSocialPlatform) {
  return _alreadySharedPlatforms.some(
    (sp) => sp == selectedSocialPlatform
  );
}

/**
 * TRACK LOG
 *
 * @param {*} type
 * @param {*} value
 * @returns
 */
function trackLog(type, value) {

  // prevent sending track on build page
  if(__buildHelper || window.location.href.startsWith('blob')){
    return;
  }

  try {
    var mobileRendered = elIsVisible(_sE.sorMobileContainer[0]);
    reverbToolbox.tracking.trackArbitrary({
      type: type, value: value, meta: { sessionId: _sessionId, mobileRendered: mobileRendered }
    });
  } catch (error) {
    console.error('Error sending logs');
  }

}

/**
 *
 * TRACK LOG ENHANCED
 *
 * @param {*} type
 * @param {*} value
 */
function trackLogEnhanced(type, value){
  if(__enhancedLogs){
    trackLog(type, value);
  }
}

/**
 *
 * MOBILE SWIPE OBSERVER [START]
 *
 */

try {

  var eventDelayOpenedCapture = true;
  var activeStepEx = '';
  var lastActiveStepSent = '';

  // element to observe
  var mobileStepsSwapObserver = new IntersectionObserver(
    function () {
      var zeroLeftItem = null;

      for (const element of _sE.sorStepMobile) {
        if (!element.clientHeight) {
          continue;
        }

        if (!zeroLeftItem) {
          zeroLeftItem = element;
        } else if (
          Math.abs(element.getBoundingClientRect().left) <
                    Math.abs(zeroLeftItem.getBoundingClientRect().left)
        ) {
          zeroLeftItem = element;
        }

        var activeStep = zeroLeftItem.getAttribute('sor-step-mobile');
        activeStepEx = zeroLeftItem.getAttribute('sor-step-mobile');

        setTimeout(() => {

          if(eventDelayOpenedCapture === true){

            if(lastActiveStepSent !== activeStepEx){
              trackLogEnhanced('lightbox-swipe', activeStepEx);
            }

            lastActiveStepSent = activeStepEx;

            setTimeout(() => {
              eventDelayOpenedCapture = true;
            }, 2000);
          }

          eventDelayOpenedCapture = false;

        }, 3000);

        document
          .querySelectorAll(`[sor-navigation-dot]`)
          .forEach(function (element) {
            var dotIndex =
                            element.getAttribute('sor-navigation-dot');

            if (dotIndex == activeStep) {
              // active step

              element.classList.add('active');

            } else {
              element.classList.remove('active');
            }
          });
      }
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] }
  );

  _sE.sorStepMobile.forEach((element) => {
    mobileStepsSwapObserver.observe(element);
  });
} catch (error) {
  console.warn(
    'It was not possible to start the observer to the sor-step-mobile items. This browser may not support IntersectionObserver.'
  );

  // hide the dots in order not to display them all empty
  if(_sE.sorNavigationDotsGroup){
    _sE.sorNavigationDotsGroup.forEach(function (element) {
      element.classList.add('dnone');
    });
  }
}

/**
 *
 * MOBILE SWIPE OBSERVER [END]
 *
 */


// at this point we assume lightbox rendered well
trackLog('lightbox-load');

/**
 *
 * UTILS [START]
 *
 */

/**
 *
 * EVENT DISPATCHER UTIL
 *
 * @param {*} eventName
 * @param {*} detail
 * @param {*} delay
 */
function dispatchEvent(eventName, detail, delay) {
  let event = new CustomEvent(eventName, {
    detail,
  });

  if (delay) {
    setTimeout(function () {
      document.dispatchEvent(event);
    }, delay);
  } else {
    document.dispatchEvent(event);
  }
}

/**
 * DEEP MERGE TWO OBJECTS UTIL
 * @param {*} obj1
 * @param {*} obj2
 * @returns
 */
function deepMerge(obj1, obj2) {
  const result = {};

  for (const key in obj2) {
    if (obj2.hasOwnProperty(key)) {
      if (
        typeof obj2[key] === 'object' &&
                obj1.hasOwnProperty(key) &&
                typeof obj1[key] === 'object'
      ) {
        result[key] = deepMerge(obj1[key], obj2[key]);
      } else {
        result[key] = obj2[key];
      }
    }
  }

  for (const key in obj1) {
    if (obj1.hasOwnProperty(key) && !result.hasOwnProperty(key)) {

      if (typeof obj1[key] === 'object' && obj1[key] !== null) {
        result[key] = deepMerge(obj1[key], {});
      } else {
        result[key] = obj1[key];
      }
    }
  }

  return result;
}

/**
 *
 * Change inner HTML
 *
 * @param {*} elements
 * @param {*} html
 */
function changeInnerHtml(elements, html) {
  elements.forEach(function (element) {
    element.innerHTML = html;
  });
}

/**
 * GET URL PARAMETER BY NAME UTIL
 * @param {*} name
 * @returns
 */
function getUrlParameterByName(name) {
  let url = window.location.href;

  if (url.includes('encoded')) {
    let encodedValue = new RegExp(/encoded=(.*)/g).exec(url)[1];
    let decodedObject = JSON.parse(atob(decodeURIComponent(encodedValue)));
    return decodedObject[name];
  }
}

/**
 *
 * DISPLAY FADE
 *
 * @param {*} element
 * @param {*} fadeIn
 * @param {*} ms
 */
function displayFade(element, fadeIn, ms) {

  var rounds =  10;

  if(!ms){
    ms = 600;
  }

  if(fadeIn){
    element.classList.remove('dnone');
  }

  var intervalInstance = setInterval(() => {

    if(fadeIn){
      element.style.opacity = (Number(element.style.opacity) || 0) + (1/rounds);

      if(element.style.opacity >= 1){
        clearInterval(intervalInstance);
      }
    }else {
      element.style.opacity = (Number(element.style.opacity) || 0) - (1/rounds);

      if(element.style.opacity <= 0){
        element.classList.add('dnone');
        clearInterval(intervalInstance);
      }
    }
  }, ms/rounds);
}

/**
 *  CONVERT CAMEL TO KEBAB CASE UTIL
 *
 * @param {*} str
 * @returns
 */
function camelToKebabe(str) {
  return str.replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').toLowerCase();
}

/**
 * CHECKS IF AN ELEMENT IS VISIBLE
 *
 * @param {*} e
 * @returns
 */
function elIsVisible(e) {
  return !!( e.offsetWidth || e.offsetHeight || e.getClientRects().length );
}