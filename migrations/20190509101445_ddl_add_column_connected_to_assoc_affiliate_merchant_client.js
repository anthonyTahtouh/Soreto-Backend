export function up(knex) {
  var query = `
        ALTER TABLE reverb.assoc_affiliate_merchant_client
        ADD COLUMN connected_at DATE NOT NULL DEFAULT '2019-03-20';
    
        ALTER TABLE reverb.assoc_affiliate_merchant_client
        ADD COLUMN disconnected_at DATE;

        select reverb.create_view_table_js('reverb.assoc_affiliate_merchant_client');
      `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}