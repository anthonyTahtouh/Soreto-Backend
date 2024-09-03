export function up(knex) {
  var query = `
  DROP VIEW reverb.reward_discount_code_js;

  CREATE OR REPLACE VIEW reverb.reward_discount_code_js AS
   SELECT reward_discount_code._id,
      reward_discount_code.created_at AS "createdAt",
      reward_discount_code.updated_at AS "updatedAt",
      reward_discount_code.reward_id AS "rewardId",
      reward_discount_code.discount_type AS "discountType",
      reward_discount_code.value_amount AS "valueAmount",
      reward_discount_code.code,
      reward_discount_code.active_from AS "activeFrom",
      reward_discount_code.active_to AS "activeTo",
      reward_discount_code.valid_from AS "validFrom",
      reward_discount_code.valid_to AS "validTo",
      reward_discount_code.active,
      reward_discount_code.attributed_user_id AS "attributedUserId"
     FROM reverb.reward_discount_code;


  DROP VIEW reverb.agg_reward_discount_code_js;

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
    discountcode.active,
    discountcode.attributed_user_id AS "attributedUserId",
    reward.name AS "rewardName",
    reward.client_id AS "clientId",
    client.name AS "clientName"
    FROM reverb.reward_discount_code discountcode
      JOIN reverb.reward reward ON discountcode.reward_id = reward._id
      JOIN reverb.client client ON reward.client_id = client._id;

   ALTER TABLE reverb.reward_discount_code DROP COLUMN single_use;

  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}