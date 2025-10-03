import * as THREE from 'three';

/**
 * Base IoT Device Class
 * All smart farm devices extend this
 */
export class IoTDevice {
  constructor(scene, position, type) {
    this.scene = scene;
    this.position = position || new THREE.Vector3(0, 0, 0);
    this.type = type;
    this.mesh = null;
    this.id = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.status = 'normal'; // normal, warning, critical, offline
    this.battery = 100;
    this.batteryDrainRate = 0.5; // % per game day
    this.lastReading = null;
    this.lastUpdate = Date.now();
    this.alertThreshold = null;
    this.onAlert = null;
    this.onUpdate = null;
    this.range = 5;
    this.cost = 50;
    this.accuracy = 85;
    this.infoPanel = null;
    
    this.createMesh();
    if (this.mesh) {
      this.mesh.position.copy(this.position);
      this.scene.add(this.mesh);
    }
  }

  createMesh() {
    // Override in subclasses
    return new THREE.Group();
  }

  update(deltaTime) {
    // Drain battery
    this.battery -= this.batteryDrainRate * (deltaTime / 86400); // Convert to days
    
    if (this.battery <= 0) {
      this.status = 'offline';
      this.battery = 0;
    } else if (this.battery < 20) {
      this.status = 'warning';
    }
    
    // Update readings
    if (this.status !== 'offline') {
      this.updateReading();
    }
  }

  updateReading() {
    // Override in subclasses
  }

  getCurrentReading() {
    return this.lastReading;
  }

  setAlertThreshold(threshold) {
    this.alertThreshold = threshold;
  }

  checkAlert() {
    if (this.alertThreshold !== null && this.lastReading !== null) {
      if (this.lastReading < this.alertThreshold) {
        this.triggerAlert(`Reading below threshold: ${this.lastReading}`);
      }
    }
  }

  triggerAlert(reason) {
    this.status = 'critical';
    if (this.onAlert) {
      this.onAlert(this.lastReading, reason);
    }
  }

  replaceBattery() {
    this.battery = 100;
    if (this.status === 'offline') {
      this.status = 'normal';
    }
  }

  highlight() {
    if (!this.mesh) return;
    
    this.mesh.traverse((child) => {
      if (child.material) {
        child.material.emissive = child.material.emissive || new THREE.Color(0x000000);
        child.material.emissive.setHex(0x34A853);
        child.material.emissiveIntensity = 0.3;
      }
    });
  }

  unhighlight() {
    if (!this.mesh) return;
    
    this.mesh.traverse((child) => {
      if (child.material && child.material.emissive) {
        child.material.emissive.setHex(0x000000);
        child.material.emissiveIntensity = 0;
      }
    });
  }

  getStatusColor() {
    switch (this.status) {
      case 'normal': return 0x00FF00;
      case 'warning': return 0xFFFF00;
      case 'critical': return 0xFF0000;
      case 'offline': return 0x808080;
      default: return 0x00FF00;
    }
  }

  dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
  }
}

/**
 * Soil Moisture Sensor
 */
export class SoilMoistureSensor extends IoTDevice {
  constructor(scene, position) {
    super(scene, position, 'soilMoisture');
    this.name = 'Soil Moisture Sensor';
    this.icon = '💧';
    this.range = 5;
    this.cost = 50;
    this.updateInterval = 300000; // 5 minutes
    this.led = null;
  }

  createMesh() {
    const group = new THREE.Group();
    
    // Stake inserted in ground
    const stakeGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8);
    const stakeMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const stake = new THREE.Mesh(stakeGeometry, stakeMaterial);
    stake.position.y = -0.3;
    stake.castShadow = true;
    group.add(stake);
    
    // Sensor head
    const headGeometry = new THREE.BoxGeometry(0.15, 0.1, 0.15);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0x356899, metalness: 0.5 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.15;
    head.castShadow = true;
    group.add(head);
    
    // Status LED
    const ledGeometry = new THREE.SphereGeometry(0.03, 16, 16);
    const ledMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FF00,
      emissive: 0x00FF00,
      emissiveIntensity: 1
    });
    const led = new THREE.Mesh(ledGeometry, ledMaterial);
    led.position.set(0, 0.2, 0.08);
    group.add(led);
    this.led = led;
    
    this.mesh = group;
    return group;
  }

  updateReading() {
    // Simulate soil moisture reading (would integrate with actual plot data)
    const baseReading = 50;
    const variation = (Math.random() - 0.5) * 20;
    this.lastReading = Math.max(0, Math.min(100, baseReading + variation));
    
    this.updateLED();
    this.checkAlert();
    
    if (this.onUpdate) {
      this.onUpdate({ moisture: this.lastReading });
    }
  }

  updateLED() {
    if (!this.led) return;
    
    const reading = this.lastReading;
    
    if (this.status === 'offline') {
      this.led.material.color.setHex(0x808080);
      this.led.material.emissive.setHex(0x808080);
      this.led.material.emissiveIntensity = 0.2;
    } else if (reading < 20) {
      this.led.material.color.setHex(0xFF0000); // Red - dry
      this.led.material.emissive.setHex(0xFF0000);
      this.led.material.emissiveIntensity = 1;
    } else if (reading < 40) {
      this.led.material.color.setHex(0xFFFF00); // Yellow - low
      this.led.material.emissive.setHex(0xFFFF00);
      this.led.material.emissiveIntensity = 1;
    } else {
      this.led.material.color.setHex(0x00FF00); // Green - good
      this.led.material.emissive.setHex(0x00FF00);
      this.led.material.emissiveIntensity = 1;
    }
  }

  update(deltaTime) {
    super.update(deltaTime);
    
    // Pulse animation
    if (this.led && this.status !== 'offline') {
      const scale = 1 + Math.sin(Date.now() * 0.003) * 0.2;
      this.led.scale.set(scale, scale, scale);
    }
  }
}

