export function up(knex) {
  var query = `
  DROP VIEW if exists reverb.affilinet_order_js;
  DROP TABLE if exists reverb.affilinet_order;
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}