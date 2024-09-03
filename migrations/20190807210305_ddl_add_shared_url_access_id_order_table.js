export function up(knex) {
  var query = `

    ALTER TABLE reverb.order
    ADD COLUMN shared_url_access_id text,
    ADD CONSTRAINT order_shared_url_access_id_fkey FOREIGN KEY (shared_url_access_id)
              REFERENCES reverb.shared_url_access (_id) MATCH SIMPLE
              ON UPDATE NO ACTION
              ON DELETE NO ACTION
    ;
    
    SELECT reverb.create_view_table_js('reverb.order');
    `;
  return knex.schema.raw(query);
}

// Rollback statement was not possible because, order_js is a dependency of other view. This will be reviewed in the future.
export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}