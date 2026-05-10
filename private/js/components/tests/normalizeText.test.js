const { normalizeText } = require('../normalizeText')

describe('normalizeText', () => {

   describe('basic functionality', () => {
      test('should return lowercase text', () => {
         expect(normalizeText('HELLO WORLD')).toBe('hello world')
         expect(normalizeText('MiXeD cAsE')).toBe('mixed case')
      })

      test('should trim whitespace', () => {
         expect(normalizeText('  hello world  ')).toBe('hello world')
         expect(normalizeText('\t\nhello world\t\n')).toBe('hello world')
      })

      test('should collapse multiple spaces', () => {
         expect(normalizeText('hello    world')).toBe('hello world')
         expect(normalizeText('hello\t\tworld')).toBe('hello world')
         expect(normalizeText('hello\n\nworld')).toBe('hello world')
      })
   })

   describe('diacritic removal', () => {
      test('should remove common diacritics', () => {
         expect(normalizeText('café')).toBe('cafe')
         expect(normalizeText('naïve')).toBe('naive')
         expect(normalizeText('résumé')).toBe('resume')
         expect(normalizeText('piñata')).toBe('pinata')
         expect(normalizeText('jalapeño')).toBe('jalapeno')
      })

      test('should handle French diacritics', () => {
         expect(normalizeText('français')).toBe('francais')
         expect(normalizeText('cœur')).toBe('cœur') // œ is not handled by the diacritic pattern
         expect(normalizeText('déjà')).toBe('deja')
         expect(normalizeText('garçon')).toBe('garcon')
      })

      test('should handle German diacritics', () => {
         expect(normalizeText('Müller')).toBe('muller')
         expect(normalizeText('Größe')).toBe('große') // ß is not handled by the diacritic pattern
         expect(normalizeText('Straße')).toBe('straße') // ß is not handled by the diacritic pattern
      })

      test('should handle Spanish diacritics', () => {
         expect(normalizeText('señor')).toBe('senor')
         expect(normalizeText('niño')).toBe('nino')
         expect(normalizeText('año')).toBe('ano')
      })

      test('should handle Nordic diacritics', () => {
         expect(normalizeText('Björn')).toBe('bjorn')
         expect(normalizeText('Ångström')).toBe('angstrom')
         expect(normalizeText('Øresund')).toBe('øresund') // ø is not handled by the diacritic pattern
      })

      test('should handle complex diacritics', () => {
         expect(normalizeText('Zürich')).toBe('zurich')
         expect(normalizeText('São Paulo')).toBe('sao paulo')
         expect(normalizeText('Malmö')).toBe('malmo')
      })
   })

   describe('apostrophe normalization', () => {
      test('should normalize different apostrophe types', () => {
         expect(normalizeText("don't")).toBe("don't")
         expect(normalizeText('don\'t')).toBe("don't")
         expect(normalizeText('don`t')).toBe("don't") // backtick is now normalized to apostrophe
         expect(normalizeText('don\'t')).toBe("don't")
      })

      test('should handle multiple apostrophes', () => {
         expect(normalizeText("can't won't")).toBe("can't won't")
         expect(normalizeText('isn`t aren`t')).toBe("isn't aren't") // backticks are now normalized
      })
   })

   describe('hyphen handling', () => {
      test('should convert hyphens to spaces', () => {
         expect(normalizeText('hello-world')).toBe('hello world')
         expect(normalizeText('multi-word-phrase')).toBe('multi word phrase')
         expect(normalizeText('self-contained')).toBe('self contained')
      })

      test('should handle multiple hyphens', () => {
         expect(normalizeText('well-known-author')).toBe('well known author')
         expect(normalizeText('state-of-the-art')).toBe('state of the art')
      })
   })

   describe('combined transformations', () => {
      test('should handle complex text with multiple transformations', () => {
         expect(normalizeText('  Café-Résumé  ')).toBe('cafe resume')
         expect(normalizeText('Müller\'s Café-Bar')).toBe("muller's cafe bar")
         expect(normalizeText('  naïve   piñata  ')).toBe('naive pinata')
      })

      test('should handle mixed punctuation and diacritics', () => {
         expect(normalizeText('café-au-lait')).toBe('cafe au lait')
         expect(normalizeText('crème-brûlée')).toBe('creme brulee')
         expect(normalizeText('jalapeño-pepper')).toBe('jalapeno pepper')
      })
   })

   describe('edge cases', () => {
      test('should handle empty string', () => {
         expect(normalizeText('')).toBe('')
      })

      test('should handle string with only spaces', () => {
         expect(normalizeText('   ')).toBe('')
         expect(normalizeText('\t\n')).toBe('')
      })

      test('should handle string with only diacritics', () => {
         expect(normalizeText('éèêë')).toBe('eeee')
         expect(normalizeText('àáâãäå')).toBe('aaaaaa')
      })

      test('should handle string with only punctuation', () => {
         expect(normalizeText("'-`")).toBe("' '") // backticks are converted to apostrophes
         expect(normalizeText('---')).toBe('')
      })

      test('should handle numbers and special characters', () => {
         expect(normalizeText('test123')).toBe('test123')
         expect(normalizeText('test@email.com')).toBe('test@email.com')
         expect(normalizeText('$100')).toBe('$100')
      })
   })

   describe('Unicode support', () => {
      test('should handle various Unicode diacritics', () => {
         expect(normalizeText('āēīōū')).toBe('aeiou')
         expect(normalizeText('ăĕĭŏŭ')).toBe('aeiou')
         expect(normalizeText('âêîôû')).toBe('aeiou')
         expect(normalizeText('äëïöü')).toBe('aeiou')
      })

      test('should handle combining diacritical marks', () => {
         expect(normalizeText('a\u0300')).toBe('a') // à
         expect(normalizeText('e\u0301')).toBe('e') // é
         expect(normalizeText('i\u0302')).toBe('i') // î
         expect(normalizeText('o\u0303')).toBe('o') // õ
         expect(normalizeText('u\u0308')).toBe('u') // ü
      })
   })

   describe('real-world examples', () => {
      test('should handle names with diacritics', () => {
         expect(normalizeText('José María')).toBe('jose maria')
         expect(normalizeText('François')).toBe('francois')
         expect(normalizeText('Björn')).toBe('bjorn')
         expect(normalizeText('Müller')).toBe('muller')
      })

      test('should handle place names', () => {
         expect(normalizeText('São Paulo')).toBe('sao paulo')
         expect(normalizeText('Zürich')).toBe('zurich')
         expect(normalizeText('Malmö')).toBe('malmo')
         expect(normalizeText('Ångström')).toBe('angstrom')
      })

      test('should handle compound words', () => {
         expect(normalizeText('café-au-lait')).toBe('cafe au lait')
         expect(normalizeText('crème-brûlée')).toBe('creme brulee')
         expect(normalizeText('piña-colada')).toBe('pina colada')
      })
   })

   describe('Unicode property escape fallback', () => {
      test('should fallback to manual diacritic pattern when Unicode properties are not supported', () => {
         // Mock environment without Unicode property escapes support
         const origRegExp = global.RegExp
         global.RegExp = function (pattern, flags) {
            if (pattern.includes("\\p{Diacritic}")) {
               throw new SyntaxError("Invalid regular expression")
            }
            return new origRegExp(pattern, flags)
         }

         try {
            // Re-require the module to test the fallback behavior
            delete require.cache[require.resolve('../normalizeText')]
            const { normalizeText: fallbackNormalizeText } = require('../normalizeText')

            // Test that the fallback still works correctly
            expect(fallbackNormalizeText('café')).toBe('cafe')
            expect(fallbackNormalizeText('naïve')).toBe('naive')
            expect(fallbackNormalizeText('résumé')).toBe('resume')
            expect(fallbackNormalizeText('piñata')).toBe('pinata')
            expect(fallbackNormalizeText('jalapeño')).toBe('jalapeno')
            expect(fallbackNormalizeText('Müller')).toBe('muller')
            expect(fallbackNormalizeText('Zürich')).toBe('zurich')
            expect(fallbackNormalizeText('Malmö')).toBe('malmo')
            expect(fallbackNormalizeText('Ångström')).toBe('angstrom')

            // Test apostrophe normalization still works
            expect(fallbackNormalizeText('don`t')).toBe("don't")
            expect(fallbackNormalizeText('isn`t aren`t')).toBe("isn't aren't")

            // Test hyphen handling still works
            expect(fallbackNormalizeText('café-au-lait')).toBe('cafe au lait')
            expect(fallbackNormalizeText('crème-brûlée')).toBe('creme brulee')

            // Test combined transformations
            expect(fallbackNormalizeText('  Café-Résumé  ')).toBe('cafe resume')
            expect(fallbackNormalizeText('Müller\'s Café-Bar')).toBe("muller's cafe bar")
         } finally {
            // Restore original RegExp
            global.RegExp = origRegExp
            // Clear require cache to restore original module
            delete require.cache[require.resolve('../normalizeText')]
         }
      })
   })
})
