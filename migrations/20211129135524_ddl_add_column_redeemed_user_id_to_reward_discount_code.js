
exports.up = function(knex) {
  let query = `
    ALTER TABLE reverb.reward_discount_code ADD COLUMN redeemed_user_id TEXT REFERENCES reverb.user("_id");
    select reverb.create_view_table_js('reverb.reward_discount_code');
   `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  let query = `
    DROP VIEW reverb.reward_discount_code_js;
    ALTER TABLE reverb.reward_discount_code drop column redeemed_user_id;
    select reverb.create_view_table_js('reverb.reward_discount_code');
  `;
  return knex.schema.raw(query);
};
