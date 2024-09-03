
exports.up = function(knex) {

  let sqlScript = `
    ALTER TABLE reverb.external_order_untracked
    ADD COLUMN unresolved BOOLEAN DEFAULT FALSE;

    SELECT reverb.create_view_table_js('reverb.external_order_untracked');
  `;

  return knex.schema.raw(sqlScript);
};

exports.down = function(knex) {

  let sqlScript = `
    ALTER TABLE reverb.external_order_untracked
    DROP COLUMN unresolved;
  `;

  return knex.schema.raw(sqlScript);
};
