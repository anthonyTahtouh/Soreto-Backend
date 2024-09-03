let varDefinition = {
  setting_key: 'POST_REWARD_VERSION',
  context: 'POST_REWARD',
  type: 'NUMERIC',
  description: 'Defines the Post Reward version',
  fallback_value: [1],
  restrict: false,
  multi_value: false
};

exports.up = function(knex) {

  return knex('reverb.var_definition')
    .insert(varDefinition);
};

exports.down = function(knex) {

  return knex('reverb.var_definition')
    .first()
    .where(
      {
        setting_key : varDefinition.setting_key,
        context: varDefinition.context,
        client_id: null
      })
    .then((definition) => {

      if(definition){

        return knex('reverb.global_vars')
          .delete()
          .where(
            {
              var_definition_id : definition._id
            })
          .then(() => {

            return knex('reverb.var_definition')
              .delete()
              .where(
                {
                  setting_key : varDefinition.setting_key,
                  context: varDefinition.context,
                  client_id: null
                });
          });
      }else {

        return knex('reverb.var_definition')
          .delete()
          .where(
            {
              setting_key : varDefinition.setting_key,
              context: varDefinition.context,
              client_id: null
            });
      }

    });
};
