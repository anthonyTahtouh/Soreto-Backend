export function up(knex) {
  var query = `
  ALTER TABLE reverb.display_block
  ADD COLUMN universal_fallback boolean;

  select reverb.create_view_table_js('reverb.display_block');
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
      DROP VIEW reverb.display_block_js;

      ALTER TABLE reverb.display_block
      DROP COLUMN IF EXISTS universal_fallback;
      
      select reverb.create_view_table_js('reverb.display_block');
  `;
  return knex.schema.raw(query);
}