exports.up = function (knex) {
  let query = `
      
          ALTER TYPE reverb.SETTING_CONTEXT ADD VALUE 'CLIENT.INFRA';
         
      `;

  return knex.schema.raw(query);
};

exports.down = function (knex) {
  let query = `
  
      DELETE FROM pg_enum WHERE enumlabel = 'CLIENT.INFRA' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'setting_context');
    `;

  return knex.schema.raw(query);
};

exports.config = { transaction: false };