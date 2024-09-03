export function up(knex) {
  var query = `
       
        insert into reverb.email_template_type values (default, NOW(), NOW(), 'shared_url_notification_personal_no_order', 'Shared Url Notification - No Order (Personal)');
        
        insert into reverb.key_email_template_type values
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', 'Headline', 'Your reward from ##client_name## is expiring soon', true, 'HEADLINE'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', 'Heading', 'Your reward from ##client_name## is expiring soon', false, 'HEADING'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', 'Client Name', '##client_name##', true, 'CLIENTNAME'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', 'From Name', '##client_name##', true, 'FROMNAME'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', 'Client Email', '##client_email##', true, 'CLIENTEMAIL'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', 'Banner Image Url', null, true, 'BANNER_IMAGE_URL'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', 'Logo Image Url', null, true, 'LOGO_IMAGE_URL'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', 'Body Title', 'Hurry - your referral reward is about to expire!', false, 'BODY_TITLE'),

        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', 'Body Line 1', 'Don''t miss out, get ##sharer_reward## off ur next order before it expires on *|PERSONAL_SHARED_URL_EXPIRE_DATE|*', false, 'BODY_LINE_1'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', 'Body Line 2', null, false, 'BODY_LINE_2'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', 'Body Line 3', null, false, 'BODY_LINE_3'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', 'Body Line 4', null, false, 'BODY_LINE_4'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', 'Body Line 5', null, false, 'BODY_LINE_5'),


        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', 'Shared Url Link Button Text', 'Get ##sharer_reward##', true, 'SHARED_URL_LINK_BUTTON_TEXT'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', 'Shared Url Link Button Text Color', '#FFFFFF', true, 'SHARED_URL_LINK_BUTTON_TEXT_COLOR'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', 'Shared Url Link Button Background Color', '#f54061', true, 'SHARED_URL_LINK_BUTTON_BACKGROUND_COLOR'),


        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', 'Body Section 2 Line 1', null, false, 'BODY_SECTION_2_LINE_1'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', 'Body Section 2 Line 2', null, false, 'BODY_SECTION_2_LINE_2'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', 'Body Section 2 Line 3', null, false, 'BODY_SECTION_2_LINE_3'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', 'Body Section 2 Line 4', null, false, 'BODY_SECTION_2_LINE_4'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', 'Body Section 2 Line 5', null, false, 'BODY_SECTION_2_LINE_5'),

        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', 'Show Landing Page Navigation Button', 'TRUE', false, 'SHOW_LANDING_PAGE_NAVIGATION_BUTTON'),

        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', 'CTA border radius', '9px', true, 'CTA_BORDER_RADIUS'),


        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', '[Marketplace] Show section', 'TRUE', false, 'SHOW_MP_SECTION'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', '[Marketplace] Line 1', 'Love ##client_name##?? Discover our latest offers & track all your referrals in one place', false, 'MP_LINE_1'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', '[Marketplace] Line 2', null, false, 'MP_LINE_2'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', '[Marketplace] Line 3', null, false, 'MP_LINE_3'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', '[Marketplace] Link Button Text', 'Get started', false, 'MP_LINK_BUTTON_TEXT'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', '[Marketplace] Link Button URL', 'https://soreto.com', false, 'MP_LINK_URL'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', '[Marketplace] Link Button Text Color', '#FFFFFF', false, 'MP_LINK_BUTTON_TEXT_COLOR'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', '[Marketplace] Link Button Background Color', '#f54061', false, 'MP_LINK_BUTTON_BACKGROUND_COLOR'),


        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', '[FOOTER] - Brand Rights Text', 'All rights reserved', false, 'FOOTER_BRAND_RIGHTS'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', '[FOOTER] - Contact Us Link Text', 'Get In Touch', false, 'FOOTER_CONTACT_US_LINK_TEXT'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', '[FOOTER] - Privacy Policy Link Text', 'Privacy Policy', false, 'FOOTER_PRIVACY_POLICY_LINK_TEXT'),

        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', '[HEADER] - Line Color', null, false, 'HEADER_LINE_COLOR'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', '[HEADER] - Line Size', null, false, 'HEADER_LINE_SIZE'),


        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', '[BODY] - Bottom Line Color', null, false, 'BODY_BOTTOM_LINE_COLOR'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', '[BODY] - Bottom Line Size', null, false, 'BODY_BOTTOM_LINE_SIZE'),

        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', '[FONT] Email body', null, false, 'FONT_EMAIL_BODY'),
        (default, now(), now(), (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order'), 'text', '[FONT] Email body title', null, false, 'FONT_EMAIL_BODY_TITLE')

    `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = ` 
        delete from reverb.assoc_campaigns_email_templates where email_template_id in (select _id from reverb.email_template where type = 'shared_url_notification_personal_no_order');
        delete from reverb.email_template where type = 'shared_url_notification_personal_no_order';
        delete from reverb.key_email_template_type where email_template_type_id = (select _id from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order');
        delete from reverb.email_template_type where "value" = 'shared_url_notification_personal_no_order';
  `;
  return knex.schema.raw(query);
}