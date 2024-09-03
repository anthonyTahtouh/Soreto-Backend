
exports.up = function(knex) {
  var query = `    
    DROP VIEW IF EXISTS reverb.agg_mp_banner_js;
    DROP VIEW reverb.mp_banner_js;
    ALTER TABLE reverb.mp_banner
        ADD COLUMN flash_campaign_ids JSONB;
            
    SELECT reverb.create_view_table_js('reverb.mp_banner');
    `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `    
    DROP VIEW IF EXISTS reverb.agg_mp_banner_js;
    DROP VIEW reverb.mp_banner_js;
    ALTER TABLE reverb.mp_banner
        DROP COLUMN flash_campaign_ids;
            
    SELECT reverb.create_view_table_js('reverb.mp_banner');
    `;
  return knex.schema.raw(query);
};
