// TODO: CUSTOMIZE LABEL PREFIX

const moment = require('moment');

const constants = require('../../common/constants');
const { getObjectClone } = require('../../common/utility');

const campaignVersionService = require('../campaignVersion');
const DisplayBlockService = require('../displayBlock');
const CodeBlockService = require('../codeBlock');
const emailTemplateService = require('../emailTemplate');
const associateEmailToCampaignVersionService = require('../associateEmailToCampaignVersionService');
const rewardPoolService = require('../rewardPool');
const globalVarsService = require('../sharedServices/globalVars');

var displayBlockService = new DisplayBlockService();
var codeBlockService = new CodeBlockService();

const copyCampaignVersion = async (payload) => {
  /**
     * GET BASE CAMPAIGN VERSION
     */
  let baseCampaignVersion =
        await campaignVersionService.getCampaignVersionSync(
          payload.campaignVersionBaseId
        );

  /**
     * GET BASE TEMPLATE CAMPAIGN VERSION
     */
  let campaignVersionsUnderTemplateCampaign = await new Promise(
    (res, rej) => {
      campaignVersionService.getAllCampaignVersionsByCampaignId(
        payload.campaignTemplateId,
        (err, result) => {
          if (err) rej(err);

          res(result);
        }
      );
    }
  );

  // validation
  if (
    !campaignVersionsUnderTemplateCampaign ||
        campaignVersionsUnderTemplateCampaign.length == 0
  ) {
    throw `There's no Campaign Version under the informed Campaign`;
  }

  let baseCampaignVersionTemplate = campaignVersionsUnderTemplateCampaign[0];

  /**
   * CREATE THE NEW CAMPAIGN VERSION
   */

  // deep copy the base campaign
  const newCampaignVersionObj = JSON.parse(
    JSON.stringify(baseCampaignVersion)
  );

  // drop the ID to prevent duplicity
  delete newCampaignVersionObj._id;

  // update the fields
  newCampaignVersionObj.createdAt = moment();
  newCampaignVersionObj.updatedAt = moment();
  newCampaignVersionObj.name = `[BOOST] - ${newCampaignVersionObj.name}`;
  newCampaignVersionObj.alias = `boost_${newCampaignVersionObj.alias}`;

  newCampaignVersionObj.active = false;
  newCampaignVersionObj.rewardPoolId = null;
  newCampaignVersionObj.sourceTags = [];
  newCampaignVersionObj.exposure = 50;
  newCampaignVersionObj.documentUrl = null;

  // create the new campaign version
  const newCampaignVersion =
        await campaignVersionService.createCampaignVersionAsync(
          newCampaignVersionObj
        );

  /**
   *
   * ASSETS COPY
   *
   */

  /**
   * DISPLAY BLOCKS
   */
  await copyDisplayBlocks(
    newCampaignVersion._id,
    payload.campaignVersionBaseId,
    baseCampaignVersionTemplate._id,
    payload.copyOptions,
    payload.templateReplaceables
  );

  /**
   * EMAILS
   */
  await copyEmails(
    newCampaignVersion._id,
    payload.campaignVersionBaseId,
    baseCampaignVersionTemplate._id,
    payload.copyOptions,
    payload.templateReplaceables
  );

  /**
   * REWARDS
   */
  await copyRewards(
    newCampaignVersion,
    baseCampaignVersion,
    baseCampaignVersionTemplate,
    payload.copyOptions
  );

  /**
     * GLOBAL VARS
     */
  await copyGlobalVars(
    newCampaignVersion._id,
    payload.campaignVersionBaseId,
    baseCampaignVersionTemplate._id,
    payload.copyOptions
  );
};

/**
 *
 * COPY DISPLAY BLOCKS
 *
 * @param {*} copiedCampaignVersionId
 * @param {*} campaignVersionBaseId
 * @param {*} campaignVersionTemplateId
 * @param {*} copyOptions
 * @param {*} replaceables
 */
