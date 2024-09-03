
exports.up = function(knex) {

  let query = `

        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Ireland'  LIMIT 1) WHERE "location" = 'IE';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Global' LIMIT 1) WHERE "location" = 'Kuala Lumpur';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Great Britain' LIMIT 1) WHERE "location" = 'London';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Global' LIMIT 1) WHERE "location" = 'Turkey';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Australia' LIMIT 1) WHERE "location" = 'Ausralia';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Global' LIMIT 1) WHERE "location" = 'Singapore';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Australia' LIMIT 1) WHERE "location" = 'AU';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Other Europe' LIMIT 1) WHERE "location" = 'Amsterdam';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'France' LIMIT 1) WHERE "location" = 'France';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Other Europe' LIMIT 1) WHERE "location" = ' Lituania';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Global' LIMIT 1) WHERE "location" = 'Thought mix media';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Spain' LIMIT 1) WHERE "location" = 'Spain';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Other Europe' LIMIT 1) WHERE "location" = 'Serbia';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Global' LIMIT 1) WHERE "location" = 'tbc';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Great Britain' LIMIT 1) WHERE "location" = 'GB';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Australia' LIMIT 1) WHERE "location" = 'Sydney';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Global' LIMIT 1) WHERE "location" = 'Herts';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Great Britain' LIMIT 1) WHERE "location" = 'london';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Other Europe' LIMIT 1) WHERE "location" = 'Netherlands';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Global' LIMIT 1) WHERE "location" = 'xx';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Global' LIMIT 1) WHERE "location" = 'l';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Global' LIMIT 1) WHERE "location" = 'll';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Global' LIMIT 1) WHERE "location" = 'Canada';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Global' LIMIT 1) WHERE "location" = 'China';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Australia' LIMIT 1) WHERE "location" = 'Australia';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'United States' LIMIT 1) WHERE "location" = 'US';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Great Britain' LIMIT 1) WHERE "location" = 'Greater London';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Great Britain' LIMIT 1) WHERE "location" = 'United Kingdom';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Other Europe' LIMIT 1) WHERE "location" = 'Sweden';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Italy' LIMIT 1) WHERE "location" = 'Italy';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Global' LIMIT 1) WHERE "location" = 'CA';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Other Europe' LIMIT 1) WHERE "location" = 'DE';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Global' LIMIT 1) WHERE "location" = 'Korea';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Great Britain' LIMIT 1) WHERE "location" = 'London ';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Global' LIMIT 1) WHERE "location" = 'lll';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Great Britain' LIMIT 1) WHERE "location" = 'UK';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Global' LIMIT 1) WHERE "location" = 'Taipei';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Great Britain' LIMIT 1) WHERE "location" = '--';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Other Europe' LIMIT 1) WHERE "location" = 'Switzerland';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Australia' LIMIT 1) WHERE "location" = 'New Zealand';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'United States' LIMIT 1) WHERE "location" = 'US ';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Other Europe' LIMIT 1) WHERE "location" = 'Oxford';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'United States' LIMIT 1) WHERE "location" = 'USA';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'France' LIMIT 1) WHERE "location" = 'FR';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Global' LIMIT 1) WHERE "location" = '1';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Global' LIMIT 1) WHERE "location" = 'TBC';
        UPDATE reverb.client SET country_id = (SELECT _id FROM reverb.country where "name" = 'Great Britain' LIMIT 1) WHERE "location" = 'United Kingdon';

        DROP VIEW IF EXISTS reverb.agg_client_affiliate_assoc_meta_js;
        DROP VIEW IF EXISTS reverb.client_js;

        ALTER TABLE reverb.client DROP COLUMN "location";

        select reverb.create_view_table_js('reverb.client');
      `;

  return knex.schema.raw(query);
};

exports.down = function(knex) {

  let query = `
        ALTER TABLE reverb.client ADD COLUMN "location" text;
        UPDATE reverb.client SET "location" = (SELECT "name" FROM reverb.country where _id = country_id);
        ALTER TABLE reverb.client ALTER COLUMN "location" SET NOT NULL;

        select reverb.create_view_table_js('reverb.client');
      `;
  return knex.schema.raw(query);
};
