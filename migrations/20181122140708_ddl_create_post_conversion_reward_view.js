export function up(knex) {
  var query = `
  select reverb.create_view_table_js('reverb.process_post_conversion_reward');
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}