const copyDisplayBlocks = async (
  copiedCampaignVersionId,
  campaignVersionBaseId,
  campaignVersionTemplateId,
  copyOptions,
  replaceables
) => {

  // ITERATE OVER ALL DISPLAY BLOCKS
  for (let displayBlockType in constants.DISPLAY_BLOCK_TYPES) {

    // current disply block type
    let displayBlockIdentifier =
            constants.DISPLAY_BLOCK_TYPES[displayBlockType];

    let copyFromTemplate =
            copyOptions.templateOptions.displayBlocks[displayBlockIdentifier];
    let copyFromBaseCampaign =
            copyOptions.baseOptions.displayBlocks[displayBlockIdentifier];

    let sourceCampaignVersionId = null;
    if (copyFromTemplate) {
      sourceCampaignVersionId = campaignVersionTemplateId;
    } else if (copyFromBaseCampaign) {
      sourceCampaignVersionId = campaignVersionBaseId;
    }

    if (sourceCampaignVersionId) {
      let codeBlockReplaceables =
                replaceables &&
                replaceables['codeBlocks'] &&
                replaceables['codeBlocks'][displayBlockIdentifier];

      await copyDisplayBlock(
        displayBlockIdentifier,
        sourceCampaignVersionId,
        copiedCampaignVersionId,
        codeBlockReplaceables
      );
    }
  }
};

/**
 *
 * COPY DISPLAY BLOCK
 *
 * @param {*} displayBlockType
 * @param {*} sourceCampaignVersionId
 * @param {*} targetCampaignVersionId
 * @param {*} codeBlockReplaceables
 * @returns
 */
const copyDisplayBlock = async (
  displayBlockType,
  sourceCampaignVersionId,
  targetCampaignVersionId,
  codeBlockReplaceables
) => {
  /**
     * take the active display block to the campaign version and type
     */
  let activeDisplayBlocks = await displayBlockService.getAsync({
    campaignVersionId: sourceCampaignVersionId,
    type: displayBlockType,
    active: true,
  });

  // test not found
  if (!activeDisplayBlocks || activeDisplayBlocks.length == 0) {
    // TODO: test this flow
    return;
  }

  /**
     * There shouldn't be any scenario where 2 display blocks having the same type and active
     * That is why we are taking the first item in the array
     */
  const activeDisplayBlock = activeDisplayBlocks[0];

  /**
     * take the active code block
     */
  const activeCodeBlocks = await codeBlockService.getAsync({
    displayBlockId: activeDisplayBlock._id,
    active: true,
  });

  // test not found
  if (!activeCodeBlocks || activeCodeBlocks.length == 0) {
    // TODO: test this flow
    return;
  }

  /**
     * There shouldn't be any scenario where 2 code blocks having the same display block and active
     * That is why we are taking the first item in the array
     */
  const activeCodeBlock = activeCodeBlocks[0];

  /**
     *
     * CREATING THE NEW DISPLAY BLOCK
     *
     */

  const newDisplayBlockObj = getObjectClone(activeDisplayBlock);
  delete newDisplayBlockObj._id;
  newDisplayBlockObj.createdAt = moment();
  newDisplayBlockObj.updatedAt = moment();
  newDisplayBlockObj.name = `[BOOST] - ${newDisplayBlockObj.name}`;
  newDisplayBlockObj.campaignVersionId = targetCampaignVersionId;

  let createdDisplayBlock = await displayBlockService.createAsync(
    newDisplayBlockObj
  );

  /**
     *
     * CREATING THE NEW CODE BLOCK
     *
     */

  const newCodeBlockObjectObj = getObjectClone(activeCodeBlock);
  delete newCodeBlockObjectObj._id;
  newCodeBlockObjectObj.createdAt = moment();
  newCodeBlockObjectObj.updatedAt = moment();
  newCodeBlockObjectObj.displayBlockId = createdDisplayBlock._id;
  newCodeBlockObjectObj.name = `[BOOST] - ${newCodeBlockObjectObj.name}`;

  if (codeBlockReplaceables) {
    replaceCodeBlockReplaceables(
      newCodeBlockObjectObj,
      codeBlockReplaceables
    );
  }

  await codeBlockService.createAsync(newCodeBlockObjectObj);
};

