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
## Note Formatting
* TODO:
#+begin_src claude
One important part of pushing is adding the notes to the notes section.

The information in the service_stack.json notes prop

{
...
"notes": "2025-03-24 23:57\nI documented some things\n\n2025-03-24 23:57\nI analyzed this unit to determine that everything was up to speed."
}


# 4. Verify
When we click on the "Work Order Form Button", it should take us back to the work order form page
`http://sqlmedimizer1/MMWeb/App_Pages/WOForm.aspx?wo=1421797&tab=1`
We want to verify that the work order was added (date, time, and service) and then set `pushed` to true.

We repeat this process for each service in each work order on the stack until each service has a pushed value of 1

#### 5. Improving note syntax functionality

Closing a Work order with `=|` in the {wo_number}.md

Nothing past =| should count, in fact, we should throw an error if anything is detected beneath.

1 Service)
---
[Verb] (YYYY-MM-DD HH:MM) // User notes go here =| // Set status of WO to CLOSED when we push
---

---
[Verb, Noun] (YYYY-MM-DD HH:MM) // User notes go here =| // Set status of WO to CLOSED when we push
---

2+ Services)

---
[Verb] (YYYY-MM-DD HH:MM) // User notes go here
[Verb, Noun] (YYYY-MM-DD HH:MM) // User notes go here 
[Verb] (YYYY-MM-DD HH:MM) // User notes go here =| // Set status of WO to CLOSED when we push
<!--Nothing under here should be accounted for -->
---

---
[Verb, Noun] (YYYY-MM-DD HH:MM) // User notes go here 
[Verb, Noun] (YYYY-MM-DD HH:MM) // User notes go here =| // Set status of WO to CLOSED when we push
<!--Nothing under here should be accounted for -->
---


## Hardcoding time for services
`("")` will be implemented into the system. It will represent the following
`(1"2"3)`
`(char:integer:string)`
(Time in minutes that the service took"*R*egular *O*vertime *P*remium"FIRSTLETTERLASTNAME)

(1"") will correspond to typing in Regular, Overtime, or Premium this field on the services page 
~~~html
<input class="dxeEditArea_Aqua dxeEditAreaSys  " name="ctl00$ContentPlaceHolder1$pagService$cbpRateInfo$cboRateCode" value="Regular" id="ContentPlaceHolder1_pagService_cbpRateInfo_cboRateCode_I" onchange="aspxETextChanged('ContentPlaceHolder1_pagService_cbpRateInfo_cboRateCode')" onblur="aspxELostFocus('ContentPlaceHolder1_pagService_cbpRateInfo_cboRateCode')" onfocus="aspxEGotFocus('ContentPlaceHolder1_pagService_cbpRateInfo_cboRateCode')" type="text" onkeydown="aspxEKeyDown('ContentPlaceHolder1_pagService_cbpRateInfo_cboRateCode', event)" style="height:15px;" autocomplete="off">
~~~
and then pressing RET. Recall the services page is here
~~~
http://sqlmedimizer1/MMWeb/App_Pages/ServiceForm.aspx?WO=1422310&Service=add
~~~

("2") in the will correspond to ~serviceTimeCalculated~ in services (this number will be free to be modified though later by our time management program)

   "services": [
     {
       ...
       "servicetimecalculated": 0 // time calculated from time management system to be implemented. for now, keep this at 0
       ...
     },

   ]

(""3) will correspond to 
~~~html
<input class="dxeEditArea_Aqua dxeEditAreaSys    " name="ctl00$ContentPlaceHolder1$pagService$cboEmployees" value="LPOLLOCK LONNIE POLLOCKS" id="ContentPlaceHolder1_pagService_cboEmployees_I" onchange="aspxETextChanged('ContentPlaceHolder1_pagService_cboEmployees')" onblur="aspxELostFocus('ContentPlaceHolder1_pagService_cboEmployees')" onfocus="aspxEGotFocus('ContentPlaceHolder1_pagService_cboEmployees')" type="text" onkeydown="aspxEKeyDown('ContentPlaceHolder1_pagService_cboEmployees', event)" style="height:15px;" autocomplete="off">
~~~
on the services page (we modify this field as a part of push.ts normally)

