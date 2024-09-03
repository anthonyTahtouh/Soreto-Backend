/* eslint-disable no-undef */
/**
 *
 * UTILS [END]
 *
 */

/**
 *
 * BUILD HELPER [START]
 *
 * the "__buildHelper" variable is only available on build time
 */
if (__buildHelper) {
  if (__buildHelper.mobile && __buildHelper.mobile.showSteps) {
    if (!__buildHelper.mobile.showSteps.cover) {
      let coverStep = document.querySelector('[sor-step-mobile="COVER"]');

      if (coverStep) {
        coverStep.style.display = 'none';
      }
    }

    if (!__buildHelper.mobile.showSteps.userInfoCapture) {
      let userInfoCaptureStep = document.querySelector(
        '[sor-step-mobile="USER_INFO_CAPTURE"]'
      );
      let userInfoCaptureDesktop = document.querySelector(
        '[sor-step-desktop="USER_INFO_CAPTURE"]'
      );

      if (userInfoCaptureStep) {
        userInfoCaptureStep.style.display = 'none';
      }

      if (userInfoCaptureDesktop) {
        let event = new CustomEvent('stateChange', {
          detail: { state: _screenStates.SHARE },
        });
        document.dispatchEvent(event);
      }
    }

    if (!__buildHelper.mobile.showSteps.share) {
      let shareStep = document.querySelector('[sor-step-mobile="SHARE"]');
      let shareDesktop = document.querySelector(
        '[sor-step-desktop="SHARE"]'
      );

      if (shareStep) {
        shareStep.style.display = 'none';
      }

      if (shareDesktop) {
        let event = new CustomEvent('stateChange', {
          detail: { state: _screenStates.USER_INFO_CAPTURE },
        });
        document.dispatchEvent(event);
      }
    }
  }

  if(__buildHelper.sharedMode){
    _alreadySharedPlatforms = [
      'FACEBOOK',
      'WHATSAPP',
      'TWITTER',
      'INSTAGRAM',
      'PINTEREST',
      'MESSENGER',
      'LINK',
      'EMAIL'
    ];
    handleSelectedSocialOptionChange(_selectedSocialPlatform);
  }

  document.querySelectorAll('*').forEach(function (element) {

    if(!__buildHelper.editMode){
      return;
    }

    let sorAttr = Array.from(element.attributes).find((attr) =>
      attr.name.includes('sor-')
    );
    if (sorAttr) {
      element.classList.add('builderSpot');

      element.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        // let targetAttr = Array.from(e.target.attributes).find(attr => attr.name.includes('sor-'));

        // if(targetAttr !== sorAttr){
        //   return true;
        // }

        let selected = Array.from(
          document.getElementsByClassName('builderSpotSelected')
        );

        if (selected && selected.length > 0) {
          selected.forEach(function (element) {
            element.classList.remove('builderSpotSelected');
          });
        }

        element.classList.add('builderSpotSelected');
        const attributeValue = element.getAttribute(sorAttr.name);

        let attributeRef = '';
        if (attributeValue) {
          attributeRef = `${sorAttr.name}="${attributeValue}"`;
        } else {
          attributeRef = sorAttr.name;
        }

        window.parent.postMessage(
          JSON.stringify({ spotElementClick: attributeRef }),
          '*'
        );

        let existentEditionDiv = document.getElementById('edition-div');

        if(existentEditionDiv){
          existentEditionDiv.remove();
        }

        if(!element.getAttribute('schema-prop')){
          return;
        }

        let editionDiv = document.createElement('div');
        editionDiv.id = 'edition-div';
        editionDiv.style.display = 'flex';
        editionDiv.style.width = '100%';

        let editionInput  = document.createElement('textarea');
        editionInput.value = element.innerText;
        editionInput.style.flex = '7';

        let editionSubmit = document.createElement('button');
        editionSubmit.textContent = 'apply';
        editionSubmit.style.flex = '2';
        editionSubmit.type = 'button';

        let editionClear = document.createElement('button');
        editionClear.textContent = 'X';
        editionClear.type = 'button';
        editionClear.style.flex = '1';

        editionInput.addEventListener('click', function(event) {
          event.stopPropagation();
        });

        editionSubmit.addEventListener('click', function(event) {

          event.stopPropagation();

          window.parent.postMessage(
            JSON.stringify({ schemaProp: element.getAttribute('schema-prop'), valueChange: editionInput.value }),
            '*'
          );
        });

        editionClear.addEventListener('click', function(event) {

          event.stopPropagation();

          let existentEditionDiv = document.getElementById('edition-div');

          if(existentEditionDiv){
            existentEditionDiv.remove();
          }
        });

        editionDiv.append(editionInput);
        editionDiv.append(editionSubmit);
        editionDiv.append(editionClear);

        element.appendChild(editionDiv);
      });
    }
  });
}
/**
   *
   * BUILD HELPER [START]
   *
   */