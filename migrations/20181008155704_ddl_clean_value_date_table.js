export function up(knex) {
  var query = `
    delete from reverb.value_date where date < '2016-01-01';
    delete from reverb.value_date where date >= '2020-01-01';
          `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
        `;
  return knex.schema.raw(query);
}