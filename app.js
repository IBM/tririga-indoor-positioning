require('dotenv').config()
const express = require('express')
const cors = require('cors')
const app = express()
const fetch = require('node-fetch')
const Cloudant = require('@cloudant/cloudant');
const schedule = require('node-schedule');
const async = require('async');
const await = require('await');
const port = 3000
// const _ = require('lodash')
app.use(cors())
console.log("serving libs at" + __dirname + '/app/public')
app.use(express.static(__dirname + '/app/public'));
app.use("/styles", express.static(__dirname + '/styles'));
app.use(express.static(__dirname + '/data'));


var bearerToken, buildings
app.get('/refreshtoken', (req, res) => {
  //bearerToken = json.token) //console.log(json))
  refreshToken()
  res.sendStatus(200)
})

app.get('/cachepriorities', (req, res) => {
  // fs.read('./data/cache.json')
  var c = require('./data/cache.json')
  res.json (c.payload['/v1/building/allpriorities/B052']['rows'])

  //bearerToken = json.token) //console.log(json))
})


var getWeather = async () => {
  // console.log("refreshing bearer token")
  var coords = [process.env.longitude, process.env.latitude]
  var uri = 'https://twcservice.mybluemix.net/api/weather/v1/geocode/' + coords.join('/') + '/forecast/hourly/48hour.json'
  var user = process.env.weather_api_username
  var pass = process.env.weather_api_password
  console.log(uri)
  const response = await fetch(uri, {
    method: 'GET',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(user + ":" + pass).toString('base64'),
      'Content-Type': 'application/json'
    }
  })
  const data = await response.json()
  return data;
}

app.get('/weather', (req, res) => {
  getWeather().then( (weather) => {
    // return prediction for next 10 hours
    res.send(weather.forecasts.slice(0, 10))
  })
})

// Load app file for testing
// const fs = require('fs')
// eval(fs.readFileSync('./app.js')+'');

// var refreshToken = function() {
//   // console.log("refreshing bearer token")
//   // var uri = process.env.domain + '/v1/user/activity/login'
//   console.log(uri)
//   fetch(uri, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({
//       username: process.env.usr,
//       password: process.env.password
//     })
//   }).then(res => res.json()
//   ).then((json) => {
//     console.log(json)
//     bearerToken = json.token;
//     console.log("token received");
//   })
//   // return bearerToken
// }


var refreshToken = async () => {

  // console.log("refreshing bearer token")
  var uri = process.env.domain + '/v1/user/activity/login'
  console.log(uri)
  const response = await fetch(uri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: process.env.usr,
      password: process.env.password
    })
  })
  const data = await response.json()
  bearerToken = data.token;
  return data.token;

  // .then(res => res.json()
  // ).then((json) => {
  //   console.log(json)
  //   bearerToken = json.token;
  //   callback(null, bearerToken)
  //   console.log("token received");
  // })
  // return bearerToken
}

// var refreshToken = function(callback) {
//   // console.log("refreshing bearer token")
//   // var uri = process.env.domain + '/v1/user/activity/login'
//   console.log(uri)
//   fetch(uri, {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({
//       username: process.env.usr,
//       password: process.env.password
//     })
//   }).then(res => res.json()
//   ).then((json) => {
//     console.log(json)
//     bearerToken = json.token;
//     callback(null, bearerToken)
//     console.log("token received");
//   })
//   // return bearerToken
// }


// var agg_endpoints = [
//   `/dtl/FootFallByFloorDetailPerFloor?buildingName=${buildingName}&floorName=${floorName}`
// ]


var multer = require('multer');
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function(req, file, cb) {
    // console.log("saving " + file.originalname)
    console.log("saving " + req.body.filename)
    cb(null, req.body.filename)
  }
  // onParseEnd:function(req, next){
  //   console.log("completed")
  // }
  // }));
})
const upload = multer({
  storage: storage
})


