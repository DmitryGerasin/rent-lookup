const { isDeltaEqual }  = require(`./quillUtil`)
const {
   updateNavPrompt,
}                       = require(`../components/navigationPrompts`)
const { boxVal }        = require(`./checkboxes`)

const nameOrId = (jqueryObject) => {
   // For jQuery objects use name if available, else id. For QuillEditor instances use containerId
   if (jqueryObject && typeof jqueryObject.prop === 'function') {
      return jqueryObject.prop(`name`) || jqueryObject.prop(`id`)
   }
   // QuillEditor instances don't have .prop() but do expose containerId
   if (jqueryObject && typeof jqueryObject.containerId === 'string') {
      return jqueryObject.containerId
   }
   return ''
}

/**
 * @param {domElement} inputField 
 * @param {string|number|boolean} defaultValue 
 * @param {`text`|`checkbox`|`multipleSelect`|`quill`} type - Type of input. Default: `text`.
 * @param {object} trackChangesIn - Object which keeps track of all value changes
 * @param {object} param4 
 * @param {boolean} param4.navPrompt - Whether to prevent leaving page if unsaved changes present
 */
const monitorChanges = (inputField, defaultValue, type=`text`, trackChangesIn, {navPrompt=true}={}) => {
   if(![`text`, `checkbox`, `multipleSelect`, `quill`].includes(type)) alert(`invalid setup`)
   
   function textChange() {
      if( 
         (inputField.val().trim() == defaultValue) || 
         (inputField.val().trim() === `` && defaultValue === null) 
      ) {
         inputField.removeClass(`altered`)
         // 2. Keep `trackChangesIn` up to date
         delete trackChangesIn[nameOrId(inputField)]
      } else {
         inputField.addClass(`altered`)
         // 2. Keep `trackChangesIn` up to date
         trackChangesIn[nameOrId(inputField)] = inputField.val().trim()
      }
      if(navPrompt) updateNavPrompt(trackChangesIn)
   }
   function checkboxChange() { // @TODONOW - check if boxVal can be used here
      if( 
         (inputField.is(`:checked`) === defaultValue) || 
         // (!inputField.is(`:checked`) && defaultValue === null) ||
         (inputField[0].indeterminate && defaultValue === null)
      ) {
         inputField.removeClass(`altered`)
         // 2. Keep `trackChangesIn` up to date
         delete trackChangesIn[nameOrId(inputField)]
      } else {
         inputField.addClass(`altered`)
         // 2. Keep `trackChangesIn` up to date
         trackChangesIn[nameOrId(inputField)] = boxVal(inputField)
      }
      if(navPrompt) updateNavPrompt(trackChangesIn)
   }
   function multipleSelectChange() {
      if( 
         (inputField.val().join() == defaultValue.join()) || 
         (inputField.val().length === 0 && defaultValue.length === 0) 
      ) {
         inputField.parent().find(`button`).removeClass(`altered`)
         // 2. Keep `trackChangesIn` up to date
         delete trackChangesIn[nameOrId(inputField)]
      } else {
         inputField.parent().find(`button`).addClass(`altered`)
         // 2. Keep `trackChangesIn` up to date
         trackChangesIn[nameOrId(inputField)] = inputField.val()
      }
      if(navPrompt) updateNavPrompt(trackChangesIn)
   }
   function quillChange() {
      const currentContent = inputField.getContents()
      const editorEl = $(inputField.container).find('.quill-editor')

      if (isDeltaEqual(currentContent, defaultValue)) {
         editorEl.removeClass(`altered`)
         delete trackChangesIn[nameOrId(inputField)]
      } else {
         editorEl.addClass(`altered`)
         trackChangesIn[nameOrId(inputField)] = currentContent
      }

      if(navPrompt) updateNavPrompt(trackChangesIn)
   }

   switch (type) {
      case `text`: // works for both `text` and `select`
         inputField.off(`change.monitorInputs`)
         inputField.on(`change.monitorInputs`, textChange)
         break
      case `checkbox`:
         inputField.off(`change.monitorInputs`)
         inputField.on(`change.monitorInputs`, checkboxChange)
         break
      case `multipleSelect`:
         inputField.off(`change.monitorInputs`)
         inputField.on(`change.monitorInputs`, multipleSelectChange)
         break
      case `quill`:
         inputField.quill.off(`text-change`, quillChange)
         inputField.quill.on(`text-change`, quillChange)
         break
   }
}
/**
 * @param {object} trackChangesIn - Object in which we will keep track of wheich inputs where changed and now have which value.
 * @param {object} saveDefaultsTo - Object to which the provided default values will be saved to for future reference.
 * @param {[[
 * inputField:domElement, 
 * defaultValue:string|number|boolean, 
 * type:`text`|`checkbox`|`multipleSelect`|`quill`
 * ]]} list - List is an array of arrays containing `inputField`, `defaultValue`, and `type`. Default type is `text`.
 * @param {object} param3 
 * @param {boolean} param3.navPrompt - Whether to prevent leaving page if unsaved changes present
 */
const monitorAll = (trackChangesIn, saveDefaultsTo, list, {navPrompt=true}={}) => {
   for (let i = 0; i < list.length; i++) {
      const [inputField, defaultValue, type] = list[i]
      monitorChanges(inputField, defaultValue, type, trackChangesIn, {navPrompt})
      saveDefaultsTo[nameOrId(inputField)] = defaultValue
   }
}

module.exports = {
   monitorChanges,
   monitorAll,
}