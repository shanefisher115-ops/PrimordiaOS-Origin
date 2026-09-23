import express from "express";
import { exec } from "child_process";

const app = express();

app.get("/ignite", (_, res) => {
  exec('powershell -File "C:\\Users\\Shane\\primordiaos\\PrimordiaOS-Boot.ps1"', (err, stdout) => {
    if (err) {
      res.send("Error: " + err.message);
      return;
    }
    res.send(stdout);
  });
});

app.listen(3000, () => {
  console.log("PrimordiaOS Cockpit backend running on port 3000");
});
