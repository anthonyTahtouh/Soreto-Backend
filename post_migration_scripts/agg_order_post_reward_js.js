let sql = `

    DROP VIEW IF EXISTS reverb.agg_order_post_reward_js;
        
    CREATE OR REPLACE VIEW reverb.agg_order_post_reward_js AS
    select 
        opr.*,
        cli."_id" as"clientId"
    from 
        reverb.order_post_reward_js opr
        left join
        reverb."order" o
        on
        o."_id" = opr."orderId"
        left join
        reverb.external_order eo
        on
        eo."_id" = opr."externalOrderId"
        left join
        reverb.client cli
        on
        cli._id = o.client_id
        or
        cli."_id" = eo.client_id
`;

exports.seed = function(knex) {
  return knex.raw(sql);
};