let replaceCodeBlockReplaceables = (codeBlock, replaceables) => {
  if (replaceables.javascript) {
    if (replaceables.javascript) {
      for (let repItem of Object.keys(replaceables.javascript)) {
        codeBlock.javascript = codeBlock.javascript.replace(
          new RegExp(`##${repItem}##`, 'g'),
          replaceables.javascript[repItem]
        );
      }
    }

    if (replaceables.scss) {
      for (let repItem of Object.keys(replaceables.scss)) {
        codeBlock.scss = codeBlock.scss.replace(
          new RegExp(`##${repItem}##`, 'g'),
          replaceables.scss[repItem]
        );
      }
    }
    if (replaceables.htmlBody) {
      for (let repItem of Object.keys(replaceables.htmlBody)) {
        codeBlock.htmlBody = codeBlock.htmlBody.replace(
          new RegExp(`##${repItem}##`, 'g'),
          replaceables.htmlBody[repItem]
        );
      }
    }
  }
};

/**
 *
 * COPY EMAILS
 *
 * @param {*} copiedCampaignVersionId
 * @param {*} campaignVersionBaseId
 * @param {*} campaignVersionTemplateId
 * @param {*} copyOptions
 * @param {*} replaceables
 */
const copyEmails = async (
  copiedCampaignVersionId,
  campaignVersionBaseId,
  campaignVersionTemplateId,
  copyOptions,
  replaceables
) => {

  // ITERATE OVEL ALL EMAIL TYPES
  for (let emailType in constants.EMAIL_TEMPLATE_TYPES) {

    // CURRENT EMAIL TYPE IDENTIFIER
    let emailTypeIdentifier = constants.EMAIL_TEMPLATE_TYPES[emailType];

    let copyFromTemplate =
            copyOptions.templateOptions.emails[emailTypeIdentifier];
    let copyFromBaseCampaign =
            copyOptions.baseOptions.emails[emailTypeIdentifier];

    let sourceCampaignVersionId = null;
    if (copyFromTemplate) {
      sourceCampaignVersionId = campaignVersionTemplateId;
    } else if (copyFromBaseCampaign) {
      sourceCampaignVersionId = campaignVersionBaseId;
    }

    if (sourceCampaignVersionId) {
      let emailReplaceables =
                replaceables &&
                replaceables['emails'] &&
                replaceables['emails'][emailTypeIdentifier];

      await copyEmail(
        emailTypeIdentifier,
        sourceCampaignVersionId,
        copiedCampaignVersionId,
        emailReplaceables
      );
    }
  }
};

/**
 *
 *  COPY EMAIL
 *
 * @param {*} emailType
 * @param {*} sourceCampaignVersionId
 * @param {*} tagetCampaignVersionId
 * @param {*} replaceables
 * @returns
 */
const copyEmail = async (
  emailType,
  sourceCampaignVersionId,
  tagetCampaignVersionId,
  replaceables
) => {
  /**
     * Take the active email template to the campaign version and type
     */
  const assocCampaignEmailTemplates =
        await associateEmailToCampaignVersionService.get({
          campaignVersionId: sourceCampaignVersionId,
          emailTemplateType: emailType,
        });

  // test not found
  if (
    !assocCampaignEmailTemplates ||
        assocCampaignEmailTemplates.length == 0
  ) {
    return;
  }

  const assocCampaignEmailTemplate = assocCampaignEmailTemplates[0];

  // take the associated email template
  const emailTemplates = await emailTemplateService.getAsync({
    _id: assocCampaignEmailTemplate.emailTemplateId,
  });

  // test not found
  if (!emailTemplates || emailTemplates.length == 0) {
    return;
  }

  let emailTemplate = emailTemplates[0];

  /**
     * CREATE THE NEW EMAIL TEMPLATE
     */
  const newEmailTemplateObj = JSON.parse(JSON.stringify(emailTemplate));
  delete newEmailTemplateObj._id;
  newEmailTemplateObj.createdAt = moment();
  newEmailTemplateObj.updatedAt = moment();
  newEmailTemplateObj.name = `[BOOST] - ${newEmailTemplateObj.name}`;

  // replace replaceable fields
  if (replaceables) {
    for (let key of Object.keys(replaceables)) {
      if (newEmailTemplateObj.templateValues[key]) {
        for (let key2 of Object.keys(replaceables[key])) {
          newEmailTemplateObj.templateValues[key] =
                        newEmailTemplateObj.templateValues[key].replace(
                          new RegExp(`##${key2}##`, 'g'),
                          replaceables[key][key2]
                        );
        }
      }
    }
  }

  const createdEmailTemplate = await emailTemplateService.createAsync(
    newEmailTemplateObj
  );

  await associateEmailToCampaignVersionService.create({
    createdAt: moment(),
    updatedAt: moment(),
    emailTemplateId: createdEmailTemplate._id,
    campaignId: assocCampaignEmailTemplate.campaignId,
    campaignVersionId: tagetCampaignVersionId,
  });
};

