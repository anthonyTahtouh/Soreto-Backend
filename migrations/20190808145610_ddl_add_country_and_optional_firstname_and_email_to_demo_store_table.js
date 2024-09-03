export function up(knex) {
  var query = `
      ALTER TABLE reverb.demo_store
      ADD COLUMN country TEXT,
      ADD COLUMN first_name_available TEXT DEFAULT 'true' NOT NULL,
      ADD COLUMN email_available TEXT DEFAULT 'true' NOT NULL;

      SELECT reverb.create_view_table_js('reverb.demo_store');
      `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
      DROP VIEW reverb.demo_store_js;

      ALTER TABLE reverb.demo_store
          DROP COLUMN IF EXISTS country,
          DROP COLUMN IF EXISTS first_name_available,
          DROP COLUMN IF EXISTS email_available;

      SELECT reverb.create_view_table_js('reverb.demo_store');
  `;
  return knex.schema.raw(query);
}