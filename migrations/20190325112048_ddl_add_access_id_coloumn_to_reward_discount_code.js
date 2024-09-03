export function up(knex) {
  var query = `
    ALTER TABLE reverb.reward_discount_code
    ADD COLUMN shared_url_access_id text;

    ALTER TABLE reverb.reward_discount_code
    ADD CONSTRAINT shared_url_access_id_fk FOREIGN KEY (shared_url_access_id) REFERENCES reverb.shared_url_access (_id);
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}