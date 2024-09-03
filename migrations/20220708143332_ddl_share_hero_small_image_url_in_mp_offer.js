export function up(knex) {
  var query = `
    DROP VIEW IF EXISTS reverb.agg_mp_banner_js; 
    DROP VIEW IF EXISTS reverb.agg_mp_blog_js;
    DROP VIEW IF EXISTS reverb.agg_mp_offer_js;
    DROP VIEW IF EXISTS reverb.mp_offer_js;
 
    ALTER TABLE reverb.mp_offer
      ADD COLUMN share_hero_small_image_url text;
  
    SELECT reverb.create_view_table_js('reverb.mp_offer');
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ` 
    DROP VIEW IF EXISTS reverb.agg_mp_banner_js;
    DROP VIEW IF EXISTS reverb.agg_mp_blog_js;
    DROP VIEW IF EXISTS reverb.agg_mp_offer_js;
    DROP VIEW IF EXISTS reverb.mp_offer_js;

    ALTER TABLE reverb.mp_offer
      DROP COLUMN share_hero_small_image_url;
  
    SELECT reverb.create_view_table_js('reverb.mp_offer');   
  `;
  return knex.schema.raw(query);
}