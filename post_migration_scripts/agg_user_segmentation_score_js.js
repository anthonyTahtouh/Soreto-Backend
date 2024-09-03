exports.seed = function (knex) {
  return knex.raw(`
    
    drop view if exists reverb.agg_user_segmentation_score_js;

    create or replace view  reverb.agg_user_segmentation_score_js as
	
	select
		uss._id as "id",
		uss.created_at as "createdAt",
		uss.updated_at as "updatedAt",
		uss.name,
		uss.description,
		uss.type,
		uss.expression,
		uss.client_id as "clientId",
		cli."name" as "clientName"
	from
		reverb.user_segmentation_score uss
		left join
		reverb.client cli on cli._id = uss.client_id;
              
  `);
};
