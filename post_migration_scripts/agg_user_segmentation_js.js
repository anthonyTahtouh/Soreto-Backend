exports.seed = function (knex) {
  return knex.raw(`
      
    drop view if exists reverb.agg_user_segmentation_js;

    create or replace view  reverb.agg_user_segmentation_js as
        
        select
            us."_id" as "id",
            us.created_at as "createdAt",
            us.updated_at as "updatedAt",
            us.name,
            us.description,
            us.client_id as "clientId",
            cli."name" as "clientName",
            (
                SELECT 
                    json_agg(
                        score.*
                    )
                from
                (
                    select
                        uss._id as "id",
                        uss.created_at as "createdAt",
                        uss.name,
                        uss.description,
                        uss.type,
                        uss.expression,
                        uss.client_id as "clientId",
                        scli."name" as "clientName"
                    from 
                        reverb.user_segmentation_score uss
                    inner join
                        reverb.user_segmentation_score_group ussg on ussg.user_segmentation_score_id  = uss._id
                    left join
                        reverb.client scli on scli."_id" = uss.client_id
                    where 
                        ussg.user_segmentation_id = us."_id"
                )as score    
                    
            ) as scores
        from
            reverb.user_segmentation us
            left join
            reverb.client cli on cli._id = us.client_id;                
    `);
};
