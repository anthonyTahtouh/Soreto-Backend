export function up(knex) {
  var query = `
	INSERT INTO reverb.key_email_template_type 
	  (email_template_type_id, input_type, label, default_value, required, template_key)
	SELECT "_id", 'text','[FONT] Email body ', NULL, false, 'FONT_EMAIL_BODY '  
	  FROM reverb.email_template_type
	union all
	SELECT "_id", 'text','[FONT] Email body title', NULL, false, 'FONT_EMAIL_BODY_TITLE '  
	  FROM reverb.email_template_type
	      `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
	DELETE FROM  reverb.key_email_template_type where  LABEL = '[ FONT] Email body';
      
	DELETE FROM  reverb.key_email_template_type where  LABEL = '[ FONT] Email body title'
	`;
  return knex.schema.raw(query);
}

