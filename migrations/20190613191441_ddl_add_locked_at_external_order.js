exports.up = function(knex) {

  let scriptSql = `
  
        ALTER TABLE reverb.external_order
          ADD COLUMN locked_at timestamp with time zone NULL,
          ADD COLUMN match_rule text,
          ADD COLUMN completion_rule text;

        SELECT reverb.create_view_table_js('reverb.external_order');
      `;

  return knex.schema.raw(scriptSql);
};

exports.down = function(knex) {

  let scriptSql = `
  
        DROP VIEW IF EXISTS reverb.external_order_js;
        
        ALTER TABLE reverb.external_order DROP COLUMN locked_at;
        ALTER TABLE reverb.external_order DROP COLUMN match_rule;
        ALTER TABLE reverb.external_order DROP COLUMN completion_rule;

        SELECT reverb.create_view_table_js('reverb.external_order');
      `;

  return knex.schema.raw(scriptSql);
};
