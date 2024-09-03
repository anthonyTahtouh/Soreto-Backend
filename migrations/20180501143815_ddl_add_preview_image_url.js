exports.up = function(knex) {
  var query = `
    DROP VIEW reverb.code_block_js;

    ALTER TABLE reverb.code_block
      ADD COLUMN preview_desktop_thumbnail_url text;

    select reverb.create_view_table_js('reverb.code_block');
    `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
    `;
  return knex.schema.raw(query);
};