// example ruleSet for lastRuleSetToReturnTrue function. In the example style4 should return true
// let testRuleset =[{
//   rules: [],
//   templateName:"control"
// },{
//   rules: [functionThatReturnsTrue,functionThatReturnsTrue],
//   templateName:"lightbox_style2"
// },{
//   rules: [functionThatReturnsTrue,functionThatReturnsTrue],
//   templateName:"lightbox_style3"
// },{
//   rules: [functionThatReturnsTrue,functionThatReturnsTrue],
//   templateName:"lightbox_style4"
// },{
//   rules: [functionThatReturnsTrue,functionThatReturnsFalse],
//   templateName:"lightbox_style5"
// },];


function resolveFractionToBoolean(numerator,denominator = 100){ //default to 100
  const randNumber = Math.floor(Math.random() * denominator) + 1;
  if (randNumber <= numerator){
    return true;
  }
  return false;
}

function returnObjectByExposureValue(objectsArray){
  const map1 = objectsArray.map(obj => obj.exposure).filter((x) => typeof x !== 'undefined'); //map and filter items without exposure
  const sum = map1.reduce((sum, x) => sum + x);
  const randNumber = Math.floor(Math.random() * sum) + 1;
  let accumulator = 0;

  for (let i = 0; i < map1.length; i++) {
    accumulator = map1[i] + accumulator;
    if (randNumber <= accumulator){
      return objectsArray[i];
    }
  }
}

function lastRuleSetToReturnTrue(testRuleset,attr){
  const map1 = testRuleset.map(x => x.rules);

  for(var i = map1.length; i--;){
    if (map1[i].every((fn)=>fn(attr))){ //runs each function with attributes.
      return testRuleset[i].templateName;
    }
  }
}

module.exports = {
  resolveFractionToBoolean:resolveFractionToBoolean,
  returnObjectByExposureValue: returnObjectByExposureValue,
  determineFile: lastRuleSetToReturnTrue
};