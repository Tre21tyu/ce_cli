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

# EXPORT (1. Process, 2. Stack)
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
  // if there is an EXACT string match return [verb_keyword, verb_code (int))] (a.k.a the deconstructed row)
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
