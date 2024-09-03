export function up(knex) {

  var query = `
	ALTER TABLE reverb.client ADD COLUMN launched_at timestamp;
  select reverb.create_view_table_js('reverb.client');
  UPDATE reverb.client
  SET launched_at =subquery.launch_at
  FROM (       SELECT  c."_id", c.name, su.launch_at 
	  FROM reverb.client c
	  LEFT JOIN 
	  (
	  SELECT  client_id, MIN(created_at) as launch_at
	  FROM    reverb.shared_url su 
	  WHERE su.test_mode = false
	  GROUP   BY client_id
	  ) su ON c._id = su.client_id) AS subquery
  WHERE reverb.client."_id" = subquery._id;
   `;
  return knex.schema.raw(query);
}

export function down(knex) {

  var query = `
	  DROP VIEW reverb.client_js;

	  ALTER TABLE reverb.client DROP COLUMN launched_at;
 
	  select reverb.create_view_table_js('reverb.client');
	  `;

  return knex.schema.raw(query);
}