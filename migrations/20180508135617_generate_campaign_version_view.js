exports.up = function(knex) {
  var query = `
        select reverb.create_view_table_js('reverb.campaign_version');
    `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
    `;
  return knex.schema.raw(query);
};