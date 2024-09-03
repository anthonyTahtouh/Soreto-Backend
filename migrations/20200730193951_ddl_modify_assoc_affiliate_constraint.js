
exports.up = function(knex) {

  let query = `
        ALTER TABLE ONLY reverb.assoc_affiliate_merchant_client
        DROP CONSTRAINT assoc_affiliate_merchant_client_affiliate_id_merchant_id_unique;

        ALTER TABLE ONLY reverb.assoc_affiliate_merchant_client
        ADD CONSTRAINT assoc_affiliate_merchant_client_affiliate_id_merchant_id_unique UNIQUE (client_id, affiliate_id, merchant_id);
    `;

  return knex.schema.raw(query);
};

exports.down = function(knex) {

  let query = `
        ALTER TABLE ONLY reverb.assoc_affiliate_merchant_client
        DROP CONSTRAINT assoc_affiliate_merchant_client_affiliate_id_merchant_id_unique;

        ALTER TABLE ONLY reverb.assoc_affiliate_merchant_client
        ADD CONSTRAINT assoc_affiliate_merchant_client_affiliate_id_merchant_id_unique UNIQUE (affiliate_id, merchant_id);
    `;
  return knex.schema.raw(query);
};
