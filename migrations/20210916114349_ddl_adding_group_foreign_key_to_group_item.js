export function up(knex) {

  var query = `
          
      ALTER TABLE reverb.reward_group_item ADD CONSTRAINT reward_group_item_group_fk FOREIGN KEY ("group_id") REFERENCES reverb.reward_group("_id");

     `;

  return knex.schema.raw(query);
}

export function down(knex) {

  var query = `
  
      ALTER TABLE reverb.reward_group_item DROP CONSTRAINT reward_group_item_group_fk;

      `;

  return knex.schema.raw(query);
}