
exports.up = function(knex) {
  var query = `
      CREATE TYPE reverb.campaign_type AS ENUM ('on_site_referral', 'marketplace');
      ALTER TABLE reverb.campaign ADD COLUMN type reverb.campaign_type not null default 'on_site_referral';
      select reverb.create_view_table_js('reverb.campaign');`;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
      DROP VIEW reverb.agg_campaign_js;
      DROP VIEW reverb.campaign_js;
      ALTER TABLE reverb.campaign DROP COLUMN type;
      DROP TYPE reverb.campaign_type;
      select reverb.create_view_table_js('reverb.campaign');`;
  return knex.schema.raw(query);
};