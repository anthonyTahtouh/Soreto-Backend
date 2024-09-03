export function up(knex) {
  var query = `
  ALTER TABLE reverb.shared_url
  ADD COLUMN expiry text;

  select reverb.create_view_table_js('reverb.shared_url');
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}