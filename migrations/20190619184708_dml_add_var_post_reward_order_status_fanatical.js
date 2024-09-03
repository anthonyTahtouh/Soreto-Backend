let varDefinition = {
  setting_key: 'ALLOWED_ORDER_STATUS',
  context: 'POST_REWARD'
};

let globalVar = {
  object_id: '',
  var_definition_id: '',
  value: ['PAID', 'PENDING', 'THIRD_PARTY_PENDING', 'VOID']
};

exports.up = function(knex) {

  // get var definition id
  return knex('reverb.var_definition')
    .select('*')
    .first()
    .where({
      setting_key : varDefinition.setting_key,
      context: varDefinition.context,
      client_id: null
    })
    .then((definition) => {

      if(definition){

        return knex('reverb.client')
          .select('*')
          .first()
          .where({ name : 'Fanatical'})
          .then((client) => {

            if(client){

              globalVar.object_id = client._id,
              globalVar.var_definition_id = definition._id;

              return knex('reverb.global_vars')
                .insert(globalVar);
            }
            else{

              return;
            }
          });
      }

      return;
    });
};

exports.down = function(knex) {

  return knex('reverb.var_definition')
    .select('*')
    .first()
    .where({
      setting_key : varDefinition.setting_key,
      context: varDefinition.context,
      client_id: null
    })
    .then((definition) => {

      if(definition){

        return knex('reverb.client')
          .select('*')
          .first()
          .where({ name : 'Fanatical'})
          .then((client) => {

            if(client){

              return knex('reverb.global_vars')
                .delete()
                .where({
                  object_id: client._id,
                  var_definition_id: definition._id
                });
            }
            else{

              return;
            }
          });
      }

      return;
    });
};
