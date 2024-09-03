exports.up = function(knex) {

  let scriptSql = `

        CREATE TYPE reverb.client_report_field_data_source AS ENUM ('SORETO', 'EXTERNAL-AFFILIATE', 'JOINED');
        
        ALTER TABLE reverb.assoc_affiliate_merchant_client
        ADD COLUMN report_order_source reverb.client_report_field_data_source DEFAULT 'JOINED' NOT NULL,
        ADD COLUMN report_click_source reverb.client_report_field_data_source DEFAULT 'JOINED' NOT NULL;

        SELECT reverb.create_view_table_js('reverb.assoc_affiliate_merchant_client');
    `;

  return knex.schema.raw(scriptSql);
};

exports.down = function(knex) {

  let scriptSql = `

        DROP VIEW IF EXISTS reverb.assoc_affiliate_merchant_client_js;

        ALTER TABLE reverb.assoc_affiliate_merchant_client
        DROP COLUMN report_order_source,
        DROP COLUMN report_click_source;

        DROP TYPE IF EXISTS reverb.client_report_field_data_source;

        SELECT reverb.create_view_table_js('reverb.assoc_affiliate_merchant_client');
    `;

  return knex.schema.raw(scriptSql);
};
