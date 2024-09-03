exports.up = function (knex) {
  const query = `INSERT INTO reverb.value_socialplatform(value) VALUES ('LINK') ON CONFLICT DO NOTHING`;
  return knex.schema.raw(query);
};

exports.down = function (knex) {
  const query = `delete from reverb.value_socialplatform where value = 'LINK'`;
  return knex.schema.raw(query);
};
