
exports.seed = function(knex) {
  return knex.raw(`

  drop view if exists reverb.agg_user_management_js;

  create or replace view reverb.agg_user_management_js
  as
       select
       u._id,
       max(u.created_at) as "createdAt",
       max(u.updated_at) as "updatedAt",
       max(u.first_name) as "firstName",
       max(u.last_name) as "lastName",
       max(u.password) as "password",
       max(u.client_id) as "clientId",
       (select name from reverb.client c  where c._id = u.client_id ) as "clientName",
       string_agg(ro.name, ',') as "roleNames",
       array(select jsonb_array_elements_text(u.roles)) as "roles",
       max(u.email) as "email",
       u.verified_email as "verifiedEmail",
       (case when(max(ro.name) = 'sales') then true else null end) as "salesResponsible"
       from
       reverb."user" u, jsonb_array_elements_text(u.roles) r(role_id)
       join reverb.role ro on ro._id = role_id

       group by u._id, u.roles, u.client_id
  `);
};
