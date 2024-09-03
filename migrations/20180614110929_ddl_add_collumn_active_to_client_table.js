export function up(knex) {
  var query = `
    --Drop deprecated views
    DROP VIEW IF EXISTS reverb.rep_client_activity;
    DROP VIEW IF EXISTS reverb.rep_user_signup_activity;

    DROP VIEW reverb.client_js;

    ALTER TABLE reverb.client ADD COLUMN active BOOLEAN;

    UPDATE reverb.client SET active = false;

    select reverb.create_view_table_js('reverb.client');
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
    DROP VIEW reverb.client_js;

    ALTER TABLE reverb.client DROP COLUMN active;

    select reverb.create_view_table_js('reverb.client');
  `;
  return knex.schema.raw(query);
}