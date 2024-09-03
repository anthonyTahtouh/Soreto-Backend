let varDefinitions = [{
  setting_key: 'CAPTURE_ORDER_FRESH_USER_DAYS',
  context: 'CLIENT.SECURITY',
  type: 'NUMERIC',
  description: 'Defines the number of days to store order fresh users',
  fallback_value: [0],
  restrict: false,
  multi_value: false
},
{
  setting_key: 'SHOW_LIGHTBOX_ONLY_TO_ORDER_FRESH_USER',
  context: 'CAMPAIGN_VERSION.SECURITY',
  type: 'BOOLEAN',
  description: 'Defines if the lightbox should only be shown to order fresh user',
  fallback_value: [false],
  restrict: false,
  multi_value: false
},
{
  setting_key: 'FRIEND_REWARD_ONLY_ORDER_FRESH_USER',
  context: 'CAMPAIGN_VERSION.SECURITY',
  type: 'BOOLEAN',
  description: 'Defines if the discount codes should be given only for fresh users',
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