module.exports = {
  returnReleventAffiliateClickRefQueryKey: function(sharedUrl) {
    switch (true) {
    case /webgains/.test(sharedUrl):
      return '&clickref=';
    case /awin/.test(sharedUrl):
      return '&clickref=';
    case /tradedoubler/.test(sharedUrl):
      return '&epi=';
    // CJ clickRef tag, it must be added on each new CJ link the query string srtentw=CJ
    // CJ does not follow a common pattern for their tracking links.
    // srtentw = Soreto External Network
    case /srtentw=CJ/.test(sharedUrl):
      return '&sid=';
    case /linksynergy/.test(sharedUrl):
      return '&u1=';
    case /t.cfjump.com/.test(sharedUrl):
      return '&UniqueId=';
    case /srtentw=Impact/.test(sharedUrl):
      return '&SharedId=';
    case /srtentw=PepperJam/.test(sharedUrl):
      return '&sid=';
    case /shareasale.com/.test(sharedUrl):
      return '&afftrack=';
    default:
      return false;
    }
  }
};