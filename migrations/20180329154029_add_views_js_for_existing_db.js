exports.up = function(knex) {
  var query = `
   select reverb.create_view_table_js('reverb.tracking_event_history');
  `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
  `;
  return knex.schema.raw(query);
};