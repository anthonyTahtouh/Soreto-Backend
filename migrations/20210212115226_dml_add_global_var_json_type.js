exports.up = function (knex) {
  let query = `
      
          ALTER TYPE reverb.FIELD_TYPE ADD VALUE 'JSON';
      
      `;

  return knex.schema.raw(query);
};

exports.down = function (knex) {
  let query = `
  
      DELETE FROM pg_enum WHERE enumlabel = 'JSON' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'field_type');
    `;

  return knex.schema.raw(query);
};

exports.config = { transaction: false };