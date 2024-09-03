exports.up = function (knex) {
  let query = `
      
        UPDATE 
            reverb."user" 
        SET 
            verified_email = true
        WHERE 
            "_id"  IN (
                SELECT _id FROM reverb."user" 
                CROSS JOIN jsonb_array_elements(roles)
                WHERE value::text IN (SELECT concat('"',_id, '"' ) FROM reverb."role" WHERE name in ('admin', 'clientUser', 'system', 'sales', 'tech'))
            )
      `;

  return knex.schema.raw(query);
};

exports.down = function (knex) {
  let query = `
  
    UPDATE 
    reverb."user"
    SET 
        verified_email = false
    WHERE 
        "_id"  IN (
            SELECT _id FROM reverb."user" 
            CROSS JOIN jsonb_array_elements(roles)
            WHERE value::text IN (SELECT concat('"',_id, '"' ) FROM reverb."role" WHERE name in ('admin', 'clientUser', 'system', 'sales', 'tech'))
        )
    `;

  return knex.schema.raw(query);
};