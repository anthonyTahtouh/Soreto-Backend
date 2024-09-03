
exports.seed = knex => knex.raw(`
do
$$
begin
  if  exists (select true from pg_catalog.pg_roles where  rolname = 'zoe') then
  grant select on all tables in schema reverb to zoe;
  end if;
end
$$;
`);