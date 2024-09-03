
export function up(knex) {
  var query = `
    CREATE OR REPLACE VIEW reverb.agg_user_management_js AS 
      
      SELECT 
        u._id,
        u.created_at AS "createdAt",
        u.updated_at AS "updatedAt",
        u.first_name as "firstName",
        u.last_name as "lastName",
        u.password,
        r.name as "roleName",
        r._id as "roleId",
        u.email,
        client.name as "clientName",
        client._id as "clientId"
      FROM
        reverb.role r
        JOIN reverb.user u ON r._id = u.roles->>0
        LEFT JOIN reverb.client client ON client._id = u.client_id
    `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
      DROP VIEW reverb.reverb.agg_user_management_js;
    `;
  return knex.schema.raw(query);
}
