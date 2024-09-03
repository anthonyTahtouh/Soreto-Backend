let varDefinitions = [
  {
    setting_key: 'RENDER_VERSION',
    context: 'CAMPAIGN_VERSION.LIGHTBOX',
    type: 'NUMERIC',
    description: `Defines the render version of the lightbox.`,
    fallback_value: [],
    restrict: false,
    multi_value: false
  },
  {
    setting_key: 'FORCE_USER_INFO_CAPTURE',
    context: 'CAMPAIGN_VERSION.LIGHTBOX',
    type: 'BOOLEAN',
    description: `Defines if the lightbox should always capture user info.`,
    fallback_value: [false],
    restrict: false,
    multi_value: false
  }
];

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