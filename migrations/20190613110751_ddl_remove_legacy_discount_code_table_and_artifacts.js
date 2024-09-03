export function up(knex) {
  var query = `

  DROP FUNCTION IF EXISTS reverb.assign_discount_code(text, text);

  DROP VIEW IF EXISTS reverb.user_discount_code_js;
  DROP TABLE IF EXISTS reverb.user_discount_code;

  DROP VIEW IF EXISTS reverb.discount_code_js;
  DROP TABLE IF EXISTS reverb.discount_code;

  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}