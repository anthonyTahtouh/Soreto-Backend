
exports.up = function(knex) {
  var query = `  
      DROP VIEW IF EXISTS reverb.agg_mp_offer_js;
      DROP VIEW IF EXISTS reverb.agg_mp_banner_js;
      DROP VIEW IF EXISTS reverb.mp_offer_js;
  
      
      ALTER TABLE reverb.mp_offer
      ADD COLUMN start_date_temp timestamp with time zone null;
      
      ALTER TABLE reverb.mp_offer
      ADD COLUMN end_date_temp timestamp with time zone null;
      
      UPDATE reverb.mp_offer set start_date_temp = start_date;
      UPDATE reverb.mp_offer set end_date_temp = end_date;
      
      ALTER TABLE reverb.mp_offer
      DROP COLUMN start_date;
      
      ALTER TABLE reverb.mp_offer
      DROP COLUMN end_date;
      
      ALTER TABLE reverb.mp_offer
      ADD COLUMN start_date timestamp with time zone null;
      
      ALTER TABLE reverb.mp_offer
      ADD COLUMN end_date timestamp with time zone null;
      
      UPDATE reverb.mp_offer set start_date = start_date_temp ;
      UPDATE reverb.mp_offer set end_date = end_date_temp;
  
      ALTER TABLE reverb.mp_offer
      DROP COLUMN start_date_temp;
      
      ALTER TABLE reverb.mp_offer
      DROP COLUMN end_date_temp;
  
      select reverb.create_view_table_js('reverb.mp_offer');
    `;

  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = ``;
  return knex.schema.raw(query);
};