var parseBuildings = function(json) {
  // this is checking for a '_' to exclude non-building values such as "iotbi217_TOTAL" and "ESTATE_OCCUPANCY_SENSOR". TODO, need to find a more resilient method
  // console.log("json" + json)
  var buildings = json.filter(val => !val.src.includes('_')).map(building => ({
    id: building.src
  }))
  // console.log("buildings" + buildings)
  return (buildings)
  // return [{id: "All"}].concat(buildings)
  // return JSON.stringify([{id: "building1"}, {id: "building2"}])
}

var initCloudant = function() {
  console.log("Initializing Cloudant")
  var username = process.env.cloudant_username
  var password = process.env.cloudant_password
  var db_name = process.env.cloudant_db
  var cloudant = Cloudant({
    account: username,
    password: password
  })
  cachedb = cloudant.db.use(db_name, function(err, body) {
    if (err) {
      console.log(err)
      cloudant.db.create(db_name, function(err, body) {
        console.log(err)
        console.log(body)
      })
    }
  })
}


// app.configure(function(){
// app.use(express.static(__dirname + '/public'));
// });

// ESTATE Dashboard API calls
var estateEndpoints = require('./data/estateEndpoints.json')
// Occupancy
// buildingAPIList.push("v1/dtl/FootFallPredictionEstate?timeOffset=+05:30")

// BUILDING Dashboard Popup API calls
var buildingEndpoints = require('./data/buildingEndpoints.json')

var occupancyEndpoints = require('./data/occupancyEndpoints.json')


// var getBuildings = function() {
//   console.log("Getting list of buildings")
//   var uri = process.env.kitt_domain + `/graph/${process.env.instance_id}/instance/${process.env.instance_id}`
//   fetch(uri, {
//     method: 'GET',
//     headers: {
//       'Authorization': `Bearer ${bearerToken}`
//     }
//   }).then(result => result.json()).then(json => {
//     console.log(json);
//     buildings = parseBuildings(json['ref-in'])
//   }).then(() => res.send(buildings))
//   // currently returns an array of arrays [["id", "building1"], ["id", "building2"]]
// }



var getBuildings = async () => {
  console.log("Getting list of buildings")
  var uri = process.env.kitt_domain + `/v1/graph/${process.env.instance_id}/instance/${process.env.instance_id}`
  const response = await fetch(uri, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${bearerToken}`
    }
  })
  console.log(response)

  const result = await response.json()
  console.log(result)
  buildings = await parseBuildings(result['ref-in'])
  return buildings
  // .then(json => {
  //   console.log(json);
  //   buildings = parseBuildings(json['ref-in'])
  // }).then(() => res.send(buildings))
  // currently returns an array of arrays [["id", "building1"], ["id", "building2"]]
}

// coords, builings are sent
var getCoords = async () => {
  var uri = process.env.agg_domain + "/v1/estate/anomalies"
  console.log(uri)
  const response = await fetch(uri, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${bearerToken}`
    }
  })
  const result = await response.json()
  coords = parseCoords(result.marker)

  return coords

  // .then(result => result.json()).then(json => {
  //   coords = parseCoords(json.marker)
  //   console.log(json)
  // })
}

// get list of buildings
app.get('/buildings', (req, res) => {
  res.send(buildings)
  // use data pulled from anomalies endpoint
  // .then(json => buildings = json['ref-in'].filter(val => !val.src.includes('_')).map(building => building.src))
})




app.get('/buildings/coords', (req, res) => {
  res.send(coords)
  //.then(() => res.send(parseCoords(json))) // .then(json => buildings = json['ref-in'].filter(val => !val.src.includes('_')).map(building => building.src))
})

app.get('/occupancy', (req, res) => {
  res.send(occupancyData)
})

