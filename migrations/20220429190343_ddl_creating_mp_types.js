
exports.up = function (knex) {
  let query = `
  
      CREATE TYPE reverb.mp_offer_type AS ENUM ('SIMPLE', 'SHARING');

    `;
  return knex.schema.raw(query);
};

exports.down = function (knex) {
  let query = `
      
      DROP TYPE IF EXISTS reverb.mp_offer_type;
      
    `;
  return knex.schema.raw(query);
};
