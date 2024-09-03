export function up(knex) {
  var query = `
  ALTER TABLE reverb.shared_url
  ADD COLUMN posted_confirmation boolean;

  select reverb.create_view_table_js('reverb.shared_url');
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
      DROP VIEW reverb.shared_url_js;

      ALTER TABLE reverb.shared_url
      DROP COLUMN IF EXISTS posted_confirmation;
      
      select reverb.create_view_table_js('reverb.shared_url');
  `;
  return knex.schema.raw(query);
}