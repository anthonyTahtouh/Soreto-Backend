
exports.up = function(knex) {
  var query = `
    ALTER TABLE reverb.reward_discount_code
    ALTER COLUMN active_to DROP NOT NULL,
    ALTER COLUMN valid_to  DROP NOT NULL
    ;

    SELECT reverb.create_view_table_js('reverb.reward_discount_code');
    `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
    ALTER TABLE reverb.reward_discount_code
    ALTER COLUMN active_to SET NOT NULL,
    ALTER COLUMN valid_to  SET NOT NULL
    ;

    SELECT reverb.create_view_table_js('reverb.reward_discount_code');
    `;
  return knex.schema.raw(query);
};
