import { execSync } from "child_process";
import * as fs from "fs";

export class Bootrealm {
  vhdPath: string;
  vhdSizeMb: number;

  constructor(
    vhdPath = "C:\\Boot\\ventoy.vhd",
    vhdSizeMb = 16000
  ) {
    this.vhdPath = vhdPath;
    this.vhdSizeMb = vhdSizeMb;
  }

  run(cmd: string) {
    try {
      return execSync(cmd, { stdio: "pipe" }).toString();
    } catch (e: any) {
      return e.toString();
    }
  }

  diskpart(script: string) {
    const cleaned = script
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join("\r\n");

    const temp = "C:\\Users\\Shane\\diskpart_script.txt";
    fs.writeFileSync(temp, cleaned);

    return this.run(`diskpart /s "${temp}"`);
  }

  createVhd() {
    return this.diskpart(`
      create vdisk file="${this.vhdPath}" maximum=${this.vhdSizeMb} type=fixed
      select vdisk file="${this.vhdPath}"
      attach vdisk noerr
    `);
  }

  initVhd() {
    return this.diskpart(`
      select vdisk file="${this.vhdPath}"
      attach vdisk noerr
      convert mbr
      create partition primary
      format fs=ntfs quick
      assign letter=V
    `);
  }

  installVentoy() {
    const ventoyPath = `"C:\\Ventoy\\Ventoy2Disk.exe"`;
    return this.run(`${ventoyPath} /Install V: /Yes`);
  }

  createBootEntry() {
    const output = this.run(`bcdedit /copy {current} /d "Primordia BOOTREALM"`);
    const match = output.match(/\{[0-9a-fA-F\\-]+\}/);
    return match ? match[0] : null;
  }

  bootstrap() {
    console.log("Creating VHD...");
    console.log(this.createVhd());

    console.log("Initializing VHD...");
    console.log(this.initVhd());

    console.log("Installing Ventoy...");
    console.log(this.installVentoy());

    console.log("Creating BCDEdit entry...");
    const id = this.createBootEntry();
    console.log("Boot entry:", id);

    return { vhd: this.vhdPath, entry: id };
  }
}
