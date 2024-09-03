exports.up = function (knex) {

  return knex.schema.raw(`ALTER TYPE reverb.SETTING_CONTEXT ADD VALUE 'CAMPAIGN_VERSION.LANDING_PAGE';`);
};

exports.down = function (knex) {

  return knex.schema.raw(`delete from pg_enum where enumlabel = 'CAMPAIGN_VERSION.LANDING_PAGE';`);
};

exports.config = { transaction: false };