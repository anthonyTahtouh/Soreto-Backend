const AbstractCrudInterface = require('./CrudInterface');
const ejs = require('ejs');
const sass = require('node-sass');
const fs = require('fs');
const { friendlify, getVarsFromDB } = require('./sharedServices/globalVars');
const config = require('../config/config');
const cache = require('../utils/redisCache')(1);
var _ = require('lodash');
const { gtagCode } = require('../common/utility');

class assetService extends AbstractCrudInterface {
  constructor() {
    super('reverb.asset_js');
  }

  checkUnique(obj, id){
    return super.checkUnique(obj, this.uniqueProps(), id);
  }

  uniqueProps() {
    return [
      ['campaign_version_id', 'type', 'active'],
    ];
  }

  pick(obj) {
    return _.pick(obj, []);
  }

  requiredProps() {
    return ['data', 'templateName', 'templateVersion'];
  }
  async getByCampaignVersionId(campaignVersionId){

    try {
      let cachedCompiled = await cache.get(`ASSET:LIGHTBOX:${campaignVersionId}`) ;

      if(cachedCompiled){
        return cachedCompiled;
      }
    } catch (error) {
      console.error(error);
    }

    let results = await this.get({campaignVersionId, active: true });

    if(results && results.length > 0){
      let asset = results[0];

      try {
        await cache.set(`ASSET:LIGHTBOX:${campaignVersionId}`, asset.compiled, 0);
      } catch (error) {
        console.error(error);
      }

      return asset.compiled;
    }

    return null;
  }

  async compile(payload, campaignVersion){

    const cpvGv = friendlify(await getVarsFromDB(['MINIMIZATION_ENABLED', 'FORCE_USER_INFO_CAPTURE'], 'CAMPAIGN_VERSION.LIGHTBOX', payload.campaignVersionId));

    let templateName = payload.templateName;
    let version = payload.templateVersion;
    var basicSkinsPath = `assets/lightbox/templates/${templateName}/${version}`;

    let globalJsVersion = 1;

    //
    // generate the raw scss with the replaced variables
    //
    var sassStr = await new Promise((res, rej) => {
      ejs.renderFile(
        `${basicSkinsPath}/template.scss`,
        {
          ...{ data: payload.data },
          ...{
            conditionalStyle: (styleName, value, defaultValue) => {
              if(value){
                return `${styleName}: ${value};`;
              }else if(defaultValue){
                return `${styleName}: ${defaultValue};`;
              }

              return '';
            }
          }
        },
        (err, rendered) => {

          if(err){
            rej(err);
          }else{
            res(rendered);
          }
        }
      );
    });

    //
    // turn the scss into css
    //
    var css = '';

    try {
      css = sass
        .renderSync({
          data: sassStr,
          outputStyle: 'compressed',
          importer: function(url) {

            return {contents: fs.readFileSync(`assets/lightbox/${url}`).toString()};
          },
        })
        .css.toString();
    } catch (error) {
      error.messsage = error.formatted;
      throw error;
    }

    //
    // render extra style
    //
    let extraStyleStr = ``;

    if(payload.extraStyle){
      for(let styleElementKey of Object.keys(payload.extraStyle)){

        extraStyleStr += `[${styleElementKey}] {`;

        for (const styleKey of Object.keys(payload.extraStyle[styleElementKey])) {
          extraStyleStr += `${styleKey}:${payload.extraStyle[styleElementKey][styleKey]} !important;`;
        }

        extraStyleStr += `}`;
      }
    }

    // concat the ovverided style to the template style
    css += extraStyleStr;

    //
    // read the global js
    //
    let js = fs.readFileSync(`assets/lightbox/global-${globalJsVersion}.js`).toString();

    //
    // build helper js
    //
    let buildHelperJs = '';

    if(payload.buildHelper){
      buildHelperJs = fs.readFileSync(`assets/lightbox/buildHelper-${globalJsVersion}.js`).toString();
    }

    //
    // gtag JS
    //
    let gtagJs = '';

    if(!payload.buildHelper){
      const gaToken = config.ANALYTICS.GA.TOKEN;
      const cookieFlags = process.env.NODE_ENV === 'dev' ? 'samesite=lax' : 'secure;samesite=none';

      gtagJs = gtagCode(gaToken, cookieFlags);
    }

    //
    // build the assset
    //
    var compiledHtml = await new Promise((res, rej) => {
      ejs.renderFile(
        `${basicSkinsPath}/template.html`,
        {
          ...{ data: payload.data },
          ...{ css, js, buildHelperJs, gtagJs, cpvGv },
          ...{ buildHelper: payload.buildHelper },
          ...{ campaignVersionId: payload.campaignVersionId, backUrl: config.BACK_URL },
          ...{ campaignDetails: campaignVersion ? {
            clientId: campaignVersion.clientId,
            campaignVersionId: payload.campaignVersionId,
            sourceTag: campaignVersion.sourceTags
          } : {} },
          ...{
            showMobileStepOnLoad: (step) => {

              let stepsOrder = _.get(payload, 'data.content.mobile.stepsOrder') ;

              return stepsOrder && stepsOrder.filter(s => s != 'COVER').indexOf(step) == 0 ? '': 'dnone';
            },
            showDesktopStepOnLoad: (step) => {

              let stepsOrder = _.get(payload, 'data.content.desktop.stepsOrder');
              return stepsOrder && stepsOrder.indexOf(step) > 0 ? 'dnone' : '';
            }
          }
        },
        (err, rendered) => {

          if(err){
            rej(err);
          }else {
            res(rendered);
          }
        }
      );
    });

    return compiledHtml;
  }

  async create(payload) {

    // for the time being it is only lightbox and always active
    payload.active = true;
    payload.type = 'LIGHTBOX';

    return super.create(payload);
  }

  async update(id, payload) {

    await cache.del(`ASSET:LIGHTBOX:${payload.campaignVersionId}`);

    return super.update(id, payload);
  }
}

module.exports = new assetService();