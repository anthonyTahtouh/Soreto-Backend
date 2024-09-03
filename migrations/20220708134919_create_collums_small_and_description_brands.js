exports.up = function (knex) {
  let query = `
    
        DROP VIEW IF EXISTS reverb.agg_mp_banner_js;
        
        DROP VIEW IF EXISTS reverb.agg_mp_blog_js;
        
        DROP VIEW IF EXISTS reverb.agg_mp_offer_js;
        
        DROP VIEW IF EXISTS reverb.mp_brand_js;

        ALTER TABLE reverb.mp_brand  ADD COLUMN brand_description_small text;
        
        ALTER TABLE reverb.mp_brand  ADD COLUMN brand_description_medium text;
    
        select reverb.create_view_table_js('reverb.mp_brand');
  
      `;
  return knex.schema.raw(query);
};

exports.down = function (knex) {
  let query = `

        DROP VIEW IF EXISTS reverb.agg_mp_banner_js;
        
        DROP VIEW IF EXISTS reverb.agg_mp_blog_js;
        
        DROP VIEW IF EXISTS reverb.agg_mp_offer_js;
        
        DROP VIEW IF EXISTS reverb.mp_brand_js;
        
        ALTER TABLE reverb.mp_brand  drop COLUMN brand_description_small;
        
        ALTER TABLE reverb.mp_brand  drop COLUMN brand_description_medium;
    
        select reverb.create_view_table_js('reverb.mp_brand');
   `;

  return knex.schema.raw(query);
};
