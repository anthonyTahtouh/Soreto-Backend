export function up(knex) {
  var query = `
      ALTER TABLE reverb.external_order
      ADD COLUMN transaction_completed boolean NOT NULL DEFAULT false;
    
      SELECT reverb.create_view_table_js('reverb.external_order');
      `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}