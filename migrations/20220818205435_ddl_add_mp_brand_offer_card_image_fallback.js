export function up(knex) {
  var query = `
      
        DROP VIEW IF EXISTS reverb.agg_mp_banner_js;
        DROP VIEW IF EXISTS reverb.agg_mp_blog_js;
        DROP VIEW IF EXISTS reverb.agg_mp_offer_js;
        DROP VIEW IF EXISTS reverb.mp_brand_js;
    
        ALTER TABLE reverb.mp_brand ADD COLUMN offer_card_fallback_image TEXT;
    
        SELECT reverb.create_view_table_js('reverb.mp_brand');
      `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `

        DROP VIEW IF EXISTS reverb.agg_mp_banner_js;
        DROP VIEW IF EXISTS reverb.agg_mp_blog_js;
        DROP VIEW IF EXISTS reverb.agg_mp_offer_js;
        DROP VIEW IF EXISTS reverb.mp_brand_js;
            
        ALTER TABLE reverb.mp_brand DROP COLUMN offer_card_fallback_image;

        SELECT reverb.create_view_table_js('reverb.mp_brand');
      `;
  return knex.schema.raw(query);
}