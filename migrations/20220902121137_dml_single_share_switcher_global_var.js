let varDefinitions = [{
  setting_key: 'SINGLE_SHARE_PER_CHANNEL',
  context: 'CAMPAIGN_VERSION.USER_JOURNEY',
  type: 'BOOLEAN',
  description: `Single share per channel switcher. 
  When it is ON, the user share URL will remain the same until it is valid, no matter how many times the user tries to share, the result will be the same.`,
  fallback_value: [false],
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