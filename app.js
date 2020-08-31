const finalhandler = require("./lib/coap-finalhandler");
const delay = require("delay");
var Router = require("router");
const coap = require("coap");

var router = Router();

let switches = {};

let switchesObservers = {};

function getOptionValue(options, optionName) {
  for (let i = 0; i < options.length; i++) {
    const o = options[i];
    if (o.name == optionName) return o.value;
  }
  return null;
}

router.get("/sw/:id", async function (req, res) {
  let id = req.params.id;
  if (getOptionValue(req.options, "Observe") === 0) {
    console.log("START OBS SESSION");
    var buffer = Buffer.from([parseInt(id), switches[id] ? 0 : 1]);
    res.write(buffer);
    switchesObservers[id] = (newState) => {
      var buffer = Buffer.from([parseInt(id), newState ? 0 : 1]);
      res.write(buffer);
    };
  } else if (getOptionValue(req.options, "Observe") === 1) {
    delete switchesObservers[id];
    console.log("ENDED OBS SESSION");
  } else {
    res.end(switches[id] ? "1" : "0");
  }
});

router.delete("/sw/:id", function (req, res) {
  let id = req.params.id;
  delete switches[id];
  res.end("DELETED");
});

router.put("/sw/:id", function (req, res) {
  let id = req.params.id;
  let payload = req.payload.toString();
  let newState = payload == "0" ? false : true;
  switches[id] = newState;
  let obs = switchesObservers[id];
  if (obs) {
    obs(newState);
  }
  res.end(`UPDATED`);
});

router.get("/sw", function (req, res) {
  res.end(JSON.stringify(switches, null, 2));
});

router.post("/sw", function (req, res) {
  let payload = req.payload.toString(); // 54:0
  let id = payload.split(":")[0];
  let state = payload.split(":")[1] == "0" ? false : true;
  switches[id] = state;
  res.end(`ADDED`);
});

router.get("/sayhello/:name", function (req, res) {
  res.end(`Hello ${req.params.name}!`);
});

router.get("/echo/:msg", function (req, res) {
  res.end(req.params.msg);
});

router.post("/echo", function (req, res) {
  res.end(req.payload.toString());
});

const server = coap.createServer((req, res) => {
  console.log("==================================");
  console.log(JSON.stringify(req, null, 2));
  console.log("==================================");
  router(req, res, finalhandler(req, res));
});
server.listen();

// server.on("request", async function (req, res) {
//   if (req.url == "/exit") {
//     process.exit(0);
//   }
//   console.log(req.constructor.name, res.constructor.name);
//   console.log(`>> ${req.method} ${req.code} ${req.url}`);
//   console.log(`  Headers:`);
//   Object.entries(req.headers).forEach(([key, value]) => {
//     console.log(`    ${key}: ${value.toString()}`);
//   });
//   console.log(`  Options:`);
//   req.options.forEach((opt) => {
//     console.log(`    ${opt.name}: ${opt.value.toString()}`);
//   });
//   if (req.headers["Observe"] === 0) {
//     for (let i = 0; i < 10; i++) {
//       res.write(`i=${i}`);
//       console.log("SENDING", i);
//       await delay(1000);
//     }
//     res.end("DONE");
//   } else {
//     res.end(`OK\n`);
//   }
// });

// the default CoAP port is 5683
// var req = coap.request("coap://localhost/Matteo");

// req.on("response", function (res) {
//   res.pipe(process.stdout);
//   res.on("end", function () {
//     process.exit(0);
//   });
// });

// req.end();

/*
------Cloud
---Devices
  - Mobile/Web (User Interface)
  - Cloud
  - Hub

Push State from server to Hub based on (UI) interaction
Push State from server to UI based on (HUB) changes


------Local
---Devices
  - Mobile/Web (User Interface)
  - Hub (act as a server)

Send State from UI to Hub
Push State from Hub to UI
----


CoAP
Cloud
Hub <- OBS -> Server
Mobile <- OBS -> Server


*/
