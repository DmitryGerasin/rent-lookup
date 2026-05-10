multiple -select 
   - source: https://unpkg.com/multiple-select@1.5.2/dist/multiple-select.min.js
   - I replaced some strings with french transalation becasue it was faster than figuring out how to do it properly
   - Stuff replaced: 
   ```javascript
      fe = {
         formatSelectAll: function() {
            return "[Sélectionner tout]"
         },
         formatAllSelected: function() {
            return "Tout séléctionné"
         },
         formatCountSelected: function(t, e) {
            return t + " de " + e + " séléctionné"
         },
         formatNoMatchesFound: function() {
            return "Aucune correspondance trouvée"
         }
      };
```

Vendor JS in `public/js/vendors/` is populated by `npm install` → `scripts/sync-vendor-assets.js` (postinstall). Do not edit those copies by hand.

@TODO fix this at some point.
