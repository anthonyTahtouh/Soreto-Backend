export function up(knex) {
  var query = `
  delete from reverb.code_block where name = 'shareviaemail-fallback';
  delete from reverb.display_block where name = 'share-via-email-fallback';

  INSERT INTO reverb.display_block(
    _id, active, name, type, universal_fallback)
    VALUES ('5b589e2094c4f072c2390434', true, 'share-via-email-fallback', 'shareviaemail', true);
  
  
  INSERT INTO reverb.code_block(
    active, display_block_id, name, css_external, css, javascript, html_body, preview_desktop_thumbnail_url)
    VALUES (true, '5b589e2094c4f072c2390434', 'shareviaemail-fallback', 
  
    '    <meta charset="UTF-8">
      <title>Share via email</title>
      <script src=''https://www.google.com/recaptcha/api.js''></script>
      <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.2.0/css/all.css" integrity="sha384-hWVjflwFxL6sNzntih27bfxkr27PmbbK/iSvJ+a4+0owXq79v+lsFkW54bOGbiDQ" crossorigin="anonymous">
  <script
    src="https://code.jquery.com/jquery-3.3.1.slim.min.js"
    integrity="sha256-3edrmyuQ0w65f8gfBsqowzjJe2iM6n0nKciPUp8y+7E="
    crossorigin="anonymous"></script>',	
  '@import url("https://fonts.googleapis.com/css\\?family=Montserrat|Roboto:900");
  body {
    margin: 0px;
    font-family: arial;
    background: white;
  }

  *,
  *:before,
  *:after {
    box-sizing: border-box;
  }

  h1,
  h2 {
    font-family: Roboto;
    font-weight: 900;
  }

  h2 {
    margin-bottom: 0px;
  }

  h1 {
    margin-top: 2px;
    margin-bottom: 3px;
    font-size: 1.6em;
  }

  input,
  textarea {
    border: 1px solid #cccccc;
    resize: none;
    font-size: 12px;
    padding: 10px;
    font-family: Montserrat, arial;
  }

  textarea {
    margin-top: 15px;
    flex-grow: 1;
    min-height: 70px;
    max-height: 200px;
  }

  input {
    width: 100%;
    margin-top: 8px;
  }

  .wrapper > * {
    width: 100%;
  }

  .capatcha-wrapper {
    margin-top: 10px;
  }

  .freind-inputs {
    position: relative;
  }

  .freinds {
    margin-top: 5px;
    margin-bottom: 15px;
  }

  .name-inputs,
  .freinds {
    padding: 0px;
    text-align: right;
  }
  .name-inputs .add-friend,
  .freinds .add-friend {
    padding-top: 5px;
    padding-right: 15px;
    font-size: 0.8em;
    position: absolute;
    display: none;
    right: 5px;
  }

  .wrapper {
    text-align: center;
    margin: auto;
    font-size: 18px;
    max-width: 343px;
    padding: 20px;
    padding-bottom: 80px;
    display: flex;
    flex-direction: column;
    height: 100vh;
    max-height: 700px;
  }

  @media only screen and (max-width: 321px) {
    .wrapper {
      padding: 8px;
    }
  }
  .hidden {
    display: none;
  }

  .cta {
    color: #00b5ad;
    border: 3px solid #00b5ad;
    text-align: center;
    padding: 10px;
    margin-top: 10px;
  }

  .logo {
    margin: 0px auto;
    background-color: blue;
    background: url("https://s3-eu-west-1.amazonaws.com/s3-reverb-hosting-prod/assets/logo.svg");
    background-repeat: no-repeat;
    background-position: center;
    min-height: 60px;
    height: 110px;
  }

  .mail-image {
    background: url("https://s3-eu-west-1.amazonaws.com/s3-reverb-hosting-prod/assets/assets-email-success-01.png");
    height: 320px;
    background-position: center;
    background-size: contain;
    background-repeat: no-repeat;
  }

  .freind-list {
    text-align: left;
    display: none;
    margin-top: 9px;
  }

  .chip {
    margin-top: 6px;
    display: inline-block;
    font-size: 0.8em;
    padding-left: 6px;
    border-radius: 30px;
    width: 100%;
  }
  .chip .text-content {
    white-space: nowrap;
    overflow: hidden;
    max-width: 60%;
    text-overflow: ellipsis;
    display: inline-block;
    font-style: italic;
  }
  .chip .remove-icon {
    float: right;
    display: inline-block;
    opacity: 0.8;
  }
',
  'var textInput = function() {};
  freindCount = 1;
  var freindArray = [];
  var emailUrl = ''<%= backUrl %>/api/v1/sharedurls/shareEmail''
  
  window.resizeTo(360, 700)
  
  textInput.prototype.nameInput = $(".name-input");
  
  textInput.prototype.emailInput = $(".email-input");
  
  textInput.prototype.addFriend = function() {
    $(".freind-list").show();
    var name = this.nameInput.val();
    var email = this.emailInput.val();
    if (!this.checkValidation()){
      //show errors
      return
    }
    foo.updateFriendList({ name: name, email: email });
    this.emailInput.val("");
    this.nameInput.val("");
    $(".add-friend").hide();
  };
  
  textInput.prototype.removeFriend = function(i) {
    freindArray.splice(i, 1);
    this.updateFriendList();
  };
  
  textInput.prototype.checkValidation = function() {
    function isValidEmailAddress(emailAddress) {
      var pattern = new RegExp(
        /^(("[\\w-+\\s]+")|([\\w-+]+(\\?:\\.[\\w-+]+)*)|("[\\w-+\\s]+")([\\w-+]+(\\?:\\.[\\w-+]+)*))(@((\\?:[\\w-+]+\\.)*\\w[\\w-+]{0,66})\\.([a-z]{2,6}(\\?:\\.[a-z]{2})\\?)$)|(@\\[\\?((25[0-5]\\.|2[0-4][\\d]\\.|1[\\d]{2}\\.|[\\d]{1,2}\\.))((25[0-5]|2[0-4][\\d]|1[\\d]{2}|[\\d]{1,2})\\.){2}(25[0-5]|2[0-4][\\d]|1[\\d]{2}|[\\d]{1,2})\\]\\?$)/i
      );
      return pattern.test(emailAddress);
    }
  
    if (
      isValidEmailAddress(this.emailInput.val())
    ) {
      return true;
    }
    return false;
  };
  
  textInput.prototype.showAddFriend = function() {
    $(".add-friend").show();
  };
  textInput.prototype.updateFriendList = function(listPerson) {
    if (listPerson) {
      freindArray.push(listPerson);
    }
    $(".freind-list").empty();
    for (i = 0; i < freindArray.length; i++) {
      $(".freind-list").append(\`
        <div data-freind-number=\${i} class=''chip''>
          <span class=''text-content''>
            <span class=''name''>
              \${freindArray[i].name}:
            </span>
            <span class=''email''>
              \${freindArray[i].email}
            </span>
          </span>
          <i onclick="foo.removeFriend(\${i})" class="remove-icon fas fa-times-circle"></i>
        </div>
      \`);
    }
  };
  
  
  
  var foo = new textInput();
  
  $(".add-friend").click(function() {
    foo.addFriend();
  });
  
  $(".email-input").keypress(function(e) {
    var keycode = e.keyCode \\? e.keyCode : e.which;
    if (keycode == "13" && foo.checkValidation()) {
      foo.addFriend();
    }
  });
  
  $(".email-input").keyup(function(e) {
    if (foo.checkValidation()) {
      return foo.showAddFriend();
    } else {
      $(".add-friend").hide();
    }
  });
  
  $(".add-friend").hide();
  
  $(".cta").click(function(){
      if (grecaptcha.getResponse() === '''') {
        alert(''Please check the recaptcha'');
        return;
      }
      foo.addFriend();
      if(foo.checkValidation()|| (foo.emailInput.val() == "" && freindArray.length >= 1)){
        $.ajax({
        type:"POST",
        url:emailUrl,
        dataType: ''json'',
        data:JSON.stringify({ 
          emails: freindArray.map(function(x){return x.email}),
          sharingLink: "<%= sharingUrl %>",
          campaignVersionId: "<%= campaignVersionId %>",
          sharerFirstname: "<%= sharerFirstname %>",
          message: $(''#message'').val(),
          "g-recaptcha-response": grecaptcha.getResponse()
        }),
        contentType: "application/json; charset=utf-8",
        success: function(data){
          $(''#thank-you'').removeClass(''hidden'')
          setTimeout(function(){ window.close() }, 2000);
          $(''.submission'').addClass(''hidden'') 
        }
      }); 
     }else{
         foo.emailInput[0].setCustomValidity(''Invalid email'')
         foo.emailInput[0].reportValidity();
     }
  })',	
  '<div class=''submission wrapper''>
    <div class=''logo''></div>
    <h2>Almost Done!</h2>
    <h1>Invite your friends</h1>
    <div class=''freind-list''>
    </div>
    <div class=''freinds''>
    <div data-freind-no=''1'' class=''freind-inputs''>
      <input placeholder=''name'' class=''name-input''> </input>
      <input placeholder=''email@example.com''  pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,3}$" class=''email-input''></input>
      <div class=''add-friend''>+ Add another friend</div>
    </div>
  </div>
  
    <textarea  id=''message'' placeholder=''I just got given a 15% off voucher for nobodies child and I thought of you.''><%= placeholderMessage %></textarea>
    <div class=''capatcha-wrapper''>
        <div class="g-recaptcha" data-sitekey="<%= dataSiteKey %>"></div>
    </div>
    <div class=''button cta''>SEND IT</div>
  </div>
  
  <div id=''thank-you'' class=''thank-you wrapper hidden''>
    <div class=''mail-image''>
    </div>
    <div class="sub-header">
      Thank you!
    </div>
    <div class="sub-text">
      Your email has been sent
    </div>
  </div>
  
  
    <script
    src="https://code.jquery.com/jquery-3.3.1.min.js"
    integrity="sha256-FgpCb/KJQlLNfOu91ta32o/NMZxltwRo8QtmkMRdAu8="
    crossorigin="anonymous"></script>',
    'https://s3-eu-west-1.amazonaws.com/s3-reverb-images/cae294/cae2945b55bcd222c310be534bf686c1.png');
  
  `;
  return knex.schema.raw(query);
}

export function down(knex) {
  var query = `
  `;
  return knex.schema.raw(query);
}