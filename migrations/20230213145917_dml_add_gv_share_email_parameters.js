let varDefinitions = [
  {
    setting_key: 'SHARE_EMAIL_QUOTA',
    context: 'CAMPAIGN_VERSION.USER_JOURNEY',
    type: 'NUMERIC',
    description: ``,
    fallback_value: [1],
    restrict: false,
    multi_value: false
  },
  {
    setting_key: 'SHARE_EMAIL_QUOTA_MINUTES_TTL',
    context: 'CAMPAIGN_VERSION.USER_JOURNEY',
    type: 'NUMERIC',
    description: ``,
    fallback_value: [10],
    restrict: false,
    multi_value: false
  },
  {
    setting_key: 'SHARE_EMAIL_SEND_DELAY',
    context: 'CAMPAIGN_VERSION.USER_JOURNEY',
    type: 'NUMERIC',
    description: ``,
    fallback_value: [10],
    restrict: false,
    multi_value: false
  }];

exports.up = function(knex) {

  return knex('reverb.var_definition')
    .insert(varDefinitions);
};

exports.down = function(knex) {

  return knex('reverb.var_definition')
    .whereIn('setting_key', varDefinitions.map(vd => vd.setting_key))
    .then((definitions) => {

      if(definitions){

        return knex('reverb.global_vars')
          .delete()
          .whereIn('var_definition_id', definitions.map(d => d._id))
          .then(() => {

            return knex('reverb.var_definition')
              .delete()
              .whereIn('setting_key', varDefinitions.map(vd => vd.setting_key));
          });
      }else {

        return knex('reverb.var_definition')
          .delete()
          .whereIn('setting_key', varDefinitions.map(vd => vd.setting_key));
      }

    });
};