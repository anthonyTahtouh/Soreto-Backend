exports.up = function (knex) {
  var sql = `    

    -- create column
    ALTER TABLE reverb.assoc_affiliate_merchant_client
        ADD COLUMN auto_untracked_order_inquiry boolean DEFAULT false;

    -- update awin connection to true
    UPDATE 
        reverb.assoc_affiliate_merchant_client 
    SET 
        auto_untracked_order_inquiry = true 
    WHERE
        affiliate_id in (
            SELECT
                _id
            FROM
                reverb.affiliate aff
            WHERE
                aff.name = 'awin'

        );

    select reverb.create_view_table_js('reverb.assoc_affiliate_merchant_client');
    `;

  return knex.schema.raw(sql);
};

exports.down = function (knex) {
  var sql = `    

    DROP VIEW reverb.assoc_affiliate_merchant_client_js;
    
    -- create column
    ALTER TABLE reverb.assoc_affiliate_merchant_client
        DROP COLUMN auto_untracked_order_inquiry;

    select reverb.create_view_table_js('reverb.assoc_affiliate_merchant_client');
    `;

  return knex.schema.raw(sql);
};
