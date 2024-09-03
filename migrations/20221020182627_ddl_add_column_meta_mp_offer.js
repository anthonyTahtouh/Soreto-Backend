export function up(knex) {
  var query = `
    DROP VIEW IF EXISTS reverb.agg_mp_offer_js;
    DROP VIEW IF EXISTS reverb.agg_mp_banner_js;
    DROP VIEW IF EXISTS reverb.mp_offer_js;

    ALTER TABLE reverb.mp_offer
      ADD COLUMN meta JSONB;

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
      DROP COLUMN meta;

    SELECT reverb.create_view_table_js('reverb.mp_offer');
  `;
  return knex.schema.raw(query);
}