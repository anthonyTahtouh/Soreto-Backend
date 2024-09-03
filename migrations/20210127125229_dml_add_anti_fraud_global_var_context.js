exports.up = function (knex) {
  let query = `ALTER TYPE reverb.SETTING_CONTEXT ADD VALUE 'CLIENT.ANTI_FRAUD';`;

  return knex.schema.raw(query);
};

exports.down = function (knex) {
  let query = `delete from pg_enum where enumlabel = 'CLIENT.ANTI_FRAUD';`;

  return knex.schema.raw(query);
};

exports.config = { transaction: false };