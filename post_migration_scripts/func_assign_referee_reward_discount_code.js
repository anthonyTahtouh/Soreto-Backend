exports.seed = function(knex) {
  return knex.raw(`
CREATE OR REPLACE FUNCTION reverb.func_assign_referee_reward_discount_code(
    p_campaign_version_id text,
    p_reward_type text,
    p_user_id text,
    p_shared_url_accessed_id text,
    p_redeemed_user_id text
    )
      RETURNS json
      LANGUAGE 'plpgsql'
      COST 100
      VOLATILE 
  AS $BODY$
  
          DECLARE
              discount_code_rec RECORD;
              
          BEGIN
          
          select
              cv._id as campaign_version_id,
              cv.campaign_id as campaign_id,
              rp._id as reward_pool_id,
              rdc._id as reward_discount_code_id,
              rdc.code as code,
              rdc.active_from as active_from,
              rdc.active_to as active_to,
              rdc.value_amount as "valueAmount"
          INTO discount_code_rec
          FROM
              reverb.campaign_version cv
              join reverb.reward_pool rp
                  on cv.reward_pool_id = rp._id
              join reverb.reward_discount_code rdc
                  on rp.referee_reward_id = rdc.reward_id
          WHERE 
              cv._id = p_campaign_version_id
              and rdc.active = 'true'
              and rdc.active_from <= current_date
              and (rdc.active_to is null OR rdc.active_to >= current_date)
              and rdc.attributed_user_id is null	
          LIMIT 1;
  
          IF (FOUND) THEN	
              UPDATE reverb.reward_discount_code 
              SET 
                attributed_user_id = p_user_id, 
                shared_url_access_id = p_shared_url_accessed_id, 
                updated_at = current_date,
                redeemed_user_id = p_redeemed_user_id
              WHERE reward_discount_code._id = discount_code_rec.reward_discount_code_id;
          
              return row_to_json(discount_code_rec);
          END IF;
          
  
          IF (NOT FOUND) THEN
              return null;
          END IF;
          RETURN 0;
          END;
      
  $BODY$;`); };