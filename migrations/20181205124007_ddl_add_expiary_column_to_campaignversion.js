export function up(knex) {
  var query = `
  ALTER TABLE reverb.campaign_version
  ADD COLUMN link_expiry_days int;
  
  select reverb.create_view_table_js('reverb.campaign_version');
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}
