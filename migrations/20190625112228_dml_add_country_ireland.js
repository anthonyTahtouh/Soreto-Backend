export function up(knex) {
  var query = `
    insert
    into reverb.country
        (name, code, currency, currency_sign)
    values
        ('Ireland', 'IE', 'Euro', '€');
    `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
    delete from reverb.country
        where code = 'IE';
    `;
  return knex.schema.raw(query);
}