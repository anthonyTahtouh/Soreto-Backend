let dataFormatHelper = require('../../../utils/dataFormatHelper');
let moment = require('moment');

class CommissionsByMonthXLSXExporter {

  constructor() {
  }

  async populateWorkbookFromCommissionsByMonth(workbook, commissionsByMonth, currency) {

    let { data, monthsToDisplay } = commissionsByMonth;

    const worksheet = workbook.addWorksheet('Sheet1');

    worksheet.columns = this.getWorksheetColumns(monthsToDisplay, currency);

    let { parsedData, totals } = this.parseData(data, monthsToDisplay, currency);

    worksheet.addRows(parsedData);

    worksheet.addRow(this.getTotalsRow(monthsToDisplay, currency, totals));

    this.setColumnsFormats(worksheet, monthsToDisplay, currency);

    this.setStyle(worksheet);

    return workbook;
  }

  // Create columns and their headers
  getWorksheetColumns(monthsToDisplay, currency) {

    let worksheetColumns = [];

    worksheetColumns.push({header: 'Client', key: 'clientName', width: 20});
    worksheetColumns.push({header: 'Tier', key: 'clientTier', width: 10});
    worksheetColumns.push({header: 'Fee Based', key: 'clientFeeBased', width: 10});

    for (let month_MM_YYYY of monthsToDisplay) {
      worksheetColumns.push({
        header: month_MM_YYYY,
        key: currency === 'OriginalValue' ? `orderCommissionSum_${month_MM_YYYY}` : `orderCommissionSum_${currency}_${month_MM_YYYY}`,
        width: 12
      });
    }

    // Insert a hidden column in the worksheet with the clientCountryCurrencyCode to
    // be used later when formating the values
    if (currency === 'ClientCountryCurrency') {
      worksheetColumns.push({ key: 'clientCountryCurrencyCode', hidden: true });
    }

    return worksheetColumns;
  }

  /**
   * Iterates over the data formatting with 2 decimal points (ex.: 38,2973243 becomes 38.30 )
   */
  parseData(data, monthsToDisplay, currency){
    let totals = {};
    for (let dataItem of data) {
      for (let monthToDisplay of monthsToDisplay) {
        let dataItemKey = currency === 'OriginalValue' ?
          `orderCommissionSum_${monthToDisplay}` :
          `orderCommissionSum_${currency}_${monthToDisplay}`;
        dataItem[dataItemKey] = new Number(dataItem[dataItemKey].toFixed(2)).valueOf();
        totals[dataItemKey] = totals[dataItemKey] || 0;
        totals[dataItemKey] += dataItem[dataItemKey];
      }
    }
    return { parsedData: data, totals};
  }

  getTotalsRow(monthsToDisplay, currency, totals) {
    let totalsRow = [];
    totalsRow.push('Totals:');

    for (let month_MM_YYYY of monthsToDisplay) {
      let totalKey = currency === 'OriginalValue' ?
        `orderCommissionSum_${month_MM_YYYY}` :
        `orderCommissionSum_${currency}_${month_MM_YYYY}`;
      totalsRow.push(totals[totalKey]);
    }

    return totalsRow;
  }

  setColumnsFormats(worksheet, monthsToDisplay, currency) {
    for (let month_MM_YYYY of monthsToDisplay){
      let columnKey = (currency === 'OriginalValue') ?
        `orderCommissionSum_${month_MM_YYYY}` :
        `orderCommissionSum_${currency}_${month_MM_YYYY}`;
      try {
        let column = worksheet.getColumn(columnKey);
        column.eachCell(dataFormatHelper.formatXLSXCurrency(worksheet, currency));
      } catch (error) {
        console.error('column not found');
      }
    }
  }

  setStyle(worksheet) {

    //set header as bold
    worksheet.getRow(1).style =  { font: { bold: true } };

    //set totals row background color as grey
    worksheet.lastRow.fill  = {
      type: 'pattern',
      pattern:'lightGray',
      fgColor:{argb:'e6e6e6'},
      bgColor:{argb:'e6e6e6'}
    };

    //set totals row borders
    worksheet.lastRow.border = {
      top: {style:'thin'},
      left: {style:'thin'},
      bottom: {style:'thin'},
      right: {style:'thin'}
    };

  }

  createFileName(dateLte, dateGte) {
    let startMonth = moment(dateGte).format('YYYY-MM');
    let endMonth = moment(dateLte).format('YYYY-MM');
    return `Commissions_By_Month_${startMonth}_${endMonth}.xlsx`;
  }

}

const commissionsByMonthXLSXExporter = new CommissionsByMonthXLSXExporter();

module.exports = commissionsByMonthXLSXExporter;