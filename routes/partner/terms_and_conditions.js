const express = require('express');
const router = express.Router();

router.route('/terms_and_conditions')
  .get(function(req, res){

    // if no url defined go to Soreto terms and conditions
    if(!req.query.url){
      return res.redirect('https://soreto.com/terms-and-conditions');
    }

    return res.render('generic_terms_and_conditions', {url : req.query.url, title : req.query.title} );
  });

router.route('/ncp_terms_and_conditions')
  .get(function(req, res){
    return res.render('third_party_pages/ncp_terms_and_conditions');
  });

router.route('/case_luggage_terms_and_conditions')
  .get(function(req, res){
    return res.render('third_party_pages/case_luggage_t_c');
  });

router.route('/card_factory_terms_and_conditions')
  .get(function(req, res){
    return res.render('third_party_pages/card_factory_t_c');
  });



module.exports = router;