app.get('/cardtest', (req, res) => {

  res.json([{
    "id": "B052",
    "updatetime": "00:02:00",
    "temp": "50F",
    "coords": {
      "latitude": 41.65607742,
      "longitude": -73.93965132
    },
    "estate": "Town of Poughkeepsie, USA"
  },
  {
    "id": "B706",
    "updatetime": "00:02:00",
    "temp": "75F",
    "coords": {
      "latitude": 41.65607747,
      "longitude": -73.93961332
    },
    "estate": "Town of Poughkeepsie, USA"
  }

  ])
})

app.get('/building/:id', (req, res) => {
  // res.send(occupancyData)
  coords.filter(function(b){ return b.title == 'EGLD' })
  if (req.params.type == "table") {

  }
})


var occupancyData = {} // updated hourly
var buildingData = {} // static;
var buildings = []
var floors = []



// First get list of buildings
// Then get building floors

var getFloors = async () => {
  var endpoint = "/v1/dtl/FootFallByFloor?buildingName="
  var uri = process.env.agg_domain + endpoint
  console.log("Getting floors")
  console.log(uri)
  await buildings.map((building) => {
    console.log(uri + building['id'])
    fetch(uri + building['id'], {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bearerToken}`
      }
    }).then(result => result.json()).then((json) => {
      buildingData[building['id']] = {
        "floors": json.data //_.pick(json.data, ["name"]) //_.pick(json.data.floors, ["name"])
      }
    }) //result.json())
  })
}
// Should be able to loop through

// var getResource = async (uri) => {
// var getResource = function(uri, name) {
//   fetch(uri, {
//     method: 'GET',
//     headers: {
//       'Authorization': `Bearer ${bearerToken}`
//     }
//   }).then(response => response.json())
// }
var getResource = async (uri) => {
  const response = await fetch(uri, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${bearerToken}`
    }
  })
  const result = await response.json()
  return result
}

var refreshSensorData = function() {
  var timeOffset = "+05:00"
  var options = {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${bearerToken}`
    }
  }
  console.log(options)
  console.log("Refreshing data")
  occupancyEndpoints.map((endpoint) => {
    var uri = process.env.agg_domain + endpoint
    var name = endpoint.split('/').slice(-1)[0].split("?")[0].toLowerCase()
    console.log(uri)
    console.log(name)
    occupancyData[name] = {}
    if (name.includes('estate')) {
      console.log("Pulling data for estate")
      var params = `?timeOffset=${timeOffset}`
      console.log(uri + params)
      fetch(uri + params, options).then(response => {console.log(response) ; response.json()}).then((json) => occupancyData[name] = json)

    } else if (name.includes('building')) {
      buildings.map((building) => {
        console.log("Pulling building data")

        var params = `?timeOffset=${timeOffset}&buildingName=${building['id']}`
        console.log(uri + params)
        fetch(uri + params, options).then(response => response.json()).then((json) => occupancyData[name][building['id']] = json)
        // fetch(uri, options).then(response =>
        //    occupancyData[name][building['id']] = response.json())
      })
    } else if (name.includes('floor')) {
      buildings.map((building) => {
        // If this building has any registered floors
        if ((buildingData[building['id']] && buildingData[building['id']].floors)) {
          var floors = buildingData[building['id']].floors
        } else {
          var floors = []
        }
        // Loop through floors
        floors.map((floor) => {
          var params = `?buildingName=${building['id']}&floorName=${floor['name']}`
          console.log("Pulling floor data")
          console.log(uri + params)
          fetch(uri + params, options).then(response => response.json()).then((json) => {
            occupancyData[name][building['id']] = {
              "floors": json
            }
          })
        })
      })
    }
  })
}
// {
//   FootFallByHourEstate: {
//
//   },
//   FootFallByHourPopupEstate: {
//     {response}
//   },
//   FootFallByFloor: {
//     EDLC.data: {
//       [
//         {name: 01, value: 30},
//         {name: 02, value: 92},
//       ]
//     },
//   FootFallByFloorDetailPerFloor: {
//       EDLC: {
//         Floor1: {},
//         Floor2: {}
//       }
//     }
//   }
// }
// app.get('/cache', (req, res) => {
//   // // var uri = process.env.agg_domain + "/estate/anomalies"
//   // console.log(uri)
//   // fetch(uri, {
//   //   method: 'GET',
//   //   headers: {
//   //     'Authorization': `Bearer ${bearerToken}`
//   //   }
//   // }).then(result => result.json()).then(json => {
//   //   coords = parseCoords(json.marker)
//   //   console.log(coords)
//     res.sendFile("data/cache.json")
//   // }) //.then(() => res.send(parseCoords(json))) // .then(json => buildings = json['ref-in'].filter(val => !val.src.includes('_')).map(building => building.src))
// })

var parseCoords = function(buildings) {
  var coords = []
  buildings.map((b) => coords.push({
    latitude: b.location[0],
    longitude: b.location[1],
    title: b.id
  }))
  return coords
  // for (b in buildings) {
  // Object.keys(foo.marker).map ( (b) => {latitude: b.location[0], longitude: b.location[1], title: b.id} )
  // var building = buildings[b]
  // coords.push( {latitude: building.lat, longitude: building.lon, title: b} )
  // }

}

var queryBI = function(endpoint, params = {}) {
  var uri = process.env.agg_domain + endpoint
  fetch(uri, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bearerToken}`
      }
    }).then(result => {
      console.log(result);
      result.json()
    }).catch((err) => console.log(err))
    .then(json => {
      console.log(json);
      res.send(json)
    })
}

