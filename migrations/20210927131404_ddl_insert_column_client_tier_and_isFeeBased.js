export function up(knex) {

  var query = `
	  ALTER TABLE reverb.client ADD COLUMN tier INT DEFAULT 3 NOT NULL;
	  ALTER TABLE reverb.client ADD COLUMN fee_based BOOLEAN DEFAULT FALSE NOT NULL;

	  select reverb.create_view_table_js('reverb.client');
	 `;
  return knex.schema.raw(query);
}

export function down(knex) {

  var query = `
	  DROP VIEW reverb.client_js;

	  ALTER TABLE reverb.client DROP COLUMN tier;

	  ALTER TABLE reverb.client DROP COLUMN fee_based;
      
	  select reverb.create_view_table_js('reverb.client');
	  `;

  return knex.schema.raw(query);
}