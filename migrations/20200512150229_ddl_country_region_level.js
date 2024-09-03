export function up(knex) {
  var query = `
        ALTER TABLE reverb.country
        ADD COLUMN region_level_1 text,
        ADD COLUMN region_level_2 text;
        
        select reverb.create_view_table_js('reverb.country');
            
        -- update regions
        update reverb.country set region_level_1 = 'Europe', region_level_2 = 'Western Europe' where "name" = 'France';
        update reverb.country set region_level_1 = 'Europe', region_level_2 = 'Western Europe' where "name" = 'Great Britain';
        update reverb.country set region_level_1 = 'Europe', region_level_2 = 'Central Europe' where "name" = 'Germany';
        update reverb.country set region_level_1 = 'Europe', region_level_2 = 'Western Europe' where "name" = 'Ireland';
        update reverb.country set region_level_1 = 'America', region_level_2 = 'North America' where "name" = 'United States';
        update reverb.country set region_level_1 = 'Global', region_level_2 = '' where "name" = 'Global';
        update reverb.country set region_level_1 = 'Oceania', region_level_2 = '' where "name" = 'Australia';
        update reverb.country set region_level_1 = 'Europe', region_level_2 = '' where "name" = 'Other Europe';
      
      `;

  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
  
      DROP VIEW IF EXISTS reverb.country_js;
        
      ALTER TABLE reverb.country
      DROP COLUMN region_level_1,
      DROP COLUMN region_level_2;
  
      select reverb.create_view_table_js('reverb.country');`;

  return knex.schema.raw(query);
}