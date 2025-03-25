# What we aim to do is
- Combine writing notes with adding services
- Develop a time tracking system to keep track of when services start and end
- Develop a algorithmic process of adding those services to medimizer add services to work orders automatically
- Create dirs for each work order
├── wo
│   ├── pos
│   └── wo.md
Where wo is the work order number and pos are purchase orders for that WO number 
- Create POs from templates

The key point so far is the note taking system. It will make it so that I, as a technician can effectively *@ajust take notes* and rely on ce_cli to do the rest (unless I have to intervene)

<td class="dxgv">-   12/27/2024 11:34 AM -   10 Minutes - Documentation </td>

# IMPORT
[Verb] (10min) (2024-27-12) => (||) 
[Verb, Noun] (10min) (2024-27-12) => (||) 

# EXPORT (1. Process, 2. Stack 3. Push 4. Verify)
---
## 1. Process
### Base Export format
[Verb] (YYYY-MM-DD HH:MM) => // User notes go here 
[Verb, Noun] (YYYY-MM-DD HH:MM) => // User notes go here 

### Example
 Stack JSON for 2 each WO
// {
//   "workOrderNumber": "0000000" // seven digit number of WO
//   "controlNumber": "00000000",
//   "services": [
//     {
//       "datetime": "YYYY-MM-DD HH:MM",
//       "verb": "string", // Everything left of the comma in the export format
//     }
//   ]
// }

// {
//   "workOrderNumber": "0000000" // seven digit number of WO
//   "controlNumber": "00000000",
//   "services": [
//     {

//       "datetime": "YYYY-MM-DD HH:MM",
//       "noun": "string",
//       "verb": "string", // Everything right of the comma in the export format
//     }
//   ]
// }
//
// .....

## 2. Stack
  // else return 0
}

  const findNounInTable = (nounSide) => {
  // Search for verb_Side in verb_table

  // return noun_code
 ]
// else return 0;
}
}

// Deconstruct [1, verb_code] to get verb code (idk the syntax)
// Return either
// (verb_code)
// OR
// (verb_code, noun_code,)
const processService = (findVerbInTable(''/*string containing verb deconstructed for verb table row*/)) => {
  // if ([, , 1]) {
  // return {[num, ,], findNounInTable()}
  //
  // }
  // else {
  //   return ({verb_code})
  // }
}

const pushToStack = (processService(), datetime) => { // datetime = string YYYY-MM-DD HH:MM imported from the service format (recall EXPORT format)
  // if just verb code, then push the verb code to "services" as follows
  // {
  //     "datetime": "YYYY-MM-DD HH:MM",
  //     "verb": verb_code; // integer
  // }

  // Otherwise, push the noun and the verb to "services" as follows
  // {
  //   "datetime": "YYYY-MM-DD HH:MM",
  //   "verb": verb_code; // integer
  //   "noun": noun_code; // integer
  // }
}

What the modified stack should like like with one service pushed
{ 
  "workOrderNumber": "0000000" // seven digit number of WO
  "controlNumber": "00000000",
  "services": [
    {
      "datetime": "YYYY-MM-DD HH:MM",
      "verb": verb_code; // integer
      "noun": noun_code; // integer
    }
  ]
  "notes" : /* For each service in a work order, notes will be combined into one giant block of text*/
'''
YYYY-MM-DD HH:MM
notes to be exported notes go here. This includes
| LP
'''
}

What the modified stack should like like with multiple services pushed
{
  "workOrderNumber": "0000000" // seven digit number of WO
  "controlNumber": "00000000",
  "services": [
    { // Service 1
      "datetime": "YYYY-MM-DD HH:MM",
      "verb": verb_code; // integer
      "noun": noun_code; // integer
    }
    { // Service 2
      "datetime": "YYYY-MM-DD HH:MM",
      "verb": verb_code; // integer
      "noun": noun_code; // integer
    }
    { // Service 3
      "datetime": "YYYY-MM-DD HH:MM",
      "verb": verb_code; // integer
      "noun": noun_code; // integer
    }
    ...
  ]
  "notes" : /* For each service in a work order, notes will be combined into one giant block of text*/
'''
YYYY-MM-DD HH:MM
Notes from service1\n
Notes from service2\n
Notes from service3\n
| ~LP~
...
'''

}


## 3. Push
Let's first update the json for our services
 {
   "workOrderNumber": "0000000" // seven digit number of WO
   "controlNumber": "00000000",
   "services": [
     {

       "datetime": "YYYY-MM-DD HH:MM",
       "noun": "string",
       "verb": "string", // Everything right of the comma in the export format
       "ServiceTimeCalculated": 0 // Time calculated from time management system to be implemented. For now, keep this at 0
       "pushedToMM": 0 // bool that becomes one if we have pushed this to Medimizer
     },

   ]
 }


For this step we are going to methodically add services to work orders.
First, we're going to the following URL
`http://sqlmedimizer1/MMWeb/App_Pages/ServiceForm.aspx?WO=1421797&Service=add`