app.get('/footfall', (req, res) => {
  // add call (if no params for buildingname and floor pull data for entire estate)
  var endpoint = "/v1/dtl/FootFallByHourEstate?timeOffset=+05:30"
  // var building = req.building
  // var building = "EGLD"
  // var endpoint = "/dtl/FootFallByHourPopupBuilding?buildingName=" + building
  // TODO data from current BI instance is mostly zeroes, generate random data?

  queryBI(endpoint)
  // TODO, form footfall data into datatable
  // '[["Time", "Footfall"], ["00:00", 31], ["01:00", 28], ["02:00", 31]]'
})

app.get('/footfall/:building', (req, res) => {
  // add call (if no params for buildingname and floor pull data for entire estate)
  var building = req.building
  // var building = "EGLD"
  var endpoint = "/v1/dtl/FootFallByHourPopupBuilding?buildingName=" + building

  // TODO data from current BI instance is mostly zeroes, generate random data
  queryBI(endpoint)
})

// Single document should be uploaded each hour



/*
app.get('/getfootfall', (req, res) => {
  // add call (if no params for buildingname and floor pull data for entire estate)
  var endpoint = "/dtl/FootFallByHourEstate?timeOffset=+05:30"
  // var building = req.building
  // var building = "EGLD"
  // var endpoint = "/dtl/FootFallByHourPopupBuilding?buildingName=" + building
  // TODO data from current BI instance is mostly zeroes, generate random data?

  var uri = process.env.agg_domain + endpoint
  fetch(uri, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bearerToken}`
      }
    }).then(result => {
      console.log(result);
      result.json()
    }).catch((err) => console.log(err))
    .then(json => {
      console.log(json);
      res.send(json)
    })
  // TODO, form footfall data into datatable
  // '[["Time", "Footfall"], ["00:00", 31], ["01:00", 28], ["02:00", 31]]'
})*/




/*
app.get('/getfootfall/:building', (req, res) => {
  // add call (if no params for buildingname and floor pull data for entire estate)
  var building = req.building
  // var building = "EGLD"
  var endpoint = "/dtl/FootFallByHourPopupBuilding?buildingName=" + building
  // TODO data from current BI instance is mostly zeroes, generate random data
  var uri = process.env.agg_domain + endpoint
  fetch(uri, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bearerToken}`
      }
    })
    .then(result => {
      console.log(result);
      result.json()
    })
    .catch((err) => console.log(err))
    .then(json => {
      console.log(json);
      res.send(json)
    })
  // TODO, form footfall data into datatable
  // '[["Time", "Footfall"], ["00:00", 31], ["01:00", 28], ["02:00", 31]]'
})
*/