/**
 *
 * COPY REWARDS
 *
 * @param {*} copiedCampaignVersion
 * @param {*} baseCampaignVersion
 * @param {*} campaignVersionTemplate
 * @param {*} copyOptions
 */
const copyRewards = async (
  copiedCampaignVersion,
  baseCampaignVersion,
  campaignVersionTemplate,
  copyOptions
) => {
  let copyFromTemplate = copyOptions.templateOptions.rewards.all;
  let copyFromBaseCampaign = copyOptions.baseOptions.rewards.all;

  let sourceCampaignVersion = null;

  if (copyFromTemplate) {
    sourceCampaignVersion = campaignVersionTemplate;
  } else if (copyFromBaseCampaign) {
    sourceCampaignVersion = baseCampaignVersion;
  }

  if (sourceCampaignVersion) {
    await copyRewardPool(sourceCampaignVersion, copiedCampaignVersion);
  }
};

/**
 * COPY REWARD POOL
 *
 * @param {*} sourceCampaignVersion
 * @param {*} tagetCampaignVersion
 * @returns
 */
const copyRewardPool = async (sourceCampaignVersion, tagetCampaignVersion) => {
  /**
     * TAKE THE REWARD POOL TO BE COPIED
     */
  const rewardPools = await rewardPoolService.get({
    _id: sourceCampaignVersion.rewardPoolId,
  });

  //test not found
  if (!rewardPools || rewardPools.length == 0) {
    return;
  }

  const rewardPool = rewardPools[0];

  /**
     * CREATE THE NEW REWARD POOL
     */
  const newRewardPoolObject = JSON.parse(JSON.stringify(rewardPool));
  delete newRewardPoolObject._id;
  newRewardPoolObject.createdAt = moment();
  newRewardPoolObject.updatedAt = moment();

  let createdRewardPool = await rewardPoolService.create(newRewardPoolObject);

  /**
     * UPDATE TARGET CAMPAIGN VERSION
     */
  await campaignVersionService.updateCampaignVersionAsync(
    tagetCampaignVersion._id,
    { rewardPoolId: createdRewardPool._id }
  );
};

/**
 *
 * COPY GLOBAL VARS
 *
 * @param {*} copiedCampaignVersionId
 * @param {*} campaignVersionBaseId
 * @param {*} campaignVersionTemplateId
 * @param {*} copyOptions
 */
const copyGlobalVars = async (
  copiedCampaignVersionId,
  campaignVersionBaseId,
  campaignVersionTemplateId,
  copyOptions
) => {
  let copyFromTemplate = copyOptions.templateOptions.globalVars.all;
  let copyFromBaseCampaign = copyOptions.baseOptions.globalVars.all;

  let sourceCampaignVersionId = null;

  if (copyFromTemplate) {
    sourceCampaignVersionId = campaignVersionTemplateId;
  } else if (copyFromBaseCampaign) {
    sourceCampaignVersionId = campaignVersionBaseId;
  }

  if (sourceCampaignVersionId) {
    await copyGlobalVar(sourceCampaignVersionId, copiedCampaignVersionId);
  }
};

