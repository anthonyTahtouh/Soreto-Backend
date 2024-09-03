export function up(knex) {
  var query = `

    INSERT INTO reverb.country("name", "code", "currency", "currency_sign") VALUES ('France', 'FR', 'Euro', '€');
    INSERT INTO reverb.country("name", "code", "currency", "currency_sign") VALUES ('Great Britain', 'GB', 'Pound', '£');
    INSERT INTO reverb.country("name", "code", "currency", "currency_sign") VALUES ('Germany', 'DE', 'Euro', '£');

    `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}