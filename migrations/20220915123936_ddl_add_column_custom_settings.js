
exports.up = function(knex) {
  var query = `
  
  DROP VIEW IF EXISTS reverb.agg_mp_offer_js;
  DROP VIEW IF EXISTS reverb.agg_mp_banner_js;
  DROP VIEW IF EXISTS reverb.mp_offer_js;
  
  ALTER TABLE reverb.mp_offer
  ADD COLUMN custom_settings jsonb;
  
  select reverb.create_view_table_js('reverb.mp_offer');
  `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
  DROP VIEW IF EXISTS reverb.agg_mp_banner_js;
  DROP VIEW IF EXISTS reverb.agg_mp_blog_js;
  DROP VIEW IF EXISTS reverb.agg_mp_offer_js;
  DROP VIEW IF EXISTS reverb.mp_offer_js;

  ALTER TABLE reverb.mp_offer DROP COLUMN custom_settings;

  select reverb.create_view_table_js('reverb.mp_offer');
    `;
  return knex.schema.raw(query);
};
