const jsdom = require("jsdom");
const { JSDOM, ResourceLoader, VirtualConsole } = jsdom;

const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (e) => { console.error("jsdomError:", e); });
virtualConsole.on("error", (...args) => { console.error("error:", ...args); });
virtualConsole.on("warn", (...args) => { console.warn("warn:", ...args); });
virtualConsole.on("log", (...args) => { console.log("log:", ...args); });

async function run() {
  const dom = await JSDOM.fromURL("http://167.172.39.172:2020", {
    runScripts: "dangerously",
    resources: "usable",
    virtualConsole
  });
  
  setTimeout(() => {
    console.log("DONE WAITING");
    process.exit(0);
  }, 10000);
}
run();
