exports.up = function (knex) {
  let query = `
DO $$ 

    DECLARE
        declare _var_definition_id varchar;
        declare _var_id varchar;
        declare _client_id varchar;
        declare _value text[];
    
        declare _campaign_version_id varchar;
    BEGIN 
        
    select _id from reverb.var_definition where setting_key = 'POST_REWARD_VERSION' into _var_definition_id;

    IF (FOUND) THEN
        raise notice 'Definition = %', _var_definition_id;
    ELSE
        RAISE EXCEPTION 'Error no definition found';
    END IF;
    
    FOR _var_id, _client_id, _value IN
    SELECT _id, object_id, value FROM reverb.global_vars 
    WHERE var_definition_id = _var_definition_id
        and value = '{2}'
    
    LOOP 
    
        RAISE NOTICE '-- Processing global vars _id = % client_id = %', _var_id, _client_id;

        -- Insert new values for related campaign versions
        FOR _campaign_version_id IN 
            select ver."_id" 
            from reverb.campaign_version ver
                inner join reverb.campaign camp on camp._id = ver.campaign_id 
            where camp.client_id = _client_id
        LOOP
        
            -- Insert global var info for campaign version
            insert into reverb.global_vars (object_id, var_definition_id, value) values (_campaign_version_id, _var_definition_id, _value);
            RAISE NOTICE '-- -- Inserted global vars campaign version _id = % , value = %', _campaign_version_id, _value;	

            -- Delete original global var value related to the client
            delete from reverb.global_vars where _id = _var_id and object_id = _client_id and var_definition_id = _var_definition_id;
            RAISE NOTICE '-- -- Deleted old global vars _id = % , object_id = %, var_defnition = %', _var_id, _client_id, _var_definition_id;	
        
        END LOOP;
        
        RAISE NOTICE '-- Finished processing _id = % client_id = %', _var_id, _client_id;
    
    END LOOP;

    update reverb.var_definition set context = 'CAMPAIGN_VERSION.POST_REWARD' where _id = _var_definition_id;
    RAISE NOTICE '-- -- Context POST_REWARD_VERSION updated _id = % ', _var_definition_id;			

    END 
$$;`;

  return knex.schema.raw(query);
};

exports.down = function () {
  return;
};
