// global.$                = require(`../external/jquery.min`)
const fileId            = $(`#file-id`).data(`file-id`)


/* * * * * SEARCHBARS * * * * */
/**
 * @TODO instead of skipMatching we need a general filter function
 * 
 * @param {Person[]} data - array of persons
 * @param {JQuery} outputTable - element which will be used to display the search results in
 * @param {Function} onBtnClickFn  
 * * Callback function that will be assigned to each person's 'Add' button
 * * To access the id of each person inside this callback use `$(this).data('id')` and do not use error functions
 * @param {object} param4 - options
 * @param {boolean} param4.skipMattchingFileId - Default: `false`.
 * @param {string} param4.idFieldName 
 * * Provide the name of the id field, ex: `lawyerId`. 
 * * Default: `id`.
 * @param {Function} param4.ifResults
 * * Callback to execute if `data.length !== 0`
 * * Useful if you want to remove 'Create person' buttons or such if any results are displayed.
 * * You can undo the effects in `ifNoResults`
 * @param {Function} param4.ifNoResults
 * * Callback to execute if `data.length === 0`
 * * Useful if you want to display 'Create person' buttons or such if no results are found.
 * * You can undo the effects in `ifResults`
 */
const displayPersons = (
   data,
   outputTable,
   onBtnClickFn,
   {
      skipMattchingFileId=false,
      idFieldName=`id`,
      ifResults=null,
      ifNoResults=null,
   }={}
) => {
   if(data.length === 0) {
      outputTable.html(``)
      if(ifNoResults) ifNoResults()
      return
   }
   let output = ``

   for (let i = 0; i < data.length; i++) {
      if (skipMattchingFileId && data[i].fileID == fileId) continue // Don't show people that are already in this file

      output +=`
         <div class="d-flex flex-row border-bottom">
            <div class="me-2">${data[i][idFieldName]}</div>
            <div class="">${data[i].name.LASTfirst}${data[i].representative ? `<br>[${data[i].representative.name.LASTfirst}]` : ``}</div>
            <div class="ms-auto">
               <button 
                  type="button" 
                  class="btn btn-success px-3 py-1 text-nowrap" 
                  data-id="${data[i][idFieldName]}"
               >
                  Ajouter <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
               </button>
            </div>
         </div>
      `
   }

   outputTable.html(output)
   outputTable.find(`button`).on(`click`, onBtnClickFn)

   if(ifResults) ifResults()
}

/**
 * NOTE: Edit together with views/file/family.ejs
 * @param {*} data 
 * @param {*} outputTable 
 * @param {*} onBtnClickFn 
 * @param {*} param3 
 * @returns 
 */
const displayCouples = (
   data,
   outputTable,
   onBtnClickFn,
   {
      idFieldName=`coupleID`,
      ifResults=null,
      ifNoResults=null,
   }
) => {
   if(data.length === 0) {
      if(ifNoResults) {
         outputTable.html(``)
         ifNoResults()
      }
      return
   }
   let output = ``

   for (let i = 0; i < data.length; i++) {

      output +=`
         <div class="d-flex justify-content-start align-items-center border border-primary my-3">
                  
            <div class="d-flex flex-column flex-grow-1 border-end border-primary">

               <div class="d-flex flex-row">
                  <div class="d-flex flex-row flex-grow-1">
                     <div class="p-2 w-50 fw-bold">${data[i].father}</div>
                     <div class="p-2 w-50 fw-bold">${data[i].mother}</div>
                  </div>
                  <div class="p-2 flex-shrink-0 text-nowrap fw-bold">${data[i].dateOfMarriage || ``}</div>
               </div>
               
               ${(() => {
                  let kidsTable = ``
                  if(data[i].children.length > 0) {
                     kidsTable += `
                        <div class="d-flex flex-row">
                        <table class="table table-light table-sm caption-top w-100">
                           <caption class="px-2">Enfants</caption>
                           <tr>
                              <th class="px-2">Nom</th>
                              <th class="px-2 text-center">Sexe</th>
                              <th class="px-2 text-center">Age</th>
                              <th class="px-2 text-center">Date de naissance</th>
                           </tr>
                     `
                     for (let j = 0; j < data[i].children.length; j++) {
                        const child = data[i].children[j]
                        kidsTable += `
                           <tr>
                              <td class="px-2">${child.firstName} ${child.lastName}</td>
                              <td class="px-2 text-center">${child.gender}</td>
                              <td class="px-2 text-center">${child.age}</td>
                              <td class="px-2 text-center">${child.dateOfBirth || `aucune`}</td>
                           </tr>
                        `
                     }
                     kidsTable += `
                           </table>
                        </div>
                     `
                  }
                  return kidsTable
               })()}

            </div>

            <div class="flex-shrink-0 mx-2">
               <button 
                  type="button" 
                  class="btn btn-success px-3 py-1 text-nowrap" 
                  data-id="${data[i][idFieldName]}"
               >
                  Ajouter <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
               </button>
            </div>

         </div>
      `
   }

   outputTable.html(output)
   if(onBtnClickFn) outputTable.find(`button`).on(`click`, onBtnClickFn)

   if(ifResults) ifResults()
}

module.exports = {
   displayPersons,
   displayCouples,
}