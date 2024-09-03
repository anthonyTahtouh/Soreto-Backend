export function up(knex) {
  var query = `
  ALTER TABLE reverb.code_block
  ADD COLUMN scss text;

  DROP VIEW IF EXISTS reverb.code_block_js;
  SELECT reverb.create_view_table_js('reverb.code_block');
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}