
exports.up = function(knex) {

  var query = `
    CREATE INDEX idx_reward_discount_code ON reverb.reward_discount_code(reward_id);
`;
  return knex.schema.raw(query);
};

exports.down = function(knex) {

  var query = `
    DROP INDEX IF exists reverb.idx_reward_discount_code
`;
  return knex.schema.raw(query);
};
