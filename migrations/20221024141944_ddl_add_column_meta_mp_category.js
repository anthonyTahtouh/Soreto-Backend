export function up(knex) {
  var query = `
    DROP VIEW IF EXISTS reverb.agg_mp_banner_js;
    DROP VIEW IF EXISTS reverb.mp_category_js;

    ALTER TABLE reverb.mp_category
      ADD COLUMN meta JSONB;

    SELECT reverb.create_view_table_js('reverb.mp_category');
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
    DROP VIEW IF EXISTS reverb.agg_mp_banner_js;
    DROP VIEW IF EXISTS reverb.mp_category_js;
    
    ALTER TABLE reverb.mp_category
      DROP COLUMN meta;

    SELECT reverb.create_view_table_js('reverb.mp_category');
  `;
  return knex.schema.raw(query);
}