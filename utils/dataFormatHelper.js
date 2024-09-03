module.exports = {
  formatXLSXCurrency: function (worksheet, currency) {

    function getCurrencySignFromClientCountryCurrencyCode(currencyCode) {
      let currencySign = '';
      switch(currencyCode){
      case 'GBP':
        currencySign = '£';
        break;
      case 'USD':
        currencySign = '$';
        break;
      case 'EUR':
        currencySign = '€';
        break;
      case 'AUD':
        currencySign = '$';
        break;
      case 'CAD':
        currencySign = '$';
        break;
      case 'HKD':
        currencySign = 'HK$';
        break;
      case 'SGD':
        currencySign = '$';
        break;
      case 'NZD':
        currencySign = '$';
        break;
      case 'RUB':
        currencySign = '₽';
        break;
      default:
        currencySign = '';
        break;
      }
      return currencySign;
    }

    function getClientCountryNumberFormat(cell, row) {
      // Gets the clientCountryCurrencyCode from the hidden column
      let code = worksheet.getRow(row).getCell(worksheet.getColumn('clientCountryCurrencyCode')._number).value;
      return `"${getCurrencySignFromClientCountryCurrencyCode(code)}"#,##0.00;[Red]"${getCurrencySignFromClientCountryCurrencyCode(code)}"-#,##0.00`;
    }

    return function (cell, row) {
      if(row <= 1) return; //Ignores header
      switch(currency){
      case 'GBP':
        cell.numFmt = '£#,##0.00;[Red]£-#,##0.00';
        break;
      case 'USD':
        cell.numFmt = '$#,##0.00;[Red]$-#,##0.00';
        break;
      case 'EUR':
        cell.numFmt = '€#,##0.00;[Red]€-#,##0.00';
        break;
      case 'ClientCountryCurrency':
        cell.numFmt = getClientCountryNumberFormat(cell, row);
        break;
      default:
        cell.numFmt = '#,##0.00;[Red]-#,##0.00';
      }
    };
  }
};