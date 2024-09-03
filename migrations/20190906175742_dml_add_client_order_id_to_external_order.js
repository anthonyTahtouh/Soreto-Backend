export function up(knex) {
  var query = `ALTER TABLE reverb.external_order
                 ADD COLUMN client_order_id TEXT;
                 SELECT reverb.create_view_table_js('reverb.external_order');
                    `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ` DROP VIEW IF EXISTS reverb.external_order_js;
                  ALTER TABLE reverb.external_order
                  DROP COLUMN IF EXISTS client_order_id;
      
                  SELECT reverb.create_view_table_js('reverb.external_order');`;
  return knex.schema.raw(query);
}


