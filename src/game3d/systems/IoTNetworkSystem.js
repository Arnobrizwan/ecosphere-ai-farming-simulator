import * as THREE from 'three';

/**
 * IoT Network System - Manages all IoT devices and data flow
 */
export class IoTNetworkSystem {
  constructor(scene) {
    this.scene = scene;
    this.devices = [];
    this.networkHub = null;
    this.dataPackets = [];
    this.alerts = [];
    this.onAlert = null;
    
    this.createNetworkHub();
  }

  createNetworkHub() {
    // Central hub for network visualization
    const hubGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 16);
    const hubMaterial = new THREE.MeshStandardMaterial({
      color: 0x356899,
      emissive: 0x356899,
      emissiveIntensity: 0.5,
      metalness: 0.7
    });
    
    this.networkHub = new THREE.Mesh(hubGeometry, hubMaterial);
    this.networkHub.position.set(0, 0.25, 0);
    this.scene.add(this.networkHub);
  }

  addDevice(device) {
    this.devices.push(device);
    
    // Setup device callbacks
    device.onAlert = (reading, reason) => {
      this.handleDeviceAlert(device, reading, reason);
    };
  }

  removeDevice(device) {
    const index = this.devices.indexOf(device);
    if (index > -1) {
      this.devices.splice(index, 1);
      device.dispose();
    }
  }

  update(deltaTime) {
    // Update all devices
    this.devices.forEach(device => {
      device.update(deltaTime);
      
      // Show data packets periodically
      if (device.status !== 'offline' && Math.random() < 0.01) {
        this.createDataPacket(device);
      }
    });
    
    // Update data packets
    this.updateDataPackets(deltaTime);
    
    // Update network hub pulse
    if (this.networkHub) {
      const intensity = 0.3 + Math.sin(Date.now() * 0.003) * 0.2;
      this.networkHub.material.emissiveIntensity = intensity;
    }
  }

  createDataPacket(device) {
    const packetGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const packetMaterial = new THREE.MeshBasicMaterial({
      color: device.getStatusColor(),
      emissive: device.getStatusColor(),
      emissiveIntensity: 1,
      transparent: true,
      opacity: 0.8
    });
    
    const packet = new THREE.Mesh(packetGeometry, packetMaterial);
    packet.position.copy(device.mesh.position);
    
    const packetData = {
      mesh: packet,
      startPos: device.mesh.position.clone(),
      endPos: this.networkHub.position.clone(),
      progress: 0,
      speed: 0.5 // 0.5 seconds to reach hub
    };
    
    this.scene.add(packet);
    this.dataPackets.push(packetData);
  }

  updateDataPackets(deltaTime) {
    for (let i = this.dataPackets.length - 1; i >= 0; i--) {
      const packet = this.dataPackets[i];
      packet.progress += deltaTime / packet.speed;
      
      if (packet.progress >= 1) {
        // Packet reached hub
        this.scene.remove(packet.mesh);
        packet.mesh.geometry.dispose();
        packet.mesh.material.dispose();
        this.dataPackets.splice(i, 1);
      } else {
        // Move packet
        packet.mesh.position.lerpVectors(
          packet.startPos,
          packet.endPos,
          packet.progress
        );
      }
    }
  }

  handleDeviceAlert(device, reading, reason) {
    const alert = {
      device,
      reading,
      reason,
      timestamp: Date.now(),
      acknowledged: false
    };
    
    this.alerts.push(alert);
    
    // Create alert beacon
    this.createAlertBeacon(device);
    
    // Notify listeners
    if (this.onAlert) {
      this.onAlert(device, reason);
    }
  }

  createAlertBeacon(device) {
    // Create red beam shooting upward
    const beamGeometry = new THREE.CylinderGeometry(0.1, 0.2, 5, 8);
    const beamMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF0000,
      transparent: true,
      opacity: 0.5
    });
    
    const beacon = new THREE.Mesh(beamGeometry, beamMaterial);
    beacon.position.copy(device.mesh.position);
    beacon.position.y += 2.5;
    
    this.scene.add(beacon);
    
    // Animate beacon
    const startTime = Date.now();
    const duration = 3000; // 3 seconds
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress < 1) {
        beacon.material.opacity = 0.5 * (1 - progress);
        beacon.scale.y = 1 + progress * 0.5;
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(beacon);
        beacon.geometry.dispose();
        beacon.material.dispose();
      }
    };
    
    animate();
  }

  getDeviceById(id) {
    return this.devices.find(d => d.id === id);
  }

  getDevicesByType(type) {
    return this.devices.filter(d => d.type === type);
  }

  getActiveAlerts() {
    return this.alerts.filter(a => !a.acknowledged);
  }

  acknowledgeAlert(alert) {
    alert.acknowledged = true;
  }

  getNetworkStatus() {
    const total = this.devices.length;
    const online = this.devices.filter(d => d.status !== 'offline').length;
    const warnings = this.devices.filter(d => d.status === 'warning').length;
    const critical = this.devices.filter(d => d.status === 'critical').length;
    
    return {
      total,
      online,
      offline: total - online,
      warnings,
      critical,
      health: total > 0 ? (online / total) * 100 : 0
    };
  }

  dispose() {
    this.devices.forEach(device => device.dispose());
    this.devices = [];
    
    this.dataPackets.forEach(packet => {
      this.scene.remove(packet.mesh);
      packet.mesh.geometry.dispose();
      packet.mesh.material.dispose();
    });
    this.dataPackets = [];
    
    if (this.networkHub) {
      this.scene.remove(this.networkHub);
      this.networkHub.geometry.dispose();
      this.networkHub.material.dispose();
    }
  }
}

export default IoTNetworkSystem;
