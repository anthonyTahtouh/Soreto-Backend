
exports.up = function(knex) {
  var query = `
    DROP VIEW reverb.campaign_version_js;

    ALTER TABLE reverb.campaign_version ADD COLUMN PUBLIC_SHARED_URL_EXPIRES_AT TIMESTAMP NULL;

    ALTER TABLE reverb.campaign_version ADD COLUMN PRIVATE_SHARED_URL_EXPIRES_AT TIMESTAMP NULL;

    select reverb.create_view_table_js('reverb.campaign_version');
    `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
  DROP VIEW reverb.campaign_version_js;

  ALTER TABLE reverb.campaign_version DROP COLUMN PUBLIC_SHARED_URL_EXPIRES_AT;

  ALTER TABLE reverb.campaign_version DROP COLUMN PRIVATE_SHARED_URL_EXPIRES_AT;

  select reverb.create_view_table_js('reverb.campaign_version');
`;

  return knex.schema.raw(query);

};