If (1"") is empty, then set it to R
If ("2") is empty, then it set it to 0
If (""3) is empty, then it should be 'LPOLLOCK' by default (it's rare that anything will be in this field)

[Verb] (YYYY-MM-DD HH:MM) (char"integer"string") => // User notes go here 
[Verb, Noun] (YYYY-MM-DD HH:MM) (char"integer"string") => // User notes go here 

Example
---
[Documentation] (2025-03-25 21:30) (30"30") => I documented some things // Regular pay, Time used is 30 minutes
[Analyzed, Unit] (2025-03-25 21:30) (O"65") => While overtime, I took a look at the unit // Overtime pay, Time used is 65 minutes.
[Assisted, Staff] (2025-03-25 22:30) (P"120"AHUGHES) => Amy helped me do something // Premium pay, Time used is 120 minutes.
---

## Better notes
We also want to add the notes to the Notes field in 
`http://sqlmedimizer1/MMWeb/App_Pages/WOForm.aspx?{0000000}&tab=2`

Needs to be pushed to the notes section which is accessed in from

And pasted.

We also want to modify notes formatting as follows

// 1 service
YYYY-MM-DD HH:SS ~Note from service 1 | LP

  Example
2025-03-08: Brought unit down for service | LP

// 2+ servi
YYYY-MM-DD: \n~Note from service 1 (HH:MM)\n~Note from service 1 (HH:MM)\n ~Note from service (HH:MM)\n ~Note from service (HH:MM)\n | LP
How it should appear in the notes text box 

2025-03-08: Brought unit down for service
=> Analyzed the unit that I saw for bumps and blemishes
=> Performed some documentation (HH:MM) | LP

'=|' Must be at the end of the last service ONLY

When =| is reached, when we push, rather than the work order form button, we want to press the save closed button
~~~html
<div id="ContentPlaceHolder1_btnSaveClosed_CD" class="dxb">
    <span style="">Save Closed</span>
</div>
~~~

We want to verify closure by navigating to 
`http://sqlmedimizer1/MMWeb/App_Pages/WOForm.aspx?{0000000}&tab=0`
And ensuring the closed checkbox is checked
~~~html
<span class=" dxICheckBox_Aqua  dxWeb_edtCheckBoxUnchecked_Aqua" id="ContentPlaceHolder1_pagWorkOrder_chkClosed_S_D"><span class="dxKBSW"><input id="ContentPlaceHolder1_pagWorkOrder_chkClosed_S" name="ctl00$ContentPlaceHolder1$pagWorkOrder$chkClosed" value="C" readonly="readonly" style="opacity:0;width:1px;height:1px;position:relative;background-color:transparent;margin:0;padding:0;border-width:0;font-size:0pt;"></span></span>
~~~

Syntax validation is a good idea. It should happen when we stack but it should be integrated within the stack command, not its own command, I think.

I like your other suggestions. Let's implement those. Let's also commit fully to ensuring that the work order is closed should `=|` appear at the end of the last service within the {wo_num}.md.

Let me know what your thoughts are now before writing any code or performing any implementation. Any better suggestions instead of to close out WOs?
Let's take this step by step

~~~md
## Work Order Closing Syntax with `=|`

### Current Understanding
Based on your description, you want to implement a special syntax in the notes files where:
- The `=|` symbol at the end of a service entry indicates that the work order should be closed when pushed to Medimizer
- Nothing after `=|` should be parsed as a service
- If there's content below the closing symbol, the system should throw an error

### Implementation Approach

1. **Parser Modification**:
   - We need to modify the service parsing logic in `parseServicesFromNotes()` to recognize the `=|` token
   - When found, we need to:
     - Mark that the work order should be closed
     - Stop parsing any services after this line
     - Validate that no additional service entries exist below it

2. **Data Structure Update**:
   - Add a `closeWorkOrderOnPush` flag to the work order stack structure
   - This will signal the push system to close the work order after pushing all services

3. **Push System Enhancement**:
   - Modify the `pushStack()` function to check the `closeWorkOrderOnPush` flag
   - If true, call the `closeWorkOrder()` function after services are pushed
   - Implement proper error handling for failures in either operation

### Potential Challenges and Solutions

1. **Parsing Edge Cases**:
   - What if `=|` appears within notes text but isn't meant as a closing token?
   - Solution: Require a specific format, e.g., the token must be at the end of a service line with optional whitespace after it

2. **Multiple Close Tokens**:
   - What if multiple services have the `=|` token?
   - Solution: Use the first occurrence or raise an error for multiple closing signals

3. **Validation Logic**:
   - How strict should we be about services appearing after the closing token?
   - Solution: Warn on detection but still allow the operation with clear messaging

4. **Error Handling**:
   - What happens if closing fails during push?
   - Solution: Implement transaction-like behavior where we track success of each operation

### Implementation Plan

1. **Step 1: Update Service Parser**
   - Modify `parseServicesFromNotes()` to detect the `=|` token
   - Implement validation logic for content after the token

2. **Step 2: Update Data Structure**
   - Add `closeWorkOrderOnPush` flag to the `StackedWorkOrder` interface
   - Update `stackWorkOrder()` to set this flag when the token is detected

3. **Step 3: Enhance Push Logic**
   - Modify `pushStack()` to check for the flag and close the work order if needed
   - Implement proper error handling and reporting

4. **Step 4: Add Tests**
   - Create test cases for various scenarios including normal usage and edge cases

## Potential Enhancements & Ideas

1. **User Confirmation**:
   - Before closing a work order on push, prompt the user to confirm this action
   - This could prevent accidental closures

2. **Visual Indicators**:
   - When displaying the stack, show a clear indicator for work orders that will be closed upon push
   - E.g., "Work Order 1234567 (3 services, WILL BE CLOSED ON PUSH)"

3. **Audit Trail**:
   - Record in the notes file when a work order was closed via the `=|` token
   - Include timestamp and user information

4. **Syntax Validation**:
   - Add a command to validate notes files without actually stacking them
   - This would help users identify syntax issues before attempting to push

5. **Partial Execution**:
   - Allow users to push services up to the close token but not close the work order
   - Useful for testing or cases where final approval is needed

Do any of these approaches or ideas need clarification? Would you like to modify anything about the proposed implementation plan before we move forward?
You've provided crucial specifics about how `=|` should work, and I agree with your approach. Let me revise my thoughts to align with these requirements:

## Refined Implementation Plan for Work Order Closing Syntax

### Key Requirements
1. The `=|` token must only be valid at the end of the **last service** in the file
2. When pushing:
   - Instead of clicking the "Work Order Form" button, we need to click "Save Closed"
   - We must verify closure by checking if the closed checkbox is selected on the main work order page

### Parser Logic Refinement
The parser needs to be more specific than I initially suggested:
1. Parse all services in the file
2. Check if the last service (and ONLY the last service) has `=|` in the notes section
3. If found, mark the work order for closure
4. If the token appears in any service besides the last one, raise a validation error

### Implementation Steps

1. **Update Service Parser**:
   - Parse all services first
   - Then perform a separate validation pass on the last service
   - If `=|` is found in earlier services, raise a clear error message
   - This can be integrated within existing `parseServices` or `stackWorkOrder` functions

2. **Stack Command Enhancement**:
   - Add the validation within the `stackWorkOrder` command
   - Set a `shouldCloseOnPush` flag in the stack entry when the last service has the `=|` token

3. **Push Command Modification**:
   - In `pushServiceToMedimizer`, add a condition to check the `shouldCloseOnPush` flag
   - If true, click the "Save Closed" button instead of "Work Order Form"
   - Add a verification step that navigates to the main form and checks the closed checkbox

4. **Verification Enhancement**:
   - After clicking "Save Closed", add a verification step
   - Navigate to the work order page with tab=0
   - Verify the checkbox is checked, throw an error if not

### Edge Cases and Error Handling

1. **Malformed Tokens**:
   - What if `=|` appears within the notes text but with other characters?
   - Solution: Use a regex pattern that identifies `=|` at the end of a line (possibly with trailing whitespace)

2. **Failed Closure**:
   - What if clicking "Save Closed" fails or the work order doesn't get marked as closed?
   - Solution: Add a retry mechanism and clear error messaging

3. **Partial Processing**:
   - What if some services are pushed successfully but the closure fails?
   - Solution: Mark successfully pushed services as pushed, report clear error about closure failure

### Enhanced Features

1. **Visual Indication in Stack Display**:
   - Modify `formatStack` to include a "WILL BE CLOSED" indicator next to work orders that have the closure flag set

2. **Audit in Notes**:
   - After successful closure, append a timestamp to the notes indicating when it was closed
   - This provides a clear audit trail within the work order notes

3. **User Feedback**:
   - Add detailed logging during push operations to show progress
   - Include specific messages about closure status

### Implementation Approach

I recommend an incremental approach:

1. First, update the parser to detect and validate the `=|` token
2. Next, modify the stack structure and command to set the closure flag
3. Then, enhance the push command to handle the different button click
4. Finally, add verification steps to confirm closure

This way, each step can be tested independently, reducing the risk of introducing bugs.

There are no other specific edge cases or behaviors you'd like me to consider for this implementation. This approach aligned with what you're envisioning?

Implement this.
