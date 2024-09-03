export function up(knex) {
  var query = `   
        DROP VIEW IF EXISTS reverb.agg_mp_offer_js;
        DROP VIEW IF EXISTS reverb.agg_mp_banner_js;
        DROP VIEW IF EXISTS reverb.mp_offer_js; 
    
        ALTER TABLE reverb.mp_offer
            ADD COLUMN flash_campaign_ids JSONB;
    
        SELECT reverb.create_view_table_js('reverb.mp_offer');
        `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `    
      DROP view if exists reverb.agg_campaign_js;
      DROP view if exists reverb.agg_mp_banner_js;
      DROP view if exists reverb.agg_mp_offer_js;
      DROP view if exists reverb.mp_offer_js;
    
      ALTER TABLE reverb.mp_offer
          DROP COLUMN flash_campaign_ids;
          
      SELECT reverb.create_view_table_js('reverb.mp_offer');
      `;
  return knex.schema.raw(query);
}