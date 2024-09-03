export function up(knex) {
  var query = `
      ALTER TABLE reverb.assoc_affiliate_merchant_client
      ADD COLUMN country_id text;

      select reverb.create_view_table_js('reverb.assoc_affiliate_merchant_client');
    `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
      DROP VIEW reverb.assoc_affiliate_merchant_client_js;

      ALTER TABLE reverb.assoc_affiliate_merchant_client
      DROP COLUMN IF EXISTS country_id;

      select reverb.create_view_table_js('reverb.assoc_affiliate_merchant_client');
    `;
  return knex.schema.raw(query);
}