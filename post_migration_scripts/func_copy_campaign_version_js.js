
exports.seed = function(knex) {
  return knex.raw(`

  DROP FUNCTION IF EXISTS reverb.func_copy_campaign_version_js(text, text, text, text, boolean);

  CREATE OR REPLACE FUNCTION reverb.func_copy_campaign_version_js(p_base_name text, p_campaign_id text, p_campaign_version_id text, p_reward_pool_id text, p_inherited_copy boolean) RETURNS json
  LANGUAGE plpgsql
    AS
    $$

    DECLARE

      source_reward_pool_id                     text;
      source_display_block_id                   text;
      source_code_block_id                      text;
      source_assoc_campaigns_email_templates_id text;
      source_email_templates_id                 text;

      new_campaign_version_rec                  RECORD;
      new_reward_pool_id                        text;
      new_display_block_rec                     reverb.display_block%rowtype;
      new_code_block_id                         text;
      new_email_template_id                     text;
      new_assoc_campaigns_email_templates_rec   reverb.assoc_campaigns_email_templates%rowtype;
      aux_source_template_id text;
      aux_target_template_id text;

      new_reward_pool_dynamic_id                text;
      source_reward_group_ids					          text[];
      copied_reward_group_id                    text;
	    source_reward_pool_dynamic_id             text;
	    index                                     text;

    BEGIN

      raise notice 'Starting copy process of campaign version % using the base name % and campaign id %',p_campaign_version_id, p_base_name, p_campaign_id;

      -- Validation only
      IF NOT EXISTS(SELECT campaignVersion._id
                    FROM reverb.campaign_version campaignVersion
                    WHERE campaignVersion._id = p_campaign_version_id) THEN
        RAISE EXCEPTION 'Campaign version not found %', p_campaign_version_id;
      END IF;

      IF NOT ((p_campaign_id is null) OR (trim(p_campaign_id) = '')) THEN
        IF NOT EXISTS(SELECT campaign._id FROM reverb.campaign campaign WHERE campaign._id = p_campaign_id) THEN
          RAISE EXCEPTION 'Campaign not found %', p_campaign_id;
        END IF;
      END IF;

      IF NOT ((p_reward_pool_id is null) OR (trim(p_reward_pool_id) = '')) THEN
        IF NOT EXISTS(SELECT rewardpool._id FROM reverb.reward_pool rewardpool WHERE rewardpool._id = p_reward_pool_id) THEN
          RAISE EXCEPTION 'Reward Pool not found %', p_reward_pool_id;
        END IF;
      END IF;

      -- Copy Reward pool -- it will create a new copy only if a fixed one is not given as parameter
      raise notice 'RewardPool - Starting copy reward pool.';
      IF ((p_reward_pool_id is null) OR (trim(p_reward_pool_id) = '')) THEN

        SELECT campaignVersion.reward_pool_id INTO source_reward_pool_id
        FROM reverb.campaign_version campaignVersion
        WHERE campaignVersion._id = p_campaign_version_id;

        IF NOT ((source_reward_pool_id is null) OR (trim(source_reward_pool_id) = '')) THEN

          raise notice 'RewardPool - Found reward pool % creating a copy of it', source_reward_pool_id;

          INSERT INTO reverb.reward_pool (advocate_pre_conversion_reward_id, advocate_post_conversion_reward_id, referee_reward_id, client_id, name, post_reward_per_user, friend_post_reward_id, friend_post_reward_per_user)
          SELECT advocate_pre_conversion_reward_id,
                advocate_post_conversion_reward_id,
                referee_reward_id,
                client_id,
                CONCAT(p_base_name, ' - ', name),
                post_reward_per_user, 
                friend_post_reward_id, 
                friend_post_reward_per_user
          FROM reverb.reward_pool
          WHERE _id = source_reward_pool_id
                RETURNING _id into new_reward_pool_id;

          IF (FOUND) THEN
            raise notice 'RewardPool - Copied reward pool % into %', source_reward_pool_id, new_reward_pool_id;
          ELSE
            raise notice 'RewardPool - Error trying to copy reward pool %', source_reward_pool_id;
          END IF;

        ELSE
          raise notice 'RewardPool - No Reward pool found to copy for campaign version: %', p_campaign_version_id;

        END IF;

      ELSE

        new_reward_pool_id := p_reward_pool_id;
        raise notice 'RewardPool - Using a fixed reward pool id : %', p_reward_pool_id;

      END IF;
     
		  -- Copying Reward Pool Dynamic below

      -- Assign campaign version's reward_pool_dynamic_id into  variable
      SELECT campaignVersion.reward_pool_dynamic_id 
      INTO source_reward_pool_dynamic_id
      FROM reverb.campaign_version campaignVersion
      WHERE campaignVersion._id = p_campaign_version_id;
    
	    IF NOT ((source_reward_pool_dynamic_id is null) OR (trim(source_reward_pool_dynamic_id) = '')) THEN
	
        raise notice 'RewardPoolDynamic - Found reward pool dynamic % creating a copy of it', source_reward_pool_dynamic_id;
      
        -- Copying reward pool dynamic with group_ids set to null
        insert into 
          reverb.reward_pool_dynamic 
          (name, client_id, sharer_pre_reward_group_id, sharer_post_reward_group_id, friend_pre_reward_group_id, friend_post_reward_group_id)
        select 
          CONCAT(p_base_name, ' - ', name),
          client_id,
          null,
          null,
          null,
          null
        from reverb.reward_pool_dynamic
        WHERE _id = source_reward_pool_dynamic_id
        RETURNING _id into new_reward_pool_dynamic_id;
                
        -- Push reward_pool_dynamic group_ids into an array
        select 
          array[
            sharer_pre_reward_group_id, 
            sharer_post_reward_group_id, 
            friend_pre_reward_group_id,
            friend_post_reward_group_id
          ] 
        from reward_pool_dynamic rpd
        where rpd._id = source_reward_pool_dynamic_id
        into source_reward_group_ids;
    
        RAISE NOTICE 'source_reward_group_ids %', source_reward_group_ids;

        -- Iterate over group_id array 
        for index in array_lower(source_reward_group_ids, 1) .. array_upper(source_reward_group_ids, 1) loop
        
          continue when source_reward_group_ids[index] is null;
        
          -- Copying reward_group
          INSERT INTO	reverb.reward_group (name, client_id)
          SELECT  CONCAT(p_base_name, ' - ', name), client_id from reward_group where _id = source_reward_group_ids[index]
          returning _id into copied_reward_group_id;				
          
          -- Copying reward_group_itens and pointing to the newly copied group
          insert into reverb.reward_group_item (group_id, reward_id, alias, rules, active, visible)
          select copied_reward_group_id, reward_id, alias, rules, active, visible 
          from reward_group_item 
          where group_id = source_reward_group_ids[index];
          
          -- Updating reward_pool_dynamic to point to the newly copied group
          -- if index = 1 then it's sharer_pre, index = 2 sharer_post, etc
          if index = 1 then
            update reverb.reward_pool_dynamic set sharer_pre_reward_group_id = copied_reward_group_id where _id = new_reward_pool_dynamic_id;
          elsif index = 2 then
            update reverb.reward_pool_dynamic set sharer_post_reward_group_id = copied_reward_group_id where _id = new_reward_pool_dynamic_id;
          elsif index = 3 then
            update reverb.reward_pool_dynamic set friend_pre_reward_group_id = copied_reward_group_id where _id = new_reward_pool_dynamic_id;
          elsif index = 4 then
            update reverb.reward_pool_dynamic set friend_post_reward_group_id = copied_reward_group_id where _id = new_reward_pool_dynamic_id;
          end if;
        
        end loop;

        else
        
          raise notice 'RewardPoolDynamic - No Reward pool dynamic found to copy for campaign version: %', p_campaign_version_id;
	     
	  	END IF;


      -- Copy Campaign Version
      raise notice 'CampaignVersion - Starting copy campaign version.';

      INSERT INTO reverb.campaign_version (campaign_id, name, alias, source_tags, reward_pool_id, reward_pool_dynamic_id, reward_pool_dynamic_enabled, exposure, active, link_expiry_days, flow_type, tracking_link, private_link_expiry_days, mp_offer_title)
      SELECT
          CASE
            WHEN ((p_campaign_id is null) OR (trim(p_campaign_id) = '')) THEN campaign_id
            ELSE p_campaign_id
          END
          ,CASE
              WHEN (p_inherited_copy is null OR p_inherited_copy = true) THEN CONCAT(p_base_name, ' - ', name)
              ELSE p_base_name
           END
          , alias
          , source_tags
          , new_reward_pool_id
          , new_reward_pool_dynamic_id
          , reward_pool_dynamic_enabled
          ,CASE
              WHEN (p_inherited_copy is null OR p_inherited_copy = true) THEN exposure
              ELSE 0
           END
          ,CASE
              WHEN (p_inherited_copy is null OR p_inherited_copy = true) THEN active
              ELSE false
           END
          , link_expiry_days
          , flow_type
          , tracking_link
          , private_link_expiry_days
          , mp_offer_title
      FROM reverb.campaign_version
      WHERE _id = p_campaign_version_id
            RETURNING * into new_campaign_version_rec;

      IF (FOUND) THEN
        raise notice 'CampaignVersion - Copied campaign version % into new % using the new reward pool %', p_campaign_version_id, new_campaign_version_rec._id, new_reward_pool_id;
      ELSE
        RAISE EXCEPTION 'CampaignVersion - Error trying to copy campaign version %', p_campaign_version_id;
      END IF;

      raise notice 'CampaignVersion - Finish copy campaign version.';

      -- Copy Display Block -- Placement
      raise notice 'DisplayBlock - Starting copy display block.';

      FOR source_display_block_id IN
        SELECT _id FROM reverb.display_block where campaign_version_id = p_campaign_version_id
        LOOP
          RAISE NOTICE 'DisplayBlock - Processing: %', source_display_block_id;

          INSERT INTO reverb.display_block (active, name, type, campaign_version_id, universal_fallback)
          SELECT active
              , CONCAT(p_base_name, ' - ', name)
              , type
              , new_campaign_version_rec._id
              , universal_fallback
          FROM reverb.display_block
          WHERE _id = source_display_block_id
                RETURNING * into new_display_block_rec;

          IF (FOUND) THEN
            raise notice 'DisplayBlock - Copied display block % into a new display block % using campaign version %', source_display_block_id, new_display_block_rec._id, new_campaign_version_rec._id;
          END IF;

          -- Copy Code Block of actual display block -- Layout
          FOR source_code_block_id IN
            SELECT _id from reverb.code_block where display_block_id = source_display_block_id
            LOOP

              RAISE NOTICE 'CodeBlock - Processing: %', source_code_block_id;

              INSERT INTO reverb.code_block (active, display_block_id, name, css_external, javascript_external, css,
                                            javascript, html_body, preview_desktop_thumbnail_url, meta, scss)
              SELECT active
                  , new_display_block_rec._id
                  , CONCAT(p_base_name, ' - ', name)
                  , css_external
                  , javascript_external
                  , css
                  , javascript
                  , html_body
                  , preview_desktop_thumbnail_url
                  , meta
                  , scss
              FROM reverb.code_block
              WHERE _id = source_code_block_id
                    RETURNING _id INTO new_code_block_id;

              IF (FOUND) THEN
                raise notice 'CodeBlock - Copied code block % into new code block % using the display block %', source_code_block_id, new_code_block_id, new_display_block_rec._id;
              ELSE
                raise notice 'CodeBlock - No code block fount to copy';
              END IF;

              RAISE NOTICE 'CodeBlock - Finished processing: %', source_code_block_id;

            END LOOP;

          RAISE NOTICE 'DisplayBlock - Finished processing: %', source_display_block_id;

        END LOOP;

      raise notice 'DisplayBlock - Finish copy display block.';

      -- Copy Display Block -- Placement
      raise notice 'AssocCampaignEmailTemplate - Starting copy assoc campaign email template.';

      FOR source_assoc_campaigns_email_templates_id,source_email_templates_id IN
        SELECT _id, email_template_id FROM reverb.assoc_campaigns_email_templates where campaign_version_id = p_campaign_version_id ORDER BY email_template_id
        LOOP
          RAISE NOTICE 'AssocCampaignEmailTemplate - Processing assoc: % and email template: %', source_assoc_campaigns_email_templates_id, source_email_templates_id;

            --Copy email
            IF( ( (source_email_templates_id is not null) AND (trim(source_email_templates_id) <> '') )
                        AND (source_email_templates_id = aux_source_template_id) )
                THEN
                    RAISE NOTICE 'AssocCampaignEmailTemplate - Utilizando template : %',aux_target_template_id;

                ELSE
                  INSERT INTO reverb.email_template (name, type, external_template_id, template_values, client_id, external_service_name, email_template_type_id)
                      SELECT
                          CONCAT(p_base_name, ' - ', name)
                          , type
                          , external_template_id
                          , template_values
                          , client_id
                          , external_service_name
                          , email_template_type_id
                      from reverb.email_template
                      where _id = source_email_templates_id
                  RETURNING _id INTO new_email_template_id;
                RAISE NOTICE 'AssocCampaignEmailTemplate - Criando novo email template de origem: % novo %', source_email_templates_id, new_email_template_id;
                aux_target_template_id := new_email_template_id;
            END IF;
          aux_source_template_id := source_email_templates_id;

          --Create assoc
          INSERT into reverb.assoc_campaigns_email_templates (campaign_id, email_template_id, campaign_version_id)
          SELECT
            CASE
              WHEN ((p_campaign_id is null) OR (p_campaign_id = '')) THEN campaign_id
              ELSE p_campaign_id
              END
              , aux_target_template_id
              , new_campaign_version_rec._id
          FROM reverb.assoc_campaigns_email_templates
          WHERE _id = source_assoc_campaigns_email_templates_id
                RETURNING * into new_assoc_campaigns_email_templates_rec;

          RAISE NOTICE 'AssocCampaignEmailTemplate - Copied assoc campaign email template % into a new assoc % using campaign version % and campaign %', source_assoc_campaigns_email_templates_id, new_assoc_campaigns_email_templates_rec._id, new_assoc_campaigns_email_templates_rec.campaign_version_id, new_assoc_campaigns_email_templates_rec.campaign_id;

          RAISE NOTICE 'AssocCampaignEmailTemplate - Finished processing: %', source_assoc_campaigns_email_templates_id;

        END LOOP;

      raise notice 'AssocCampaignEmailTemplate - Finish copy assoc campaign email template.';

      -- Copy Global Vars
      raise notice 'Global Vars - Starting copy global vars.';
     
      --  COPY ALL GLOBAL VARS WITH THE SAME OBJECT ID AS THE CAMPAIGN VERSION THAT HAS BEING COPIED
      INSERT INTO global_vars (object_id, var_definition_id, "value")
      	SELECT 
	   		new_campaign_version_rec._id,
	   		var_definition_id,
			"value"
	    FROM
		    global_vars
     	WHERE
	     	object_id = p_campaign_version_id
	     	AND
	     	var_definition_id
	     	IN 
	     	(
	     		SELECT _id FROM var_definition WHERE "restrict" = false
	     	);
		    	     	
	  raise notice 'Global Vars - Finish copy global vars.';
	 
     	     
      raise notice 'Campaign version copy process finished';
      return row_to_json(new_campaign_version_rec);

    END;
    $$;

    `);
};