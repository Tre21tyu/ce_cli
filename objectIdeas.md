WO JSON object

{
  "open": true,
  "dateOpened": "2025-03-17 14:30:00",
  "dateClosed": "2025-03-17 16:00:00",
  "workOrderNumber": "0000000",
  "controlNumber": "00000000",
  "services": [
    {
      "dateAdded": "2025-03-17 14:45:00",
      "duration": 30,
      "noun": "Engine",
      "verb": "Repair",
      "partsCharged": [
        {
          "partNumber": "12345XYZ",
          "cost": 250.75
        }
      ]
    }
  ]
}

Stack JSON object

The difference between when the work order was inited and pushed to the stack is the time we want to add to that stack.

Stack obj
{
  "workOrders": 
    [
        workorder1, workorder2, workorder3, workordern
    ],

  "timeForEach":
  "workOrders": 
    [
        workorder1Time, workorder2Time, workorder3Time, workordernTime
    ],
    "timePool": integer

}

