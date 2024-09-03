exports.up = function(knex) {
  var query = `
  INSERT INTO reverb.value_socialplatform(value)
  VALUES ('WHATSAPP');

  INSERT INTO reverb.value_socialplatform(value)
  VALUES ('MESSENGER');
  `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
  `;
  return knex.schema.raw(query);
};