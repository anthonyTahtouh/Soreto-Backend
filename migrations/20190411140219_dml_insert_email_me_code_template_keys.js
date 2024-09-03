export function up(knex) {
  var query = `
  INSERT INTO reverb.email_template_type (_id, value, name)
    VALUES ('5cac6b386d3bf1001e984c47', 'email-me-code', 'Email me code');

  INSERT INTO reverb.key_email_template_type (email_template_type_id, input_type, label, required, template_key, name) VALUES
    ('5cac6b386d3bf1001e984c47','text','image url (588 x 86)',true,'HEAD_LOGO_IMAGE_URL','email-me-code logo image'),
    ('5cac6b386d3bf1001e984c47','text','button text',true,'BUTTONTEXT','email-me-code button text'),
    ('5cac6b386d3bf1001e984c47','textArea','body',true,'BODY','email-me-code body'),
    ('5cac6b386d3bf1001e984c47','text','subject',true,'SUBJECT','email-me-code subject'),
    ('5cac6b386d3bf1001e984c47','text','from name',true,'FROMNAME','email-me-code from name'),
    ('5cac6b386d3bf1001e984c47','text','from email',false,'CLIENTEMAIL','email-me-code client email'),
    ('5cac6b386d3bf1001e984c47','text','heading',false,'HEADING','email-me-code heading'),
    ('5cac6b386d3bf1001e984c47','text','restrictions text',false,'RESTRICTIONSTEXT','email-me-code restrictions text'),
    ('5cac6b386d3bf1001e984c47','text','hero image url (800x323)',false,'HEROIMAGE','email-me-code hero image'),
    ('5cac6b386d3bf1001e984c47','color','button color',false,'BUTTONCOLOR','email-me-code button color'),
    ('5cac6b386d3bf1001e984c47','color','button text color',false,'BUTTONTEXTCOLOR','email-me-code button text color');

  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}