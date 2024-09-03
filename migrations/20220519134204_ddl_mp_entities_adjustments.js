
exports.up = function (knex) {
  let query = `
    
        UPDATE reverb.mp_offer SET active = false;
        ALTER TABLE reverb.mp_offer ALTER COLUMN active SET NOT NULL;
  
      `;
  return knex.schema.raw(query);
};

exports.down = function (knex) {
  let query = `
        
        ALTER TABLE reverb.mp_offer ALTER COLUMN active SET NULL;
        
   `;

  return knex.schema.raw(query);
};
