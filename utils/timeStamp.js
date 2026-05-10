/**
 * @param {Date} [date=new Date()]
 * @returns {string} e.g. `[2026-05-09 14:30:05 +042]`
 */
function timeStamp(date = new Date()) {
   const pad2 = (n) => String(n).padStart(2, '0')
   const pad3 = (n) => String(n).padStart(3, '0')
   const d = {
      yyyy: date.getFullYear(),
      mm: pad2(date.getMonth() + 1),
      dd: pad2(date.getDate()),
      hr: pad2(date.getHours()),
      min: pad2(date.getMinutes()),
      sec: pad2(date.getSeconds()),
      msec: pad3(date.getMilliseconds()),
   }
   return `[${d.yyyy}-${d.mm}-${d.dd} ${d.hr}:${d.min}:${d.sec} +${d.msec}]`
}

module.exports = { timeStamp }
