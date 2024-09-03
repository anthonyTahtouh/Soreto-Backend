export function up(knex) {
  var query = `
    insert
    into reverb.country
        (name, code, currency, currency_sign)
    values
        ('United States', 'US', 'Dollar', '$');
    
    insert
      into reverb.country
          (name, code, currency, currency_sign)
      values
            ('Global', 'GLOBAL', 'Dollar', '$');
    `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
    delete from reverb.country
        where code IN ('US', 'GLOBAL');
    `;
  return knex.schema.raw(query);
}