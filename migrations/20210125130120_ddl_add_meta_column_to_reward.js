export function up(knex) {
  var query = `
    ALTER TABLE reverb.reward ADD COLUMN meta jsonb;
    
    select reverb.create_view_table_js('reverb.reward');
    `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
  DROP VIEW reverb.reward_js;

  ALTER TABLE reverb.reward DROP COLUMN meta;

  select reverb.create_view_table_js('reverb.reward');
  `;
  return knex.schema.raw(query);
}