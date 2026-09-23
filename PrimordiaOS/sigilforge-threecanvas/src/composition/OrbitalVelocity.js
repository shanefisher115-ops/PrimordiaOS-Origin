export class OrbitalVelocityController {
    layers = new Map();
    constructor() {
        this.initDefaultLayers();
    }
    initDefaultLayers() {
        // 10 composition layers with alternating counter-rotational orbital speeds
        const layerConfigs = [
            { layer: 0, speed: 0.05 },
            { layer: 1, speed: -0.08 },
            { layer: 2, speed: 0.12 },
            { layer: 3, speed: -0.15 },
            { layer: 4, speed: 0.09 },
            { layer: 5, speed: -0.11 },
            { layer: 6, speed: 0.18 },
            { layer: 7, speed: -0.14 },
            { layer: 8, speed: 0.07 },
            { layer: 9, speed: -0.06 },
        ];
        for (const config of layerConfigs) {
            this.layers.set(config.layer, {
                layerIndex: config.layer,
                angle: 0,
                baseVelocity: config.speed,
                currentVelocity: config.speed,
                damping: 0.95,
            });
        }
    }
    setLayerVelocity(layerIndex, velocity) {
        const layer = this.getOrCreateLayer(layerIndex);
        layer.baseVelocity = velocity;
        layer.currentVelocity = velocity;
    }
    addTorque(layerIndex, torque) {
        const layer = this.getOrCreateLayer(layerIndex);
        layer.currentVelocity += torque;
    }
    applyGlobalTorque(torque) {
        for (const layer of this.layers.values()) {
            layer.currentVelocity += torque * (layer.baseVelocity >= 0 ? 1 : -1);
        }
    }
    getAngle(layerIndex) {
        return this.getOrCreateLayer(layerIndex).angle;
    }
    update(deltaTime, audioEnergy = 0, bass = 0) {
        const speedBoost = 1.0 + bass * 1.5 + audioEnergy * 0.8;
        for (const layer of this.layers.values()) {
            // Step angle forward
            layer.angle = (layer.angle + layer.currentVelocity * speedBoost * deltaTime) % (Math.PI * 2);
            // Relax currentVelocity back towards baseVelocity
            layer.currentVelocity =
                layer.baseVelocity + (layer.currentVelocity - layer.baseVelocity) * layer.damping;
        }
    }
    reset() {
        for (const layer of this.layers.values()) {
            layer.angle = 0;
            layer.currentVelocity = layer.baseVelocity;
        }
    }
    getOrCreateLayer(layerIndex) {
        let layer = this.layers.get(layerIndex);
        if (!layer) {
            const defaultSpeed = (layerIndex % 2 === 0 ? 1 : -1) * (0.05 + (layerIndex * 0.015));
            layer = {
                layerIndex,
                angle: 0,
                baseVelocity: defaultSpeed,
                currentVelocity: defaultSpeed,
                damping: 0.95,
            };
            this.layers.set(layerIndex, layer);
        }
        return layer;
    }
}
