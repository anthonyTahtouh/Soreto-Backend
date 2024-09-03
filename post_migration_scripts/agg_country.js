
exports.seed = function(knex) {
  return knex.raw(`
      
      DROP VIEW IF EXISTS reverb.agg_country_js;
    
      CREATE OR REPLACE VIEW reverb.agg_country_js AS
      SELECT
        *,
        (select code from reverb.country_code where country_id = c._id order by _id limit 1) as "code"
      FROM 
        reverb.country c
      `);
};