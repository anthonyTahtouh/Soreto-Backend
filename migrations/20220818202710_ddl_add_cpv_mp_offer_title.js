export function up(knex) {
  var query = `
    
        DROP VIEW IF EXISTS reverb.agg_mp_offer_js;
        DROP VIEW IF EXISTS reverb.campaign_version_js;
   
        ALTER TABLE reverb.campaign_version ADD COLUMN mp_offer_title TEXT;

        UPDATE reverb.campaign_version cv 
            SET mp_offer_title = (
                    select 
                        cli.name || ' offer' 
                    from 
                        reverb.campaign camp 
                        inner join 
                        reverb.client cli
                        on cli._id = camp.client_id
                    where
                        camp._id = cv.campaign_id
                    limit 1
                );
  
        SELECT reverb.create_view_table_js('reverb.campaign_version');
    `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
        DROP VIEW IF EXISTS reverb.agg_mp_offer_js;
        DROP VIEW IF EXISTS reverb.campaign_version_js;
        
        ALTER TABLE reverb.campaign_version DROP COLUMN mp_offer_title;

        SELECT reverb.create_view_table_js('reverb.campaign_version');
    `;
  return knex.schema.raw(query);
}