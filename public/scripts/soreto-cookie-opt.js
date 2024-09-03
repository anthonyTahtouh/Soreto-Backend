// cookie options
var _cookieOptions = {
  cookies_optional : false,
  cookies_functional : false,
  cookies_targeting : false
};

/**
 * get cookie value by its name
 */
var getCookie = function(name) {

  try {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2];
  } catch (error) {
    return null;
  }
};

/**
 * Was the cookie accepted
 */
var cookieAccepted = function () {
  return _cookieOptions.cookies_functional || _cookieOptions.cookies_optional || _cookieOptions.cookies_targeting;
};

/**
 * Read data from cookie and manage DOM items visibility
 */
let refresh = function () {

  // read cookies
  let cookieOpt = getCookie('soreto_cookie_opt');

  let footerDiv = undefined;

  try {
    footerDiv = document.getElementsByClassName('soc_footer_selector')[0];
  } catch (error) {
    console.error('Error trying to retrieve DIV by class name "soc_footer_selector" maybe it is not implemented in the HTML document');
  }

  // is there any opt cookie?
  if(cookieOpt){

    try {

      // decode cookie from Base64
      _cookieOptions = JSON.parse(atob(cookieOpt));

      // was it accepted?
      if(cookieAccepted()){
        // hide opt cookie footer
        footerDiv.style.visibility = 'hidden';
      }else{
        // show opt cookie footer
        footerDiv.style.visibility = 'visible';
      }

    } catch (error) {
      console.error('Error trying to parse opt cookies');
    }

  }else{

    // no opt cookie found, set footer DIV visible
    footerDiv.style.visibility = 'visible';
  }

};

/**
 * Bind Dom
 */
let bind = function () {

  // refresh after all
  refresh();

  // get all opt items
  let optItems = document.getElementsByClassName('soc_opt');

  var selectOption = function (e) {

    clearStyles(e.target.attributes.name.value);

    e.target.classList.add('soc_selected');

    let contentDiv = document.getElementsByName(e.target.attributes.name.value + '_content')[0];

    contentDiv.setAttribute('style', 'display:inline;');
  };

  var clearStyles = function (execptItemName) {

    Array.from(optItems).map(function (item) {

      if(item.attributes.name.value != execptItemName){
        item.classList.remove('soc_selected');
      }

    });

    Array.from(document.getElementsByClassName('soc_opt_content'))
      .map(function (item) {
        item.setAttribute('style', 'display:none;');
      });
  };

  Array.from(optItems)
    .map(function (item) {
      item.addEventListener('click', selectOption);

      if (item.attributes.name.value == 'menu_1') {
        item.click();
      }
    });

  var cookieCheckInputs = document.getElementsByClassName('soreto_cookie_option');
  Array.from(cookieCheckInputs, function (item) {
    item.addEventListener('change', function (e) {

      _cookieOptions[e.target.attributes.name.value] = e.target.checked;

    });
  });

  document.getElementById('soc_confirm_btn').addEventListener('click', function () {

    _cookieOptions.cookies_optional = true;
    document.cookie = 'soreto_cookie_opt = ' + btoa(JSON.stringify(_cookieOptions)) + '; path=/';
    window.location.href ='#';

    refresh();
  });

  Array.from(document.getElementsByName('soc_accept_btn'))
    .map(function (item) {
      item.addEventListener('click', function () {

        _cookieOptions = {
          cookies_optional : true
        };

        document.cookie = 'soreto_cookie_opt = ' + btoa(JSON.stringify(_cookieOptions)) + '; path=/';
        window.location.href ='#';
        refresh();

      });
    });
};

/**
 * Windows open interception
 */
window.open = function (open) {
  return function (url, name, features) {

    if(!(_cookieOptions.cookies_functional || _cookieOptions.cookies_optional || _cookieOptions.cookies_targeting)){

      if(url.includes('showcode')){
        url = '#accept-needed';
        name = '_self';
      }else{
        return;
      }
    }

    name = name || 'default_window_name';
    return open.call(window, url, name, features);
  };

}(window.open);

window.onload = function () {

  var sourceHtmlUri = document.getElementById('soreto-cookie-opt').getAttribute('sourceHtml');

  if(!sourceHtmlUri){
    console.error('No "sourceHtml" attribute defined for the opt cookie script');
    return;
  }

  // add external html
  fetch(sourceHtmlUri)
    .then(response => {
      return response.text();
    })
    .then(data => {

      var newEl = document.createElement('div');
      newEl.innerHTML = data;
      document.body.appendChild(newEl);

      bind();
    });

};