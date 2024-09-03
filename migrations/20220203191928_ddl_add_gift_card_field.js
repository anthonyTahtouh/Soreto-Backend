
exports.up = function(knex) {
  let query = `
      ALTER TABLE reverb.reward ADD COLUMN gift_card_reward BOOLEAN NOT NULL DEFAULT FALSE;
      select reverb.create_view_table_js('reverb.reward');
     `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  let query = `
      DROP VIEW reverb.reward_js;
      ALTER TABLE reverb.reward drop column gift_card_reward;
      select reverb.create_view_table_js('reverb.reward');
    `;
  return knex.schema.raw(query);
};
