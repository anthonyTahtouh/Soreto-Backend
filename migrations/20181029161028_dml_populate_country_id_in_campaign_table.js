export function up(knex) {
  var query = `

    UPDATE reverb.campaign 
    SET "country_id" = country._id
    FROM (SELECT _id, code
          FROM reverb.country) AS country
    WHERE country.code = 'GB'; 
 
    `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}