export function up(knex) {
  var query = `
  INSERT INTO reverb.email_template_type (_id, value, name)
    VALUES ('5caebad5f19d3a010266626f', 'general-email', 'Email me code');

  INSERT INTO reverb.key_email_template_type (email_template_type_id, input_type, label, required, template_key, name) VALUES
    ('5caebad5f19d3a010266626f','textArea','Body',true,'BODY','general-email body'),
    ('5caebad5f19d3a010266626f','text','Reward',true,'REWARD','REWARD button text'),
    ('5caebad5f19d3a010266626f','text','Headline',true,'HEADLINE','general-email HEADLINE'),
    ('5caebad5f19d3a010266626f','text','Clientname',true,'CLIENTNAME','general-email CLIENTNAME');
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ``;
  return knex.schema.raw(query);
}