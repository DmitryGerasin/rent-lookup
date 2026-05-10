const { mainPool }      = require('../connections')
const promisePool       = mainPool.promise()

/**
 * Build a `WHERE …` SQL suffix for concatenation after a fixed `SELECT … FROM …` (or subquery).
 *
 * **Use when** you want optional filters: append the return value to your query string; pass
 * `showAll: true` to apply no filter. Used across `db/queries` list/search helpers.
 *
 * **Semantics**
 * - Returns `''` if `searchParams` is missing, `showAll` is true, there are no keys, or
 *   `operator` / `junction` are not in the allowlists (invalid operator/junction ⇒ **no `WHERE`**—silent).
 * - Otherwise returns a fragment starting with ` WHERE`, predicates joined by `junction`.
 *
 * **Per-value behavior**
 * - `null` or `'IS NULL'` → `column IS NULL`
 * - `'IS NOT NULL'` → `column IS NOT NULL`
 * - `'*'` → `column LIKE '%'`
 * - Else → `column <operator> <escaped value>` (`mysql` pool `escape` on the value)
 *
 * **Safety:** 
 * - Values are escaped. 
 * - **Object keys are inserted as raw SQL identifiers** (column/table
 * names)—they must be fixed strings from your code, never user-controlled, or you risk SQL injection.
 *
 * @param {Object|null|undefined} searchParams - Keys = column (or qualified) names; values as above.
 * @param {boolean} [showAll] - If true, returns `''`.
 * @param {string} [operator='='] - Must be one of: `=`, `>`, `<`, `<=`, `>=`, `<>`, `!=`, `LIKE`.
 * @param {string} [junction='AND'] - `AND` or `OR`.
 * @returns {string} Empty string, or ` WHERE …` clause.
 */
const sqlStringAddition = (searchParams, showAll, operator = '=', junction = 'AND') => {
   if(!searchParams || Object.keys(searchParams).length === 0 ||showAll) return ``

   let sqlString = ``
   const allowedOperators = ['=', '>', '<', '<=', '>=', '<>', '!=', 'LIKE']
   const allowedJunctions = ['AND', 'OR']

   if (allowedOperators.includes(operator) && allowedJunctions.includes(junction)) { 
      sqlString += ` WHERE`
      let i = Object.keys(searchParams).length

      for (let [key, value] of Object.entries(searchParams)) {
         if (value == 'IS NULL' || value == null)  { sqlString += ` ${key} IS NULL`
         } else if(value == 'IS NOT NULL')         { sqlString += ` ${key} IS NOT NULL`
         } else if(value == '*')                   { sqlString += ` ${key} LIKE '%'`
         } else                                    { sqlString += ` ${key} ${operator} ${promisePool.escape(value)}`
         }
         i--
         if (i > 0) { sqlString += ` ${junction}` }
      }
   }

   return sqlString
}

module.exports = sqlStringAddition