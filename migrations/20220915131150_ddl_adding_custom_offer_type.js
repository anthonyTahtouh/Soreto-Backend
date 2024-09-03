
exports.up = function(knex) {
  let query = `
    
        ALTER TYPE reverb.mp_offer_type ADD VALUE 'CUSTOM';   
    `;

  return knex.schema.raw(query);
};

exports.down = function(knex) {
  let query = `

  DELETE FROM pg_enum WHERE enumlabel = 'CUSTOM' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'mp_offer_type' limit  1);
  `;

  return knex.schema.raw(query);
};

exports.config = { transaction: false };