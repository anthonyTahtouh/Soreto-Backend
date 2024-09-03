exports.seed = function (knex) {
  return knex.raw(`
		
		drop view if exists reverb.agg_user_segmentation_pool_js;

		create or replace view reverb.agg_user_segmentation_pool_js as

		select
			usp."_id" as "id",
			usp.created_at as "createdAt",
			usp."name",
			usp.description,
			usp.client_id as "clientId",
			cli."name" as "clientName",
			(
				SELECT
					json_agg(
						json_build_object(
							'id', seg."id",
							'createdAt', seg."createdAt",
							'name', seg."name",
							'description', seg."description",
							'clientId', seg."clientId",
							'clientName', seg."clientName",
							'scores', (
								SELECT
									json_agg(
										json_build_object(
											'id', uss._id,
											'name', uss.name,
											'type', uss.type,
											'clientId', uss.client_id,
											'expression', uss.expression
										)
									)
								FROM
									reverb.user_segmentation_score uss
								INNER JOIN
									reverb.user_segmentation_score_group ussg ON ussg.user_segmentation_score_id = uss._id
								WHERE
									ussg.user_segmentation_id = seg."id"
							)
						)
					)
				FROM
					(
						SELECT
							us."_id" as "id",
							us.created_at as "createdAt",
							us.name,
							us.description,
							us.client_id as "clientId",
							scli."name" as "clientName"
						FROM
							reverb.user_segmentation us
						INNER JOIN
							reverb.user_segmentation_pool_group uspg ON uspg.user_segmentation_id = us._id
						LEFT JOIN
							reverb.client scli ON scli."_id" = us.client_id
						WHERE
							uspg.user_segmentation_pool_id = usp."_id"
					) as seg
			) as "userSegmentations"
		from
			reverb.user_segmentation_pool usp
		left join
			reverb.client cli on cli."_id" = usp.client_id;
				  
	`);
};
