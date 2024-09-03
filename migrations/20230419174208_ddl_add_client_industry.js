exports.up = function (knex) {
  var sql = `    
  
        ALTER
        TABLE
            reverb.client
        ADD
        COLUMN
            industry TEXT NOT NULL DEFAULT 'Other';
      
        SELECT reverb.create_view_table_js('reverb.client');
      `;

  return knex.schema.raw(sql);
};

exports.down = function (knex) {
  var sql = `    
  
        DROP VIEW IF EXISTS reverb.agg_campaign_version_configuration_js;
        DROP VIEW IF EXISTS reverb.client_js;

        ALTER
        TABLE
            reverb.client
        DROP
        COLUMN
            industry;

        SELECT reverb.create_view_table_js('reverb.client');
      `;

  return knex.schema.raw(sql);
};
