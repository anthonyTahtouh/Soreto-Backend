
exports.up = function(knex) {

  let query = `
        ALTER TABLE reverb.campaign_version ADD COLUMN "alias" TEXT;
        UPDATE reverb.campaign_version set "alias" = "name";
        ALTER TABLE reverb.campaign_version ALTER COLUMN "alias" SET NOT NULL;
        SELECT reverb.create_view_table_js('reverb.campaign_version');
    `;

  return knex.schema.raw(query);
};

exports.down = function(knex) {

  let query = `
        DROP VIEW reverb.campaign_version_js;
        ALTER TABLE reverb.campaign_version DROP COLUMN "alias";
        SELECT reverb.create_view_table_js('reverb.campaign_version');
    `;

  return knex.schema.raw(query);
};
