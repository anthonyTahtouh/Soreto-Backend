
exports.up = function(knex) {
  var query = `
  CREATE OR REPLACE VIEW reverb.agg_reward_discount_code_js AS

  SELECT discountcode._id,
    discountcode.created_at AS "createdAt",
    discountcode.updated_at AS "updatedAt",
    discountcode.reward_id AS "rewardId",
    discountcode.discount_type AS "discountType",
    discountcode.value_amount AS "valueAmount",
    discountcode.code,
    discountcode.active_from AS "activeFrom",
    discountcode.active_to AS "activeTo",
    discountcode.valid_from AS "validFrom",
    discountcode.valid_to AS "validTo",
    discountcode.single_use AS "singleUse",
    discountcode.active,
    discountcode.attributed_user_id  AS "attributedUserId",
    reward.name  AS "rewardName",
    reward.client_id AS "clientId",
    client.name AS "clientName"
    FROM reverb.reward_discount_code discountcode
    JOIN reverb.reward reward ON discountcode.reward_id = reward._id
    JOIN reverb.client client ON reward.client_id = client._id;
  `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
  DROP VIEW reverb.agg_reward_discount_code_js;
  `;
  return knex.schema.raw(query);
};
