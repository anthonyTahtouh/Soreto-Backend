let varDefinitions = [
  {
    setting_key: 'SHOW_MINIMUM_ORDER_VALUE',
    context: 'CAMPAIGN_VERSION.LIGHTBOX',
    type: 'NUMERIC',
    restrict: false,
    multi_value: false,
    description: 'Defines minimum value to the lightbox be open',
    fallback_value: {},
  },
];

exports.up = function (knex) {
  return knex('reverb.var_definition').insert(varDefinitions);
};

exports.down = function (knex) {
  return knex('reverb.var_definition')
    .whereIn(
      'setting_key',
      varDefinitions.map((vd) => vd.setting_key)
    )
    .then((definitions) => {
      if (definitions) {
        return knex('reverb.global_vars')
          .delete()
          .whereIn(
            'var_definition_id',
            definitions.map((d) => d._id)
          )
          .then(() => {
            return knex('reverb.var_definition')
              .delete()
              .whereIn(
                'setting_key',
                varDefinitions.map((vd) => vd.setting_key)
              );
          });
      } else {
        return knex('reverb.var_definition')
          .delete()
          .whereIn(
            'setting_key',
            varDefinitions.map((vd) => vd.setting_key)
          );
      }
    });
};