// Pull hourly data

// run these when the server starts
// async.series([
//   refreshToken(callback)
//   // getBuildings(),
//   // getFloors(),
//   // getCoords(),
//   // initCloudant(),
//   // refreshData()
// ], function (err, results) {
//     // Here, results is an array of the value from each function
//     console.log(results); // outputs: ['two', 'five']
// });

// TODO
// https://flaviocopes.com/javascript-async-await/
// const promiseToDoSomething = () => {
//   return new Promise(resolve => {
//     setTimeout(() => resolve('I did something'), 10000)
//   })
// }
//
// const watchOverSomeoneDoingSomething = async () => {
//   const something = await promiseToDoSomething()
//   return something + ' and I watched'
// }
//
// const watchOverSomeoneWatchingSomeoneDoingSomething = async () => {
//   const something = await watchOverSomeoneDoingSomething()
//   return something + ' and I watched as well'
// }
//
// watchOverSomeoneWatchingSomeoneDoingSomething().then(res => {
//   console.log(res)
// })

// get auth token
// const promiseToDoSomething = () => {
//   return new Promise(resolve => {
//     setTimeout(() => resolve('I did something'), 10000)
//   })
// }
//
// get buildings


// buildings = null ; coords  = null  ; bearerToken = null  ; floors = null
var occupancyData = {} // updated hourly
var buildingData = {} // static;
var buildings = []
var floors = []

refreshToken().then((token) => {
  getBuildings().then((buildings) => {
    getFloors().then(() => {
      getCoords().then(() => {
        refreshSensorData()
      })
    })
  })
})








// loadBuildingInfo()

var cronInterval = '5 * * * *' // 5th minute of every hour.
schedule.scheduleJob(cronInterval, function() {
    refreshSensorData();
    refreshToken();
//   async.series([
//     refreshToken(), // this needs to be done daily, not hourly
//     refreshData()
//   ]);
});



// {
//     "next": {
//         "unit": "count",
//         "value": 76
//     },
//     "updatedTime": "2018-02-08T04:30:00.023+0530",
//     "previous": {
//         "unit": "count",
//         "value": 32
//     },
//     "timeOffset": "+05:30",
//     "extended": "demographics",
//     "demographics": {
//         "men": {
//             "count": 9,
//             "averageAge": 47
//         },
//         "women": {
//             "count": 9,
//             "averageAge": 26
//         }
//     }
// }




// app.get('/generatetable/footfall', (req, res) => {
//   // add call (if no params for buildingname and floor pull data for entire estate)
//   var endpoint = "/dtl/FootFallByHourEstate?timeOffset=+05:30"
//   // var building = req.building
//   // var building = "EGLD"
//   // var endpoint = "/dtl/FootFallByHourPopupBuilding?buildingName=" + building
//   // TODO data from current BI instance is mostly zeroes, generate random data
//
//   var uri = process.env.agg_domain + endpoint
//   fetch(uri, {
//       method: 'GET',
//       headers: {
//         'Authorization': `Bearer ${bearerToken}`
//       }
//   }).then(result => {console.log(result) ; result.json()}).catch( (err) => console.log(err))
//     .then(json => {console.log(json) ; res.send(json)} )
//   // TODO, form footfall data into datatable
//   // '[["Time", "Footfall"], ["00:00", 31], ["01:00", 28], ["02:00", 31]]'
// })