Then, We're going to navigate to the Service input field 
~~~html
<input class="dxeEditArea_Aqua dxeEditAreaSys      " id="ContentPlaceHolder1_pagService_cboServiceCode_I" name="ctl00$ContentPlaceHolder1$pagService$cboServiceCode" onfocus="aspxEGotFocus('ContentPlaceHolder1_pagService_cboServiceCode')" onblur="aspxELostFocus('ContentPlaceHolder1_pagService_cboServiceCode')" onchange="aspxETextChanged('ContentPlaceHolder1_pagService_cboServiceCode')" onkeydown="aspxEKeyDown('ContentPlaceHolder1_pagService_cboServiceCode', event)" type="text" style="height:15px;" autocomplete="off">
~~~
and enter our verb code

Then, if our service has a noun, we'll go to the Service Noun input field
~~~html
<input class="dxeEditArea_Aqua dxeEditAreaSys " id="ContentPlaceHolder1_pagService_cboServiceNoun_I" name="ctl00$ContentPlaceHolder1$pagService$cboServiceNoun" onfocus="aspxEGotFocus('ContentPlaceHolder1_pagService_cboServiceNoun')" onblur="aspxELostFocus('ContentPlaceHolder1_pagService_cboServiceNoun')" onchange="aspxETextChanged('ContentPlaceHolder1_pagService_cboServiceNoun')" onkeydown="aspxEKeyDown('ContentPlaceHolder1_pagService_cboServiceNoun', event)" type="text" style="height:15px;" autocomplete="off">
~~~
and enter our noun code

Then, we're going to navigate to the Service Date completed on field
~~~html
<input class="dxeEditArea_Aqua dxeEditAreaSys  " name="ctl00$ContentPlaceHolder1$pagService$datCompletedOn" onkeyup="aspxEKeyUp('ContentPlaceHolder1_pagService_datCompletedOn', event)" value="3/24/2025" id="ContentPlaceHolder1_pagService_datCompletedOn_I" onchange="aspxETextChanged('ContentPlaceHolder1_pagService_datCompletedOn')" onblur="aspxELostFocus('ContentPlaceHolder1_pagService_datCompletedOn')" onfocus="aspxEGotFocus('ContentPlaceHolder1_pagService_datCompletedOn')" type="text" onkeydown="aspxEKeyDown('ContentPlaceHolder1_pagService_datCompletedOn', event)" style="height:15px;" autocomplete="off">
~~~
and enter our date completed code in MM/DD/YYYY

Then, we're going to navigate to the Service time completed on field 
~~~html
<input class="dxeEditArea_Aqua dxeEditAreaSys  " name="ctl00$ContentPlaceHolder1$pagService$timCompletedOn" onkeyup="aspxEKeyUp('ContentPlaceHolder1_pagService_timCompletedOn', event)" value="10:03 PM" id="ContentPlaceHolder1_pagService_timCompletedOn_I" onchange="aspxETextChanged('ContentPlaceHolder1_pagService_timCompletedOn')" onblur="aspxELostFocus('ContentPlaceHolder1_pagService_timCompletedOn')" onfocus="aspxEGotFocus('ContentPlaceHolder1_pagService_timCompletedOn')" type="text" onkeypress="aspxEKeyPress('ContentPlaceHolder1_pagService_timCompletedOn', event)" onkeydown="aspxEKeyDown('ContentPlaceHolder1_pagService_timCompletedOn', event)" style="height:15px;" autocomplete="off">
~~~
and enter our time compelted on HH:MM AM/PM

Then, we're going to navigate to the Time Used section, and enter 0 (for now. We will be implementing a time tracking system very soon but for now we want to prioritize, safe automated data entry into medimizer.)
~~~html
l
<input class="dxeEditArea_Aqua dxeEditAreaSys  " name="ctl00$ContentPlaceHolder1$pagService$timCompletedOn" onkeyup="aspxEKeyUp('ContentPlaceHolder1_pagService_timCompletedOn', event)" value="10:03 PM" id="ContentPlaceHolder1_pagService_timCompletedOn_I" onchange="aspxETextChanged('ContentPlaceHolder1_pagService_timCompletedOn')" onblur="aspxELostFocus('ContentPlaceHolder1_pagService_timCompletedOn')" onfocus="aspxEGotFocus('ContentPlaceHolder1_pagService_timCompletedOn')" type="text" onkeypress="aspxEKeyPress('ContentPlaceHolder1_pagService_timCompletedOn', event)" onkeydown="aspxEKeyDown('ContentPlaceHolder1_pagService_timCompletedOn', event)" style="height:15px;" autocomplete="off">
~~~
and enter our time compelted on HH:MM AM/PM

Then, we're going confirm the addition of the service by clicking the "Work Order Form Button" (this is also temporary as we will eventually improve the documentation syntax to determine a way to push a "closed" service to the stack.)

# 4. Verify
When we click on the "Work Order Form Button", it should take us back to the work order form page
`http://sqlmedimizer1/MMWeb/App_Pages/WOForm.aspx?wo=1421797&tab=1`
We want to verify that the work order was added (date, time, and service) and then set `pushed` to true.

We repeat this process for each service in each work order on the stack until each service has a pushed value of 1
