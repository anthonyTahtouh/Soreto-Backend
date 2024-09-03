exports.up = function(knex) {
  var query = `
  CREATE TABLE reverb.reward_discount_code
    (
      _id text NOT NULL DEFAULT reverb.generate_object_id(),
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now(),
      reward_id text,
      discount_type text,
      value_amount text,
      code text,
      active_from timestamp with time zone,
      active_to timestamp with time zone,
      valid_from timestamp with time zone,
      valid_to timestamp with time zone,
      single_use boolean,
      active text,
      attributed_user_id text,
      CONSTRAINT reward_discount_code_pkey PRIMARY KEY (_id)
    );

  CREATE TABLE reverb.reward
    (
      _id text NOT NULL DEFAULT reverb.generate_object_id(),
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now(),
      type text,
      name text,
      client_id text,
      CONSTRAINT reward_pkey PRIMARY KEY (_id),
      CONSTRAINT client_id_fkey FOREIGN KEY (client_id)
      REFERENCES reverb.client (_id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION
    );

  CREATE TABLE reverb.reward_pool
    (
      _id text NOT NULL DEFAULT reverb.generate_object_id(),
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now(),
      advocate_pre_conversion_reward_id text,
      advocate_post_conversion_reward_id text,
      referee_reward_id text,
      CONSTRAINT reward_pool_pkey PRIMARY KEY (_id),

      CONSTRAINT advocate_pre_conversion_reward_id_fkey FOREIGN KEY (advocate_pre_conversion_reward_id)
      REFERENCES reverb.reward (_id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION,

      CONSTRAINT advocate_post_conversion_reward_id_fkey FOREIGN KEY (advocate_post_conversion_reward_id)
      REFERENCES reverb.reward (_id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION,

      CONSTRAINT referee_reward_id FOREIGN KEY (referee_reward_id)
      REFERENCES reverb.reward (_id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE NO ACTION
    );

    select reverb.create_view_table_js('reverb.reward_pool');
    select reverb.create_view_table_js('reverb.reward');
    select reverb.create_view_table_js('reverb.reward_discount_code');

  `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
  `;
  return knex.schema.raw(query);
};