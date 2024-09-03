export function up(knex) {
  var query = `
          ALTER TABLE reverb.process_post_conversion_reward
          ADD COLUMN external_order_id text COLLATE pg_catalog."default",
          ADD COLUMN shared_url_id text COLLATE pg_catalog."default",
          ADD CONSTRAINT external_order_id_fkey FOREIGN KEY (external_order_id)
            REFERENCES reverb."external_order" (_id) MATCH SIMPLE
            ON UPDATE NO ACTION
            ON DELETE NO ACTION,
          ADD CONSTRAINT shared_url_id_fkey FOREIGN KEY (shared_url_id)
            REFERENCES reverb.shared_url (_id) MATCH SIMPLE
            ON UPDATE NO ACTION
            ON DELETE NO ACTION;
          SELECT reverb.create_view_table_js('reverb.process_post_conversion_reward');
          `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}