// mock data
app.get('/sample/:type', (req, res) => {
  // add call (if no params for buildingname and floor pull data for entire estate)
  res.setHeader('Content-Type', 'application/json');
  if (req.params.type == "pie") {
    res.send('[["Building", "Occupancy"], ["B052", 31], ["B053", 28], ["B056", 31]]')
  } else if (req.params.type == "oe") {
    res.send('[["Building", "Occupancy", "Energy (MWh)"], ["Building 1", 31, 155.65], ["Building 2", 28, 160.30], ["Building 3", 44, 101.89], ["Building 4", 44, 101.89],["Building 5", 44, 101.89], ["Building 6", 44, 101.89]]')
  } else if (req.params.type == "table") {
    res.send('[\
    {"id":"B008", "Occupancy":"30", "Percentage":"55%", "Prediction":"39" }, \
    {"id":"EGLD", "Occupancy":"52", "Percentage":"71%", "Prediction":"43" },\
    {"id":"B706", "Occupancy":"42", "Percentage":"75%", "Prediction":"42" },\
    {"id":"EGLC", "Occupancy":"80", "Percentage":"75%", "Prediction":"42" },\
    {"id":"B707", "Occupancy":"291", "Percentage":"75%", "Prediction":"42" },\
    {"id":"B705", "Occupancy":"103", "Percentage":"75%", "Prediction":"42" },\
    {"id":"B052", "Occupancy":"89", "Percentage":"75%", "Prediction":"42" }]')
  } else if (req.params.type == "detailed") {
    res.send('[\
    {"id":"Floor1", "Occupancy":"30", "Percentage":"55%", "Prediction":"39" }, \
    {"id":"Floor2", "Occupancy":"52", "Percentage":"71%", "Prediction":"43" },\
    {"id":"Floor3", "Occupancy":"42", "Percentage":"75%", "Prediction":"42" },\
    {"id":"Floor4", "Occupancy":"80", "Percentage":"75%", "Prediction":"42" },\
    {"id":"Floor5", "Occupancy":"89", "Percentage":"75%", "Prediction":"42" }]')
  } else if (req.params.type == "occupancy") {
    var data = {
      "updatedTime": "2018-02-08T04:30:00.023+0530",
      "data": {
        "next": [156, 60, 60, 22, 60, 46, 28],
        "previous": [8, 0, 26, 40, 40, 40, 40],
        "time": [
          "2018-02-02T00:00:00.000+0000",
          "2018-02-03T00:00:00.000+0000",
          "2018-02-04T00:00:00.000+0000",
          "2018-02-05T00:00:00.000+0000",
          "2018-02-06T00:00:00.000+0000",
          "2018-02-07T00:00:00.000+0000",
          "2018-02-08T00:00:00.000+0000"
        ]
      },
      "city": "Bengaluru",
      "timeOffset": "+05:30"
    }
    var gchartsData = [
      ["time", "occupancy"]
    ]
    for (idx in data['data'].time) {
      gchartsData.push([
        data['data']['time'][idx],
        data['data']['next'][idx]
      ])
    }
    // add call (if no params for buildingname and floor pull data for entire estate)

    res.setHeader('Content-Type', 'application/json');
    // res.send(data)
    res.send(gchartsData)

  } else if (req.params.type == "line") {
    var columns = ['Time'].concat(buildings.map ( (building) => building['id'] ))
    var hours = 12
    var start = 6
    // var chartVals = Array.from({length: hours}, (x,i) => [(parseInt(i) + start) + ":00:00"].concat(genListRandomInts(30 ,buildings.length)))
    // var chart = [columns].concat(chartVals)
    // console.log(columns)
    // console.log(chartVals)
    var chart = '[["Time", "Capacity Threshold", "B008", "EGLD", "EGLD"],  \
          ["06:00", 95, 12, 10, 4], \
          ["07:00", 95, 16, 12, 6], \
          ["08:00", 95, 21, 20, 10], \
          ["09:00", 95, 24, 13, 14], \
          ["10:00", 95, 24, 42, 20], \
          ["11:00", 95, 24, 20, 19], \
          ["12:00", 95, 24, 42, 27], \
          ["13:00", 95, 24, 21, 14], \
          ["14:00", 95, 24, 95, 31], \
          ["15:00", 95, 24, 64, 33], \
          ["16:00", 95, 24, 20, 21], \
          ["17:00", 95, 24, 86, 15], \
          ["18:00", 95, 24, 20, 14]]'
    // var chart = [[]]
    res.send(chart)
  } else {
    res.send("endpoint not found")
  }
})


