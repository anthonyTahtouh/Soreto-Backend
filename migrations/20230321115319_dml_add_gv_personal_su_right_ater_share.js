let varDefinitions = [
  {
    setting_key: 'DELIVER_PERSONAL_SU_ON_SHARE',
    context: 'CAMPAIGN_VERSION.USER_JOURNEY',
    type: 'BOOLEAN',
    description: `This configuration enables retrieving the Personal Shared Url in the Shared Url creation endpoint return. It also enables the instant navigation to the Personal Shared Url if the lightbox has the apropriated implementation to handle it.`,
    fallback_value: [false],
    restrict: false,
    multi_value: false,
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
