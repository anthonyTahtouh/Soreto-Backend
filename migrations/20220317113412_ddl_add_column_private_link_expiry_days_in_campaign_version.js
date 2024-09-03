
exports.up = function (knex) {
  let query = `
                ALTER TABLE reverb.campaign_version ADD COLUMN private_link_expiry_days INT;

                UPDATE reverb.campaign_version
                    SET private_link_expiry_days = link_expiry_days; 

                DROP VIEW IF EXISTS reverb.campaign_version_js;
                
                select reverb.create_view_table_js('reverb.campaign_version');
               `;
  return knex.schema.raw(query);
};

exports.down = function (knex) {
  let query = `
                DROP VIEW IF EXISTS reverb.campaign_version_js;
                ALTER TABLE reverb.campaign_version drop column private_link_expiry_days;
                select reverb.create_view_table_js('reverb.campaign_version');
              `;
  return knex.schema.raw(query);
};
