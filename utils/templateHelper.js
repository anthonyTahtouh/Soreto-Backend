var config = require('../config/config');

module.exports = {
  combineHtmlCssJsTemplate: function (templateObject) {
    const backUrl = config.BACK_URL;
    const {
      htmlBody='',
      css='' ,
      javascript='',
      cssExternal='',
      jsExternal='',
      discountDetails,
      campaignVersion,
      campaignVersionId,
      campaignId,
      clientId,
      sharedUrlId,
      sharedUrlAccessId,
      testMode='false',
      requiresUserEmail,
      sharerEmail,
      sharedUrlInfo,
      pageInfo,
      twoStepLightbox,
      ga = '',
      campaignVersionOverrided,
      sourceTag,
      dynamicRewardGroup,
      firstSharedUrlAccessId
    }  = templateObject;
    const details = {
      clientId:clientId,
      sharedUrlAccessId:sharedUrlAccessId,
      discountDetails:discountDetails,
      campaignId:campaignId,
      campaignVersion:campaignVersion,
      campaignVersionId:campaignVersionId,
      sharedUrlId:sharedUrlId,
      requiresUserEmail:requiresUserEmail,
      testMode:testMode,
      sharedUrlInfo: sharedUrlInfo,
      pageInfo: pageInfo,
      twoStepLightbox: twoStepLightbox,
      campaignVersionOverrided: campaignVersionOverrided,
      sourceTag: sourceTag,
      dynamicRewardGroup: dynamicRewardGroup,
      firstSharedUrlAccessId
    };

    return new Promise(function (resolve) {
      resolve(
        `
        <!DOCTYPE html>
        <html>
        <head>
          ${ga}
          <title>Soreto Placement</title>
          ${cssExternal}
          <style>
            ${css}
          </style>
          
        </head>

        <body>
          ${htmlBody}
          ${jsExternal}
          <script>
            var campaignDetails = ${JSON.stringify(details)};
            var sharerEmail = '${sharerEmail}';
            var details = ${JSON.stringify(details)};
            var marketplace = '##marketplace##';
          </script>
          <script id="reverb-sdk" src="${backUrl}/scripts/reverb-placement-sdk.min.js"></script>
          <script>
            ${javascript}
          </script>
        </body>
        </html>
      `
      );
    });
  }
};
