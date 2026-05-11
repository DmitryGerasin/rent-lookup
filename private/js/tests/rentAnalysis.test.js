jest.mock(`../components/rest`, () => ({
   GET: jest.fn(),
}))
jest.mock(`../components/errorHandling`, () => ({
   displayErrors: jest.fn(),
   clearErrorMessages: jest.fn(),
}))
jest.mock(`../components/mainNavBar`, () => ({}))
jest.mock(`../external/initializeBootstrapTooltips`, () => ({}))

function createSearchBarMock() {
   const handlers = {}
   const dataStore = {}
   const mock = {
      _val: ``,
      _trigger: jest.fn(),
      0: { tagName: `INPUT` },
      val(value) {
         if (value === undefined) return this._val
         this._val = value
         return this
      },
      data(key, value) {
         if (value === undefined) return dataStore[key]
         dataStore[key] = value
         return this
      },
      on(event, handler) {
         handlers[event] = handler
         return this
      },
      trigger(event) {
         this._trigger(event)
         return this
      },
      emit(event, payload) {
         if (handlers[event]) handlers[event](payload)
      },
   }
   return mock
}

function createOutputTableMock() {
   const firstLinkClick = jest.fn()
   return {
      0: { rows: { length: 0 } },
      find: jest.fn(() => ({
         first: jest.fn(() => [{ click: firstLinkClick }]),
      })),
      text: jest.fn(),
      empty: jest.fn(() => ({ append: jest.fn() })),
      _firstLinkClick: firstLinkClick,
   }
}

describe(`rentAnalysis.js`, () => {
   let $searchBar
   let $outputTable
   let keyupListener
   let GET
   let displayErrors
   let consoleLogSpy

   beforeEach(() => {
      jest.resetModules()
      jest.clearAllMocks()
      jest.useFakeTimers()
      consoleLogSpy = jest.spyOn(console, `log`).mockImplementation(() => {})

      $searchBar = createSearchBarMock()
      $outputTable = createOutputTableMock()
      keyupListener = null

      global.window = {
         addEventListener: jest.fn((event, cb) => {
            if (event === `keyup`) keyupListener = cb
         }),
      }
      global.document = { activeElement: null }
      global.AbortController = global.AbortController || AbortController

      global.$ = jest.fn((selector) => {
         if (selector === `#searchField`) return $searchBar
         if (selector === `#outputTable`) return $outputTable
         return {
            addClass: jest.fn().mockReturnThis(),
            text: jest.fn().mockReturnThis(),
            append: jest.fn().mockReturnThis(),
            attr: jest.fn().mockReturnThis(),
         }
      })

      GET = require(`../components/rest`).GET
      displayErrors = require(`../components/errorHandling`).displayErrors
      GET.mockImplementation(() => Promise.resolve({ meta: { timeStamp: Date.now(), searchTerm: `` }, resultArray: [] }))
      require(`../rentAnalysis`)
   })

   afterEach(() => {
      jest.useRealTimers()
      consoleLogSpy.mockRestore()
   })

   test(`uses 250ms debounce for 2 chars or less`, () => {
      $searchBar.val(`ab`)
      $searchBar.emit(`keyup`, { key: `a` })

      jest.advanceTimersByTime(249)
      expect(GET).not.toHaveBeenCalled()

      jest.advanceTimersByTime(1)
      expect(GET).toHaveBeenCalledTimes(1)
   })

   test(`uses 150ms debounce for 3 chars or more`, () => {
      $searchBar.val(`abc`)
      $searchBar.emit(`keyup`, { key: `c` })

      jest.advanceTimersByTime(149)
      expect(GET).not.toHaveBeenCalled()

      jest.advanceTimersByTime(1)
      expect(GET).toHaveBeenCalledTimes(1)
   })

   test(`Enter triggers immediate search and clears pending debounce`, () => {
      $searchBar.val(`abcd`)
      $searchBar.emit(`keyup`, { key: `d` }) // schedules timer
      $searchBar.emit(`keyup`, { key: `Enter` }) // immediate lookup

      expect(GET).toHaveBeenCalledTimes(1)
      jest.advanceTimersByTime(300)
      expect(GET).toHaveBeenCalledTimes(1)
   })

   test(`aborts prior in-flight search when a new one starts`, () => {
      GET.mockImplementation(() => new Promise(() => {}))

      $searchBar.val(`abc`)
      $searchBar.emit(`keyup`, { key: `c` })
      jest.advanceTimersByTime(150)

      $searchBar.val(`abcd`)
      $searchBar.emit(`keyup`, { key: `d` })
      jest.advanceTimersByTime(150)

      const firstSignal = GET.mock.calls[0][1].signal
      const secondSignal = GET.mock.calls[1][1].signal
      expect(firstSignal.aborted).toBe(true)
      expect(secondSignal.aborted).toBe(false)
   })

   test(`displays errors for non-abort GET failures`, async () => {
      GET.mockRejectedValueOnce({ type: `CUSTOM`, message: `oops` })
      $searchBar.val(`abc`)
      $searchBar.emit(`keyup`, { key: `c` })
      jest.advanceTimersByTime(150)
      await Promise.resolve()
      await Promise.resolve()

      expect(displayErrors).toHaveBeenCalledWith({ type: `CUSTOM`, message: `oops` })
   })

   test(`slash focuses search field when not active`, () => {
      global.document.activeElement = {}
      keyupListener({ key: `/` })
      expect($searchBar._trigger).toHaveBeenCalledWith(`focus`)
   })

   test(`no results message includes last searched text`, async () => {
      GET.mockReset()
      GET.mockResolvedValueOnce({
         meta: { searchTerm: `abc<script>`, timeStamp: Number.MAX_SAFE_INTEGER },
         resultArray: [],
      })
      $searchBar.val(`abc<script>`)
      $searchBar.emit(`keyup`, { key: `c` })
      jest.advanceTimersByTime(150)
      await Promise.resolve()

      expect($outputTable.text).toHaveBeenCalledWith(`Aucun résultat de recherche pour: "abc<script>".`)
   })

   test(`empty search with no results clears table without message`, async () => {
      GET.mockReset()
      GET.mockResolvedValueOnce({
         meta: { searchTerm: ``, timeStamp: Number.MAX_SAFE_INTEGER },
         resultArray: [],
      })
      $searchBar.data(`previous-search-term`, `abc`)
      $searchBar.val(``)
      $searchBar.emit(`keyup`, { key: `Backspace` })
      jest.advanceTimersByTime(250)
      await Promise.resolve()

      expect($outputTable.empty).toHaveBeenCalled()
      expect($outputTable.text).not.toHaveBeenCalledWith(`Aucun résultat de recherche.`)
   })

   test(`Enter clicks first result row when table has rows`, () => {
      $outputTable[0].rows.length = 2
      $searchBar.emit(`keyup`, { key: `Enter` })
      expect($outputTable._firstLinkClick).toHaveBeenCalled()
      expect(GET).not.toHaveBeenCalled()
   })
})
