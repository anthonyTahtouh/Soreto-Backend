
exports.seed = function(knex) {
  return knex.raw(`

  DROP FUNCTION IF EXISTS reverb.func_copy_campaign_js(text, text, boolean, date, date);

  CREATE OR REPLACE FUNCTION reverb.func_copy_campaign_js(p_base_name text, p_campaign_id text, p_copy_active_only boolean, p_start_date date, p_expiry_date date) RETURNS json
  LANGUAGE plpgsql
    AS
    $$

      DECLARE

        source_campaign_version_id text;
        source_reward_pool_id text;

        aux_source_reward_pool_id text;
        aux_target_reward_pool_id text;

        new_campaign_id RECORD;

        current_campaign_version_json jsonb;

      BEGIN

      RAISE NOTICE 'Starting copy process of campaign % using the base name % ',p_campaign_id, p_base_name;

      -- Validation only
      IF NOT EXISTS(SELECT campaign._id
                    FROM reverb.campaign campaign
                    WHERE campaign._id = p_campaign_id) THEN

        RAISE EXCEPTION 'Campaign not found %', p_campaign_id;

      END IF;

      RAISE NOTICE 'Parameters validated.';

      -- Copy Campaign
      RAISE NOTICE 'Campaign - Starting copy campaign: %', p_campaign_id;

      INSERT INTO reverb.campaign (meta, client_id, expiry, description, start_date, short_url_custom_string_component, country_id, direct_share, 
        soreto_tag, super_campaign, source_campaign_id, order_origin_currency, external_order_origin_currency, type, user_segmentation_pool_id)
        SELECT
              meta
            , client_id
            , p_expiry_date
            , p_base_name
            , p_start_date
            , short_url_custom_string_component
            , country_id
            , direct_share
            , soreto_tag
            , false
            , p_campaign_id
            , order_origin_currency
            , external_order_origin_currency
            , type
            , user_segmentation_pool_id
        FROM reverb.campaign
        WHERE _id = p_campaign_id
      RETURNING * INTO new_campaign_id;

      IF (FOUND) THEN
          RAISE NOTICE 'Campaign - Copied campaign % into %', p_campaign_id, new_campaign_id._id;

          FOR source_campaign_version_id, source_reward_pool_id IN
            SELECT _id, reward_pool_id FROM reverb.campaign_version
            WHERE
                 campaign_id = p_campaign_id
                 AND (
                        ( p_copy_active_only is null OR p_copy_active_only = false ) -- if copy actives only is null or false, does not filter anything
                        OR
                        (p_copy_active_only is not null AND active = p_copy_active_only) -- if copy actives only is true then filter for active campaign versions
                    )
            ORDER BY reward_pool_id
            LOOP

                IF( ( (source_reward_pool_id is not null) AND (trim(source_reward_pool_id) <> '') ) AND (source_reward_pool_id = aux_source_reward_pool_id) ) THEN

                  RAISE NOTICE 'CampaignVersion - Processing: % and rewardPool % This rewardPool was copied before, using %', source_campaign_version_id, source_reward_pool_id, aux_target_reward_pool_id;
                  SELECT * INTO current_campaign_version_json from reverb.func_copy_campaign_version_js (p_base_name, new_campaign_id._id, source_campaign_version_id, aux_target_reward_pool_id, true);

                ELSE

                  RAISE NOTICE 'CampaignVersion - Processing: % and without any rewardPool', source_campaign_version_id;
                  SELECT * INTO current_campaign_version_json from reverb.func_copy_campaign_version_js (p_base_name, new_campaign_id._id, source_campaign_version_id, NULL, true);

                END IF;

                aux_source_reward_pool_id := source_reward_pool_id;
                aux_target_reward_pool_id := current_campaign_version_json->>'reward_pool_id';

              RAISE NOTICE 'CampaignVersion - Finished processing: %', source_campaign_version_id;

            END LOOP;

      ELSE
          RAISE EXCEPTION 'Error trying to copy campaign %', p_campaign_id;
      END IF;

      RAISE NOTICE 'Finish copy process of campaign.';

      return row_to_json(new_campaign_id);

    END;
    $$;

    `);
};
