const { districtCityMap } = require(`../../../data/districtCities`)

// --- NORMALIZER ---
const normalizeCityName = (name) => {
   return name
     .normalize("NFD")                     // separate accents (é → e +  ́)
     .replace(/[\u0300-\u036f]/g, "")      // remove diacritics
     .replace(/['’`]/g, "'")               // unify apostrophes
     .replace(/-/g, " ")                   // treat hyphens as spaces
     .replace(/\s+/g, " ")                 // collapse multiple spaces
     .trim()
     .toLowerCase()                        // case-insensitive
}

const ontarioCities = [
   `Toronto`,
   `Kingston`,
]


const normalizedQuebecCities = []

// --- BUILD NORMALIZED MAP ---
const normalizedCityToDistrict = {}
for (const [district, cities] of Object.entries(districtCityMap)) {
   for (const city of cities) {
      const normalizedCity = normalizeCityName(city)
      normalizedCityToDistrict[normalizedCity] = district
      normalizedQuebecCities.push(normalizedCity)
   }
}

// --- AUTOCOMPLETE FUNCTION ---
const addressAutocomplete = ({city, district=null, province, country}) => {

   city.change(function() {
      const rawCity = city.val()
      if(!rawCity) return // no City - nothing to infer

      const normalizedCity = normalizeCityName(rawCity)

      // SET DISTRICT
      if(district) {
         if(district.val() === ``) { // if a district field exists and is empty - try to set it
            const foundDistrict = normalizedCityToDistrict[normalizedCity]
            if(foundDistrict) district.val(foundDistrict)
         }
         // trigger the following checks whether change made or not
         district.trigger(`change`)
      }

      // SET PROVINCE
      switch (true) {
         case normalizedQuebecCities.includes(normalizedCity): province.val(`QC`).trigger(`change`); break;
         case ontarioCities.includes(normalizedCity): province.val(`ON`).trigger(`change`); break;
      
         default: break;
      }
      
   })

   if(district) district.change(function() {
      if(district.val() === ``) return

      // SET PROVINCE
      if( province.val() === `` ) province.val(`QC`)

      // trigger the following checks whether change made or not
      province.trigger(`change`)
   })

   province.change(function() {
      if(province.val() === ``) return
      
      // SET COUNTRY
      if( country.val() === `` ) country.val(`Canada`)

      // trigger the following checks whether change made or not
      country.trigger(`change`)
   })
}

module.exports = {
   addressAutocomplete,
   districtCityMap,
}