exports.up = function (knex) {
  var query = `
    DROP VIEW IF EXISTS reverb.campaign_version_js;
  
    ALTER TABLE reverb.campaign_version DROP COLUMN public_shared_url_expires_at;
    ALTER TABLE reverb.campaign_version DROP COLUMN private_shared_url_expires_at;
    
    ALTER TABLE reverb.campaign_version ADD COLUMN public_shared_url_expires_at timestamp WITH time ZONE;
    ALTER TABLE reverb.campaign_version ADD COLUMN private_shared_url_expires_at timestamp WITH time ZONE;

    select reverb.create_view_table_js('reverb.campaign_version');
      `;
  return knex.schema.raw(query);
};

exports.down = function (knex) {
  var query = `
    DROP VIEW IF EXISTS reverb.campaign_version_js;

    ALTER TABLE reverb.campaign_version DROP COLUMN public_shared_url_expires_at;
    ALTER TABLE reverb.campaign_version DROP COLUMN private_shared_url_expires_at;

    ALTER TABLE reverb.campaign_version ADD COLUMN public_shared_url_expires_at timestamp;
    ALTER TABLE reverb.campaign_version ADD COLUMN private_shared_url_expires_at timestamp;

    select reverb.create_view_table_js('reverb.campaign_version');
  `;

  return knex.schema.raw(query);
};
