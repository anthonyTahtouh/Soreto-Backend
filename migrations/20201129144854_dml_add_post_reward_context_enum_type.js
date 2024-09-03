exports.up = function (knex) {
  let query = `ALTER TYPE reverb.SETTING_CONTEXT ADD VALUE 'CAMPAIGN_VERSION.POST_REWARD';`;

  return knex.schema.raw(query);
};

exports.down = function (knex) {
  let query = `delete from pg_enum where enumlabel = 'CAMPAIGN_VERSION.POST_REWARD';`;

  return knex.schema.raw(query);
};

exports.config = { transaction: false };