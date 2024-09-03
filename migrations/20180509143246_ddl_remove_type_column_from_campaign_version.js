exports.up = function(knex) {
  var query = `
    DROP VIEW reverb.campaign_version_js;

    ALTER TABLE reverb.campaign_version
    DROP COLUMN type;

    select reverb.create_view_table_js('reverb.campaign_version');
    `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
    DROP VIEW reverb.campaign_version_js;

    ALTER TABLE reverb.campaign_version
    ADD COLUMN type text;

    select reverb.create_view_table_js('reverb.campaign_version');
  `;
  return knex.schema.raw(query);
};