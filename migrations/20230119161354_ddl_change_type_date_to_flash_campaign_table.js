
exports.up = function(knex) {
  var query = `   
        DROP VIEW IF EXISTS reverb.mp_flash_campaign_js;
        
        ALTER TABLE reverb.mp_flash_campaign
        ADD COLUMN start_date_temp timestamp with time zone null;
        
        ALTER TABLE reverb.mp_flash_campaign
        ADD COLUMN end_date_temp timestamp with time zone null;
        
        UPDATE reverb.mp_flash_campaign set start_date_temp = start_date;
        UPDATE reverb.mp_flash_campaign set end_date_temp = end_date;
        
        ALTER TABLE reverb.mp_flash_campaign
        DROP COLUMN start_date;
        
        ALTER TABLE reverb.mp_flash_campaign
        DROP COLUMN end_date;
        
        ALTER TABLE reverb.mp_flash_campaign
        ADD COLUMN start_date timestamp with time zone null;
        
        ALTER TABLE reverb.mp_flash_campaign
        ADD COLUMN end_date timestamp with time zone null;
        
        UPDATE reverb.mp_flash_campaign set start_date = start_date_temp ;
        UPDATE reverb.mp_flash_campaign set end_date = end_date_temp;
    
        ALTER TABLE reverb.mp_flash_campaign
        DROP COLUMN start_date_temp;
        
        ALTER TABLE reverb.mp_flash_campaign
        DROP COLUMN end_date_temp;
    
        select reverb.create_view_table_js('reverb.mp_flash_campaign');
      `;

  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = ``;
  return knex.schema.raw(query);
};