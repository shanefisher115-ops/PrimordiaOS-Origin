createVhd() {
  return this.diskpart(`
    create vdisk file="${this.vhdPath}" maximum=${this.vhdSizeMb} type=fixed
    select vdisk file="${this.vhdPath}"
    attach vdisk noerr
  `);
}
