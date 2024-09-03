exports.seed = function(knex) {
  return knex.raw(` 
CREATE OR REPLACE FUNCTION reverb.func_assign_reward_discount_code(
	p_reward_id text,
  p_user_id text,
  p_shared_url_accessed_id text)
    RETURNS json
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE 
AS $BODY$

  DECLARE
    discount_code_rec RECORD;
  BEGIN

  UPDATE 
    reverb.reward_discount_code 
  SET 
    attributed_user_id = p_user_id, 
    updated_at = current_date,
    shared_url_access_id = p_shared_url_accessed_id
  WHERE 
    reward_discount_code._id = (
      SELECT 
        rdc._id
      FROM
        reward_discount_code rdc
      WHERE
        rdc.reward_id = p_reward_id
        and 
        rdc.active = 'true'
        and 
        rdc.active_from <= current_date
        and 
        (rdc.active_to is null OR rdc.active_to >= current_date)
        and 
        rdc.attributed_user_id is null    
        LIMIT 1
        FOR UPDATE
    )

  RETURNING _id, code, value_amount, discount_type, valid_from, valid_to INTO discount_code_rec;
  
  return row_to_json(discount_code_rec);
      end    
$BODY$;`);
};