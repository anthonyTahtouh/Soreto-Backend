export function up(knex) {

  var query = `
        ALTER TABLE reverb.user ADD COLUMN marketplace JSONB;

        DROP VIEW IF EXISTS reverb.agg_user_payment_request_js;
        DROP VIEW IF EXISTS reverb.agg_user_payment_request_bank_info_js;
        DROP VIEW reverb.user_js;  
        select reverb.create_view_table_js('reverb.user');
       `;
  return knex.schema.raw(query);
}

export function down(knex) {

  var query = `
        DROP VIEW reverb.user_js;
  
        ALTER TABLE reverb.user DROP COLUMN marketplace;
          
        select reverb.create_view_table_js('reverb.user');
    `;

  return knex.schema.raw(query);
}