/**
 *
 * COPY GLOBAL VAR
 *
 * @param {*} sourceCampaignVersionId
 * @param {*} copiedCampaignVersionId
 */
const copyGlobalVar = async (
  sourceCampaignVersionId,
  copiedCampaignVersionId
) => {

  // GET ALL GLOBAL VARS FROM CAMPAIGN VERSION
  const campaignVersionVars =
        await globalVarsService.getGlobalVarEspecialization({
          objectId: sourceCampaignVersionId,
        });

  for (let gv of campaignVersionVars) {
    await globalVarsService.createSpecializationTransactionless(
      copiedCampaignVersionId,
      gv.varDefinitionId,
      gv.value
    );
  }
};

const getAllAssets = async (campaignId) => {
  /**
     * GET BASE TEMPLATE CAMPAIGN VERSION
     */
  let campaignVersionsUnderCampaign = await new Promise((res, rej) => {
    campaignVersionService.getAllCampaignVersionsByCampaignId(
      campaignId,
      (err, result) => {
        if (err) rej(err);

        res(result);
      }
    );
  });

  // validation
  if (
    !campaignVersionsUnderCampaign ||
        campaignVersionsUnderCampaign.length == 0
  ) {
    throw `There's no Campaign Version under the informed Campaign`;
  }

  let campaignVersionId = campaignVersionsUnderCampaign[0]._id;

  let assets = {
    codeBlocks: [],
    emails: [],
  };

  /**
     *  CODE BLOCKS
     */
  let activeDisplayBlocks = await displayBlockService.getAsync({
    campaignVersionId: campaignVersionId,
    active: true,
  });

  if (activeDisplayBlocks && activeDisplayBlocks.length > 0) {
    for (let db of activeDisplayBlocks) {
      let codeBlocks = await codeBlockService.getAsync({
        displayBlockId: db._id,
        active: true,
      });

      if (codeBlocks && codeBlocks.length > 0) {
        let codeBlock = codeBlocks[0];
        codeBlock.displayBlockType = db.type;

        assets.codeBlocks.push(codeBlock);
      }
    }
  }

  /**
     * EMAILS
     */

  /**
     * Take the active email template to the campaign version and type
     */
  const assocCampaignEmailTemplates =
        await associateEmailToCampaignVersionService.get({
          campaignVersionId: campaignVersionId,
        });

  if (assocCampaignEmailTemplates && assocCampaignEmailTemplates.length > 0) {
    // take the associated email template
    const emailTemplates = (
      await Promise.all(
        assocCampaignEmailTemplates.map((ae) =>
          emailTemplateService.getAsync({ _id: ae.emailTemplateId })
        )
      )
    ).flat();

    // test not found
    if (emailTemplates && emailTemplates.length > 0) {
      assets.emails = emailTemplates;
    }
  }

  return getAssetsReplaceables(assets);
};

const getAssetsReplaceables = (assets) => {
  for (let asset in assets) {
    switch (asset) {
    case 'codeBlocks':
      for (let cb of assets[asset]) {
        cb.scss_replaceables = takeReplaceables(cb.scss);
        cb.htmlBody_replaceables = takeReplaceables(cb.htmlBody);
        cb.javascript_replaceables = takeReplaceables(
          cb.javascript
        );
      }
      break;
    case 'emails':
      for (let et of assets[asset]) {
        et.templateValues_repleaceables = {};
        for (let templateValue of Object.keys(et.templateValues)) {
          if (!et.templateValues[templateValue].includes('##')) {
            continue;
          }

          et.templateValues_repleaceables[templateValue] =
                            takeReplaceables(et.templateValues[templateValue]);
        }
      }
      break;
    }
    console.log(asset);
  }

  return assets;

  function takeReplaceables(cb) {
    return [...new Set(cb.split('##').filter((v, i) => i % 2 === 1))];
  }
};

module.exports = {
  copy: copyCampaignVersion,
  getAllAssets,
};
