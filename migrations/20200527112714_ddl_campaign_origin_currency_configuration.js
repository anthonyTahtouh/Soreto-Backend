
exports.up = function(knex) {

  let query = `
      
        DROP VIEW IF EXISTS reverb.campaign_js;

        ALTER TABLE reverb.campaign
        ADD COLUMN order_origin_currency TEXT REFERENCES reverb.currency("_id"),
        ADD COLUMN external_order_origin_currency TEXT REFERENCES reverb.currency("_id");

        select reverb.create_view_table_js('reverb.campaign');
      `;


  return knex.schema.raw(query);
};

exports.down = function(knex) {

  let query = `
  
        DROP VIEW IF EXISTS reverb.campaign_js;

        ALTER TABLE reverb.campaign
        DROP COLUMN order_origin_currency,
        DROP COLUMN external_order_origin_currency;

        select reverb.create_view_table_js('reverb.campaign');
      `;

  return knex.schema.raw(query);

};
