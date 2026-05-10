// @TODO: review this file for security issues, check innerHTML usage

class QuillEditor {
   constructor(containerId, options = {}) {
      this.containerId = containerId
      this.$container = $(`#${containerId}`)
      this.quill = null
      this.options = {
         theme: 'snow',
         modules: {
            toolbar: [
               ['bold', 'italic', 'underline'],
               [{ 'list': 'ordered'}, { 'list': 'bullet' }],
               ['link', 'image'],
               ['clean']
            ]
         },
         placeholder: 'Start writing...',
         ...options
      }
      
      this.init()
   }
   
   init() {
      if (!this.$container.length) {
         console.error(`Container with id '${this.containerId}' not found`)
         return
      }
      
      // Create editor container
      const editorHtml = `
         <div class="quill-editor-container">
            <div class="quill-toolbar"></div>
            <div class="quill-editor"></div>
         </div>
      `

      this.$container.html(editorHtml)

      const $editor = this.$container.find('.quill-editor')

      // Initialize Quill
      this.quill = new Quill($editor[0], this.options)
   }
   
   // Get the current Delta content
   getContents() {
      return this.quill ? this.quill.getContents() : null
   }
   
   // Set Delta content
   setContents(delta) {
      if (this.quill && delta) {
         this.quill.setContents(delta)
      }
   }
   
   // Get plain text content
   getText() {
      return this.quill ? this.quill.getText() : ''
   }
   
   // Set plain text content
   setText(text) {
      if (this.quill) {
         this.quill.setText(text)
      }
   }
   
   // Get HTML content
   getHTML() {
      return this.quill ? this.quill.root.innerHTML : ''
   }
   
   /**
    * Set HTML content using the Quill clipboard API
    * @param {string} html - HTML content to set
    * @returns {void}
    */
   setHTML(html) {
      if (!this.quill || !html) return
      const delta = this.quill.clipboard.convert(String(html))
      this.quill.setContents(delta)
   }
   
   // Check if content is empty
   isEmpty() {
      const contents = this.getContents()
      
      return (
         !contents || 
         !contents.ops || 
         contents.ops.length === 0 || 
         (contents.ops.length === 1 && contents.ops[0].insert === '\n')
      )
   }
   
   // Clear the editor
   clear() {
      if (this.quill) {
         this.quill.setText('')
      }
   }
   
   // Enable/disable the editor
   enable(enabled = true) {
      if (this.quill) {
         this.quill.enable(enabled)
      }
   }
   
   // Focus the editor
   focus() {
      if (this.quill) {
         this.quill.focus()
      }
   }
   
   // Destroy the editor
   destroy() {
      if (this.quill) {
         // Remove the editor element
         this.$container.html('')
         this.quill = null
      }
   }
}

module.exports = QuillEditor 
