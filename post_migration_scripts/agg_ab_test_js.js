exports.seed = function(knex) {
  return knex.raw(`
    DROP VIEW IF EXISTS reverb.agg_ab_test_js;
    CREATE OR REPLACE VIEW reverb.agg_ab_test_js AS
    SELECT
        ab._id,
        ab.created_at AS "createdAt",
        name,
        description,
        start_date AS "startDate",
        end_date AS "endDate",
        responsible_user_ids AS "responsibleUserIds",
        -- Subquery to aggregate responsible users into JSON objects
        (
            SELECT 
                json_agg(
                    json_build_object(
                        'first_name', usr.first_name,
                        'last_name', usr.last_name,
                        'email', usr.email
                    )
                )
            FROM
                reverb.user usr
            WHERE
                usr._id = ANY(ab.responsible_user_ids)
        ) AS "responsibleUsers",
        kpis,
        type,
        -- it brings the child campaign versions enriched with the campaign and client
        array(
            SELECT 
                row_to_json(cpvs.*)
            FROM (
                SELECT
                    cli.name AS "clientName",
                    c.description AS "campaignName",
                    cv."name" AS "campaignVersionName",
                    cv."_id" AS "campaignVersionId",
                    cv.active AS "campaignVersionActive"
                FROM 
                    reverb.ab_test_campaign_version ab_cpv
                INNER JOIN
                    reverb.campaign_version cv ON cv."_id" = ab_cpv.campaign_version_id
                INNER JOIN
                    reverb.campaign c ON c."_id" = cv.campaign_id 
                INNER JOIN
                    reverb.client cli ON cli."_id" = c.client_id 
                WHERE 
                    ab_cpv.ab_test_id = ab._id
            ) cpvs 
        ) AS "campaignVersions",
        -- Calculated status column
        CASE
            WHEN start_date > NOW() THEN 'TO_START'
            WHEN start_date <= NOW() AND end_date >= NOW() AND 
                EXISTS (
                    SELECT 1 
                    FROM reverb.ab_test_campaign_version ab_cpv
                    INNER JOIN reverb.campaign_version cv ON cv."_id" = ab_cpv.campaign_version_id
                    INNER JOIN reverb.campaign cp ON cp._id = cv.campaign_id
                    WHERE ab_cpv.ab_test_id = ab._id AND (cv.active = FALSE OR cp.active = FALSE)
                ) THEN 'FAILED'
            WHEN start_date <= NOW() AND end_date >= NOW() AND 
                EXISTS (
                    SELECT 1 
                    FROM reverb.ab_test_campaign_version ab_cpv
                    INNER JOIN reverb.campaign_version cv ON cv."_id" = ab_cpv.campaign_version_id
                    INNER JOIN reverb.campaign cp ON cp._id = cv.campaign_id
                    WHERE ab_cpv.ab_test_id = ab._id AND cv.active = TRUE AND cp.active = TRUE
                ) AND NOT EXISTS (
                    SELECT 1 
                    FROM reverb.ab_test_campaign_version ab_cpv
                    INNER JOIN reverb.campaign_version cv ON cv."_id" = ab_cpv.campaign_version_id
                    INNER JOIN reverb.campaign cp ON cp._id = cv.campaign_id
                    WHERE ab_cpv.ab_test_id = ab._id AND (cv.active = FALSE OR cp.active = FALSE)
                ) THEN 'IN_PROGRESS'
            WHEN end_date < NOW() THEN 'DONE'
            ELSE 'UNKNOWN'
        END AS status

    FROM
        reverb.ab_test ab
    `);
};
