export function up(knex) {
  var query = `
  CREATE TABLE reverb.process_post_conversion_reward
(
    _id text COLLATE pg_catalog."default" NOT NULL DEFAULT reverb.generate_object_id(),
    process_id text COLLATE pg_catalog."default",
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    reward_id text COLLATE pg_catalog."default",
    order_id text COLLATE pg_catalog."default",
    process_status text COLLATE pg_catalog."default",
    meta jsonb,
    CONSTRAINT process_post_conversion_reward_pkey PRIMARY KEY (_id),
    CONSTRAINT order_id_fkey FOREIGN KEY (order_id)
        REFERENCES reverb."order" (_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT reward_id_fkey FOREIGN KEY (reward_id)
        REFERENCES reverb.reward (_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
)
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}