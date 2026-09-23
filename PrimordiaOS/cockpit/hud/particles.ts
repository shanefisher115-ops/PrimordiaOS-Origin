export class AmbientParticles {
  private particleCount: number = 256;

  emitSlipstreamParticles() {
    return {
      activeParticles: this.particleCount,
      velocityDispersion: 4.8,
      colorSignature: "#4FD1C5"
    };
  }
}