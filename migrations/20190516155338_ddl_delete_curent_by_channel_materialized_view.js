
exports.up = function(knex) {

  let script = `
        
    DROP MATERIALIZED VIEW IF EXISTS reverb.agg_client_by_channel_stats_js;
  
    `;

  return knex.schema.raw(script);
};

exports.down = function(knex) {

  let script = ``;
  return knex.schema.raw(script);
};