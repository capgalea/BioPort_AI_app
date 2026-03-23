import fs from "fs";
const lines = fs.readFileSync("debug.log", "utf8").split("\n");
console.log(lines.slice(-20).join("\n"));
