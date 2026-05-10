const mysql             = require(`mysql2`)
const {
   MYSQL_HOST,
   MYSQL_USER,
   MYSQL_PASSWORD,
   MYSQL_DATABASE,
}                       = require(`../config`)

const mainPool = mysql.createPool({
   host: MYSQL_HOST,
   user: MYSQL_USER,
   password: MYSQL_PASSWORD,
   database: MYSQL_DATABASE,
   decimalNumbers: true, // converts DECIMAL/NUMERIC to JS numbers
})

module.exports = {
   mainPool,
}