// var genListRandomInts = function(numVals) {
//   // peak can be somewhere between 11 and 1
//   // value gradually increases by a random amount until peak, drops after
//   // var max = 100
//   // var random = function(max){return Math.floor(Math.random() * Math.floor(max))}
//   // var peak = 12 / 2 + random (3)  //12
//   // graph starts at 5
//   var arr = []
//
//   for (i = 0; i < numVals - i; i++) {
//     // console.log(i)
//     // if (i < peak)
//     arr.push( arr[i - 1] +  Math.floor(Math.random() * Math.floor(max)));
//     if (i == (numVals - 1)) {
//       return arr
//     }
//   }
// }
// [{"id":"All"},{"id":"B008"},{"id":"EGLD"},{"id":"B706"},{"id":"EGLC"},{"id":"B707"},{"id":"B705"},{"id":"B052"}

// var genListRandomInts = function(max, numVals) {
//   var arr = [ Math.floor(Math.random() * Math.floor(max)) ]
//   for (i = 0; i < numVals - 2; i++) {
//     console.log(i)
//     arr.push(Math.floor(Math.random() * Math.floor(max)) );
//     if (i == numVals - 1) {
//       return arr
//     }
//   }
// }

var genListRandomInts = function(max, numVals) {
  var arr = [ Math.floor(Math.random() * Math.floor(max)) ]
  for (i = 0; i < numVals - i; i++) {
    console.log(i)
    arr.push(Math.floor(Math.random() * Math.floor(max)) );
    if (i == (numVals)) {
      return arr
    }
  }
}


var formatGChart = function(xaxis, values) {
  // return
  // var xaxis = ["0:00", "01:00","02:00","03:00","04:00","05:00","06:00","07:00","08:00","09:00","10:00","11:00","12:00","1:00","2:00","3:00","4:00","5:00","6:00","7:00","8:00","9:00","12:00"]
}

// [["time","occupancy"],["2018-02-02T00:00:00.000+0000",156],["2018-02-03T00:00:00.000+0000",60],["2018-02-04T00:00:00.000+0000",60],["2018-02-05T00:00:00.000+0000",22],["2018-02-06T00:00:00.000+0000",60],["2018-02-07T00:00:00.000+0000",46],["2018-02-08T00:00:00.000+0000",28]]
//the "estate" endpoints need parameters, the others work by adding params
// /api/v1/dtl/FootFallByFloorDetailPerFloor?buildingName=Munich&floorName=Munich_FLOOR1



// occupancy object looks like so...TODO, hourly graph of
// {
//     "next": {
//         "unit": "count",
//         "value": 76
//     },
//     "updatedTime": "2018-02-08T04:30:00.023+0530",
//     "previous": {
//         "unit": "count",
//         "value": 32
//     },
//     "timeOffset": "+05:30",
//     "extended": "demographics",
//     "demographics": {
//         "men": {
//             "count": 9,
//             "averageAge": 47
//         },
//         "women": {
//             "count": 9,
//             "averageAge": 26
//         }
//     }
// }

// app.get('/ui', function(req, res) {
//     res.sendFile('./index.html', {root: '.'});
// });
// app.use(express.static(__dirname));
// app.use(express.static(__dirname + '/src'));
app.listen(port, () => console.log(`Example app listening on port ${port}!`))
