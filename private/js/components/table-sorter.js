$(`th.sortable`).on(`click`, function() {
   var table = $(this).parents('table').eq(0);
   var ths = table.find('tr:gt(0)').toArray().sort(compare($(this).index()));
   this.asc = !this.asc;
   if (!this.asc)
      ths = ths.reverse();
   for (var i = 0; i < ths.length; i++)
      table.append(ths[i]);
});

const hoursAvailable = /\dh\d\d$/

function compare(idx) {
   return function(a, b) {
      const A = tableCell(a, idx)
      const B = tableCell(b, idx)

      if ($.isNumeric(A) && $.isNumeric(B)) {
         // Numeric comparison
         return A - B

      } else if ($(a).children(`td`).eq(idx).children(`.currency`).length > 0) {
         // .currency comparison as numbers rather than strings
         const parsed_A = parseFloat($(a).children(`td`).eq(idx).children(`.currency`).text().replace(/[^0-9.-]+/g, ``))
         const parsed_B = parseFloat($(b).children(`td`).eq(idx).children(`.currency`).text().replace(/[^0-9.-]+/g, ``))
         return parsed_A - parsed_B

      } else if (hoursAvailable.test(A) && hoursAvailable.test(B)) {
         // 8h57 comparison as numbers rather than strings
         const parsed_A = parseInt(A.replace(/(\d+)h(\d\d)/, `$1$2`))
         const parsed_B = parseInt(B.replace(/(\d+)h(\d\d)/, `$1$2`))
         return parsed_A - parsed_B

      } else {
         // String comparison
         return A.toString().localeCompare(B)
      }
   }
}

function tableCell(tr, index) {
   return $(tr).children('td').eq(index).text()
}