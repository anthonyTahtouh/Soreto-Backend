exports.up = function(knex) {

  let script = `
          
      DROP MATERIALIZED VIEW IF EXISTS reverb.agg_campaign_version_stats_daily_js;
    
      `;

  return knex.schema.raw(script);
};

exports.down = function(knex) {

  let script = ``;
  return knex.schema.raw(script);
};