/**
 * Weather Station
 */
export class WeatherStation extends IoTDevice {
  constructor(scene, position) {
    super(scene, position, 'weather');
    this.name = 'Weather Station';
    this.icon = '🌡️';
    this.range = 100; // Farm-wide
    this.cost = 150;
    this.batteryDrainRate = 0.3; // Solar backup
    this.temperature = 25;
    this.humidity = 60;
    this.windSpeed = 5;
    this.rainfall = 0;
    this.anemometer = null;
  }

  createMesh() {
    const group = new THREE.Group();
    
    // Pole
    const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3, 8);
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0xC0C0C0, metalness: 0.7 });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.castShadow = true;
    group.add(pole);
    
    // Anemometer (wind cups)
    const anemometer = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const cupGeometry = new THREE.SphereGeometry(0.1, 8, 8);
      const cupMaterial = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
      const cup = new THREE.Mesh(cupGeometry, cupMaterial);
      const angle = (i / 3) * Math.PI * 2;
      cup.position.set(Math.cos(angle) * 0.3, 0, Math.sin(angle) * 0.3);
      anemometer.add(cup);
    }
    anemometer.position.y = 3.2;
    group.add(anemometer);
    this.anemometer = anemometer;
    
    // Rain gauge
    const rainGaugeGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.5, 16);
    const rainGaugeMaterial = new THREE.MeshStandardMaterial({
      color: 0x87CEEB,
      transparent: true,
      opacity: 0.6
    });
    const rainGauge = new THREE.Mesh(rainGaugeGeometry, rainGaugeMaterial);
    rainGauge.position.y = 2.5;
    group.add(rainGauge);
    
    // Temperature sensor box
    const tempGeometry = new THREE.BoxGeometry(0.2, 0.3, 0.1);
    const tempMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
    const tempSensor = new THREE.Mesh(tempGeometry, tempMaterial);
    tempSensor.position.y = 2;
    group.add(tempSensor);
    
    this.mesh = group;
    return group;
  }

  updateReading() {
    // Simulate weather data
    this.temperature = 20 + Math.random() * 15;
    this.humidity = 40 + Math.random() * 40;
    this.windSpeed = Math.random() * 15;
    this.rainfall = Math.random() * 5;
    
    this.lastReading = {
      temp: this.temperature,
      humidity: this.humidity,
      wind: this.windSpeed,
      rain: this.rainfall
    };
    
    if (this.onUpdate) {
      this.onUpdate(this.lastReading);
    }
  }

  update(deltaTime) {
    super.update(deltaTime);
    
    // Animate anemometer
    if (this.anemometer && this.status !== 'offline') {
      this.anemometer.rotation.y += this.windSpeed * deltaTime * 0.1;
    }
  }
}

/**
 * Irrigation Controller
 */
export class IrrigationController extends IoTDevice {
  constructor(scene, position, connectedPlots = []) {
    super(scene, position, 'irrigation');
    this.name = 'Irrigation Controller';
    this.icon = '💧';
    this.range = 20;
    this.cost = 200;
    this.connectedPlots = connectedPlots;
    this.isActive = false;
    this.valve = null;
    this.pipes = [];
  }

  createMesh() {
    const group = new THREE.Group();
    
    // Control box
    const boxGeometry = new THREE.BoxGeometry(0.6, 0.8, 0.3);
    const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x34A853, metalness: 0.5 });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.y = 0.4;
    box.castShadow = true;
    group.add(box);
    
    // Valve wheel
    const valveGeometry = new THREE.TorusGeometry(0.15, 0.04, 8, 16);
    const valveMaterial = new THREE.MeshStandardMaterial({ color: 0xFF0000, metalness: 0.6 });
    const valve = new THREE.Mesh(valveGeometry, valveMaterial);
    valve.position.set(0.35, 0.4, 0);
    valve.rotation.y = Math.PI / 2;
    group.add(valve);
    this.valve = valve;
    
    // Status LED
    const ledGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const ledMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FF00,
      emissive: 0x00FF00
    });
    const led = new THREE.Mesh(ledGeometry, ledMaterial);
    led.position.set(0, 0.7, 0.16);
    group.add(led);
    this.led = led;
    
    this.mesh = group;
    return group;
  }

  activateIrrigation(plot) {
    if (this.status === 'offline') return;
    
    this.isActive = true;
    
    // Update plot moisture
    if (plot && plot.userData) {
      plot.userData.soilMoisture = Math.min(100, (plot.userData.soilMoisture || 50) + 30);
      plot.userData.lastWatered = Date.now();
    }
    
    // Visual feedback
    if (this.led) {
      this.led.material.color.setHex(0x00FFFF);
      this.led.material.emissive.setHex(0x00FFFF);
    }
    
    // Auto-deactivate after 5 seconds
    setTimeout(() => {
      this.isActive = false;
      if (this.led) {
        this.led.material.color.setHex(0x00FF00);
        this.led.material.emissive.setHex(0x00FF00);
      }
    }, 5000);
  }

  update(deltaTime) {
    super.update(deltaTime);
    
    // Rotate valve when active
    if (this.valve && this.isActive) {
      this.valve.rotation.z += deltaTime * 2;
    }
  }
}

export default IoTDevice;
