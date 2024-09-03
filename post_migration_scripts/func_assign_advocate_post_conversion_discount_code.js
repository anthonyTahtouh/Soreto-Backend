exports.seed = function(knex) {
  return knex.raw(` 
CREATE OR REPLACE FUNCTION reverb.func_assign_advocate_post_conversion_discount_code(
    p_campaign_version_id text,
    p_reward_type text,
    p_user_id text,
    p_shared_url_accessed_id text
    )
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
              set 
                attributed_user_id = p_user_id, 
                updated_at = current_date,
                shared_url_access_id = p_shared_url_accessed_id
              WHERE 
              reward_discount_code._id = (
                select rdc._id as reward_discount_code_id 
                from
                    reverb.campaign_version cv
                    join reverb.reward_pool rp
                        on cv.reward_pool_id = rp._id
                    join reverb.reward_discount_code rdc
                        on rp.advocate_post_conversion_reward_id = rdc.reward_id
                WHERE 
                    cv._id = p_campaign_version_id
                    and rdc.active = 'true'
                    and rdc.active_from <= current_date
                    and (rdc.active_to is null OR rdc.active_to >= current_date)
                    and rdc.attributed_user_id is null  
                LIMIT 1
            FOR UPDATE
                )
          RETURNING _id, code, value_amount, discount_type, valid_from, valid_to INTO discount_code_rec;
          
          return row_to_json(discount_code_rec);
    
              end
  $BODY$; `);

};