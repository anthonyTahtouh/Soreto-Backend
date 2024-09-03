export function up(knex) {
  var query = `
      
        drop view if exists reverb.agg_mp_banner_js;
        drop view if exists reverb.agg_mp_offer_js;
        drop view if exists reverb.mp_offer_js;
        
        alter table reverb.mp_offer add column title text null;
        alter table reverb.mp_offer add column subtitle text null;
        alter table reverb.mp_offer add column "condition" text null;
        alter table reverb.mp_offer add column card_title text null;
        alter table reverb.mp_offer add column card_subtitle text null;
        
        update reverb.mp_offer set "condition" = offer_condition;
        update reverb.mp_offer set title = card_description;
        update reverb.mp_offer set card_title = card_description;
        
        alter table reverb.mp_offer drop column offer_condition;
  
        SELECT reverb.create_view_table_js('reverb.mp_offer');
      `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ` 
        
          drop view if exists reverb.agg_mp_banner_js;
          drop view if exists reverb.agg_mp_offer_js;
          drop view if exists reverb.mp_offer_js;
          
          alter table reverb.mp_offer add column offer_condition text null;
          update reverb.mp_offer set offer_condition = "condition";

          alter table reverb.mp_offer drop column title;
          alter table reverb.mp_offer drop column subtitle;
          alter table reverb.mp_offer drop column "condition";
          alter table reverb.mp_offer drop column card_title;
          alter table reverb.mp_offer drop column card_subtitle;
          
          SELECT reverb.create_view_table_js('reverb.mp_offer');
      `;
  return knex.schema.raw(query);
}