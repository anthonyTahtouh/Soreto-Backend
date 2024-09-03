export function up(knex) {
  var query = `
      ALTER TABLE reverb.email_template
      ADD COLUMN client_id text;

      select reverb.create_view_table_js('reverb.email_template');`;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
      DROP VIEW reverb.email_template_js;

      ALTER TABLE reverb.email_template
      DROP COLUMN IF EXISTS client_id;

      select reverb.create_view_table_js('reverb.email_template');
    `;
  return knex.schema.raw(query);
}