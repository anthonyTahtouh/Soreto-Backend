let _payload = null;
let _nullOrEmptyProps = [];
let _emptySpaceProps = [];
let _invalidUrls = [];
let utilities = require('../common/utility');

/**
 * Charge the payload to be validated
 * @param {*} payload
 * @returns
 */
const payload = (payload) => {

  _payload = payload;
  _nullOrEmptyProps = [];
  _emptySpaceProps = [];
  _invalidUrls = [];

  return interfaceMethods;
};

/**
 * Validate the properties that cannot be null or empty
 * @param {*} props
 * @returns
 */
const cantBeNullOrEmpty = (props) => {

  for(let prop of props){
    if(_payload[prop] === undefined || _payload[prop] === ''){
      _nullOrEmptyProps.push(prop);
    }
  }

  return interfaceMethods;
};

const cantHaveEmptySpace = (props) => {

  for(let prop of props){
    if(!_payload[prop] || _payload[prop].includes(' ')){
      _emptySpaceProps.push(prop);
    }
  }

  return interfaceMethods;
};

const valid = () => {

  if ((_nullOrEmptyProps && _nullOrEmptyProps.length > 0) || (_invalidUrls && _invalidUrls.length > 0)) {
    return false;
  }

  return true;
};

const message = () => {

  let messages = [];

  if(_nullOrEmptyProps && _nullOrEmptyProps.length > 0){
    messages.push(`The following properties can't be null or empty: ${_nullOrEmptyProps.join(',')}.`);
  }

  if(_emptySpaceProps && _emptySpaceProps.length > 0){
    messages.push(`The following properties can't have empty spaces: ${_emptySpaceProps.join(',')}.`);
  }

  if(_invalidUrls && _invalidUrls.length > 0){
    messages.push(`The following properties are invalid urls: ${_invalidUrls.join(',')}.`);
  }

  return messages.length > 0 ? messages.join(',') : null;
};

const errorProps = () => {

  let errorProps = {};

  if(_nullOrEmptyProps && _nullOrEmptyProps.length > 0){
    errorProps.nullOrEmpty = _nullOrEmptyProps;
  }

  if(_emptySpaceProps && _emptySpaceProps.length > 0){
    errorProps.emptySpaces = _emptySpaceProps;
  }

  if(_invalidUrls && _invalidUrls.length > 0){
    errorProps.invalidUrls = _invalidUrls;
  }

  return errorProps;
};

const result = () => {

  return {
    message: message(),
    errorProps: errorProps()
  };
};

const isValidUrl = (props) => {

  for(let prop of props){
    if(_payload[prop] && !utilities.isValidUrl(_payload[prop])){
      _invalidUrls.push(prop);
    }
  }

  return interfaceMethods;
};

const interfaceMethods = { payload, valid, cantBeNullOrEmpty, cantHaveEmptySpace, result, isValidUrl };

module.exports = interfaceMethods;