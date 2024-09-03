//const SETTING_KEYS = [
//  'SHARE_MESSAGE_FACEBOOK',
//  'SHARE_MESSAGE_WHATSAPP',
//  'SHARE_MESSAGE_TWITTER',
//  'SHARE_MESSAGE_PINTEREST',
//  'SHARE_IMAGE_PINTEREST',
//  'PRODUCT_URL'
//];

//const CONTEXT = 'CAMPAIGN_VERSION.CUSTOM_FIELD';

exports.up = async function () {
  //const campaignVersionFieldsKeys = await knex('reverb.campaign_version_fields_js')
  //  .select(['campaignVersionId', 'key', 'value'])
  //  .map(m => {
  //    m.settingKey = m.key.replace(/-/g, '_').toUpperCase();
  //    return m;
  //  });

  //if (campaignVersionFieldsKeys.length === 0) return;

  //const varDefinitions = await knex('reverb.var_definition_js')
  //  .whereIn('settingKey', SETTING_KEYS)
  //  .andWhere({
  //    context: CONTEXT,
  //    clientId: null
  //  })
  //  .select(['_id', 'settingKey'])
  //  .map(m => {
  //    return {
  //      varDefinitionId: m._id,
  //      objectId: campaignVersionFieldsKeys.find(x => x.settingKey === m.settingKey).campaignVersionId,
  //      value: [campaignVersionFieldsKeys.find(x => x.settingKey === m.settingKey).value],
  //    };
  //  });

  //await knex.batchInsert('reverb.global_vars_js', varDefinitions, 10).returning('*');
  return;

};

exports.down = async function () {

  //const varDefinitionIds = await knex('reverb.var_definition_js').whereIn('settingKey', SETTING_KEYS).select('_id').map(x => x._id);

  //await knex('reverb.global_vars_js').delete().where('varDefinitionId', 'in', varDefinitionIds);

  return;
};