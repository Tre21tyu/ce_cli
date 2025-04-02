#+title: Todos
# Data Structures
#* `day`: JSON object
~~~json
{
    "startTime": a;sldkj,
    
}
~~~

# Functions
`start-day`~ => Begin day. Need to add /start/ time.
Init daily log (call log)

We can open this log by typing:
```bash
log today
```
or
```bash
log daily
```

We can open yesterdays log by typing in
```bash
log yesterday
```

We can get our list of daily logs by typing in
```bash
log dailies
```

or if we know the date

```bash
log dailies arg1
```
Where arg1 = YYYY-MM-DD

`clock-in` => Begin day+clock in. Go to UKG, verify NOT already clocked in, clock in
`end-day` => End day. Need to add /end/ time
`clock-out` => Begin day+clock in. Go to UKG, verify NOT already clocked out, clock in

# Overall Program Improvements
I'll outline the implementation steps for the "Work Order Closing Syntax with =|" feature as requested. Here's a detailed plan broken down into manageable chunks:

# Implementation Plan for Work Order Closing Syntax (`=|`)

## Phase 1: Update Service Parsing Logic

* [x] Modify parseServicesFromNotes() in note.ts to detect the =| token in the last service

* [x] Add validation to ensure =| only appears in the last service

* [x] Create a helper function to extract the closing token from service notes

* [x] Add error handling for malformed tokens or tokens in invalid positions

## Phase 2: Update Data Structures

* [x] Modify the StackedWorkOrder interface in stack-manager.ts to include a shouldCloseOnPush flag

* [x] Update ParsedService interface to optionally track if a service has the closing token

* [x] Add a field to represent closing status in service parsing results

## Phase 3: Enhance Stack Command

* [ ] Update stackWorkOrder() to set the shouldCloseOnPush flag when the token is detected

* [ ] Modify the stack display format to indicate which work orders will be closed on push

* [ ] Ensure stack persistence correctly saves and loads the closure flag

* [ ] Add validation to prevent multiple closing tokens across services

## Phase 4: Modify Push Command (Browser Automation)

* [ ] Add conditional logic in pushServiceToMedimizer() to check for the closure flag

* [ ] Implement alternative button selection ("Save Closed" instead of "Work Order Form")

* [ ] Add selectors and actions for the different closing workflow in Medimizer

* [ ] Set up conditional navigation based on closure status

## Phase 5: Add Verification Steps

* [ ] Implement verification that checks if the work order was actually closed after pushing

* [ ] Navigate to the main work order view and verify the closed checkbox 

* [ ] Add retry logic for failed closures

* [ ] Implement appropriate error handling and user feedback for verification failures

## Phase 6: Enhance User Feedback

* [ ] Update stack display to clearly show which work orders will be closed

* [ ] Improve logging during push operations to show closure status

* [ ] Add detailed error messages for various closure-related issues

* [ ] Update help documentation to explain the =| syntax

## Phase 7: Testing and Validation

* [ ] Test various scenarios including valid tokens, invalid placement, etc.

* [ ] Verify browser automation correctly handles the closure workflow

* [ ] Test edge cases like failed closures or partial processing

* [ ] Validate the entire workflow from noting to stacking to pushing/closing

This plan breaks down the implementation into manageable pieces that can be addressed in separate conversations, with each phase building on the previous ones.I'll outline the implementation steps for the "Work Order Closing Syntax with =|" feature as requested. Here's a detailed plan broken down into manageable chunks:

# Implementation Plan for Work Order Closing Syntax (`=|`)

## Phase 1: Update Service Parsing Logic

* [] Modify parseServicesFromNotes() in note.ts to detect the =| token in the last service

* [] Add validation to ensure =| only appears in the last service

* [] Create a helper function to extract the closing token from service notes

* [] Add error handling for malformed tokens or tokens in invalid positions

## Phase 2: Update Data Structures

* [x] Modify the StackedWorkOrder interface in stack-manager.ts to include a shouldCloseOnPush flag

* [x] Update ParsedService interface to optionally track if a service has the closing token

* [x] Add a field to represent closing status in service parsing results

## Phase 3: Enhance Stack Command

* [ ] Update stackWorkOrder() to set the shouldCloseOnPush flag when the token is detected

* [ ] Modify the stack display format to indicate which work orders will be closed on push

* [ ] Ensure stack persistence correctly saves and loads the closure flag

* [ ] Add validation to prevent multiple closing tokens across services

## Phase 4: Modify Push Command (Browser Automation)

* [ ] Add conditional logic in pushServiceToMedimizer() to check for the closure flag

* [ ] Implement alternative button selection ("Save Closed" instead of "Work Order Form")

* [ ] Add selectors and actions for the different closing workflow in Medimizer

* [ ] Set up conditional navigation based on closure status

## Phase 5: Add Verification Steps

* [ ] Implement verification that checks if the work order was actually closed after pushing

* [ ] Navigate to the main work order view and verify the closed checkbox 

* [ ] Add retry logic for failed closures

* [ ] Implement appropriate error handling and user feedback for verification failures

## Phase 6: Enhance User Feedback

* [ ] Update stack display to clearly show which work orders will be closed

* [ ] Improve logging during push operations to show closure status

* [ ] Add detailed error messages for various closure-related issues

* [ ] Update help documentation to explain the =| syntax

## Phase 7: Testing and Validation

* [ ] Test various scenarios including valid tokens, invalid placement, etc.

* [ ] Verify browser automation correctly handles the closure workflow

* [ ] Test edge cases like failed closures or partial processing

* [ ] Validate the entire workflow from noting to stacking to pushing/closing

This plan breaks down the implementation into manageable pieces that can be addressed in separate conversations, with each phase building on the previous ones.

Let's restart the Phase 3. Let's start with just the first part of phase 3


##  init enhancements and `push` perfection

when we init or import a work order, we want to capture that time that that WO was inited. 

Some way to add 
