// global.$                = require(`../external/jquery.min`)

const formatAsCurrency = function () {
   const string = $(this).text()
   let item = parseFloat(string).toFixed(2)
   
   let num = Number(item).toLocaleString(`en`, {
      style: `decimal`,
      minimumFractionDigits: 2,
      // currency: "USD",
   })

   if (num === `-0.00`) {
      num = num.replace(`-`, ``)
      item = 0
      $(this).addClass(`enMoney`)
   }

   if (Number(item) < 0) {
      num = num.replace(`-`, ``)
      $(this).addClass(`negMoney`)
   } else {
      $(this).addClass(`enMoney`)
   }

   $(this).text(num)
}
$(`.currency`).each(formatAsCurrency)

module.exports = {
   formatAsCurrency,
}