exports.up = function(knex) {
  var query = `
  DROP VIEW reverb.code_block_js;

  ALTER TABLE reverb.code_block
    DROP COLUMN html;

  ALTER TABLE reverb.code_block
    ADD COLUMN css_external text;

  ALTER TABLE reverb.code_block
    ADD COLUMN javascript_external text;

  ALTER TABLE reverb.code_block
    ADD COLUMN css text;

  ALTER TABLE reverb.code_block
    ADD COLUMN javascript text;

  ALTER TABLE reverb.code_block
    ADD COLUMN html_body text;

  select reverb.create_view_table_js('reverb.code_block')
  `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
  `;
  return knex.schema.raw(query);
};