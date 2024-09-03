
exports.up = function(knex) {
  var query = `
  CREATE TABLE reverb.value_date
  (
    date date NOT NULL,
    CONSTRAINT date_pkey PRIMARY KEY (date)
  );

  INSERT INTO reverb.value_date (date)

  SELECT date

  from (select date::date
          from generate_series(
            '2000-01-01'::date,
            '2050-01-01'::date,
            '1 day'::interval
          ) date) as date;
  `;
  return knex.schema.raw(query);
};

exports.down = function(knex) {
  var query = `
  DROP VIEW reverb.value_date_js;
  DROP TABLE reverb.value_date;
  `;
  return knex.schema.raw(query);
};
