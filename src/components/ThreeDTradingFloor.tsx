import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Layers,
  Eye,
  Sliders,
  ChevronDown,
  ChevronUp,
  RotateCw,
  Zap,
  Cpu,
  Activity,
  Maximize2
} from 'lucide-react';

interface ThreeDTradingFloorProps {
  bids?: { price: number; volume: number }[];
  asks?: { price: number; volume: number }[];
  ingestTps?: number;
  matchTps?: number;
  burstMode?: boolean;
}

// Module-scope scratch objects to avoid GC allocation during render loop
const _vec3 = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3(14, 12, 16);
const _targetLookAt = new THREE.Vector3(0, 2, 0);

export const ThreeDTradingFloor: React.FC<ThreeDTradingFloorProps> = ({
  bids = [],
  asks = [],
  ingestTps = 24800,
  matchTps = 24780,
  burstMode = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [explodedOffset, setExplodedOffset] = useState(0);
  const [wireframeMode, setWireframeMode] = useState(false);
  const [viewPreset, setViewPreset] = useState<'iso' | 'ring' | 'depth' | 'core'>('iso');
  const [radarActive, setRadarActive] = useState(true);

  // References for mutable animation handles
  const animStateRef = useRef({
    exploded: 0,
    targetExploded: 0,
    radarAngle: 0,
    dataPulseAngle: 0,
    wireframe: false,
    radarActive: true,
    bidBars: [] as THREE.Mesh[],
    askBars: [] as THREE.Mesh[],
    ringParticles: null as THREE.Points | null,
    heatsinkGroup: null as THREE.Group | null,
    ringBufferGroup: null as THREE.Group | null,
    radarBeam: null as THREE.Mesh | null,
    controls: null as OrbitControls | null,
    camera: null as THREE.PerspectiveCamera | null
  });

  // Sync state to ref to avoid stale closures in requestAnimationFrame
  useEffect(() => {
    animStateRef.current.targetExploded = explodedOffset;
    animStateRef.current.wireframe = wireframeMode;
    animStateRef.current.radarActive = radarActive;
  }, [explodedOffset, wireframeMode, radarActive]);

  // Handle Preset Camera Views
  const handleSelectPreset = (preset: 'iso' | 'ring' | 'depth' | 'core') => {
    setViewPreset(preset);
    const camera = animStateRef.current.camera;
    const controls = animStateRef.current.controls;
    if (!camera || !controls) return;

    if (preset === 'iso') {
      _targetCamPos.set(14, 12, 16);
      _targetLookAt.set(0, 2, 0);
    } else if (preset === 'ring') {
      _targetCamPos.set(0, 14, 8);
      _targetLookAt.set(0, 3, 0);
    } else if (preset === 'depth') {
      _targetCamPos.set(12, 6, 2);
      _targetLookAt.set(0, 3, 0);
    } else if (preset === 'core') {
      _targetCamPos.set(0, 5, 6);
      _targetLookAt.set(0, 2.5, 0);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x131722);
    scene.fog = new THREE.FogExp2(0x131722, 0.022);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(14, 12, 16);
    animStateRef.current.camera = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 2. Studio Environment Reflection via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. OrbitControls with smooth exponential damping
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent going beneath floor
    controls.minDistance = 4;
    controls.maxDistance = 40;
    controls.target.set(0, 2, 0);
    animStateRef.current.controls = controls;

    // 4. Lighting Rig (Key Light + Cool Hemisphere Fill + Accent LEDs)
    const keyLight = new THREE.DirectionalLight(0xfff3e0, 2.4);
    keyLight.position.set(12, 18, 12);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 40;
    const d = 10;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0x567794, 0x141824, 1.2);
    scene.add(hemiLight);

    // Accent Point Lights for Bids/Asks
    const bidLight = new THREE.PointLight(0x5ea387, 1.5, 12);
    bidLight.position.set(-4, 4, 0);
    scene.add(bidLight);

    const askLight = new THREE.PointLight(0xc46365, 1.5, 12);
    askLight.position.set(4, 4, 0);
    scene.add(askLight);

    // 5. Procedural Ground Grid Texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#131722';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#222938';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 512; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, x);
      ctx.lineTo(512, x);
      ctx.stroke();
    }
    // Subtle crosshairs
    ctx.strokeStyle = '#323c52';
    ctx.lineWidth = 2;
    ctx.strokeRect(64, 64, 384, 384);

    const floorTexture = new THREE.CanvasTexture(canvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(16, 16);
    floorTexture.colorSpace = THREE.SRGBColorSpace;
    floorTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const floorGeo = new THREE.PlaneGeometry(120, 120);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.85,
      metalness: 0.15
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Soft Contact Shadow Plane directly beneath chassis
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(128, 128, 10, 128, 128, 120);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
    grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 256, 256);

    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0.55
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.02; // Offset to avoid z-fighting
    scene.add(contactShadow);

    // 6. Assemble Composite 3-12 Part Procedural Hardware Model (THREE.Group)
    const masterGroup = new THREE.Group();
    scene.add(masterGroup);

    // Part 1: Primary Server Blade Chassis (Cold Blued Steel)
    const chassisGeo = new THREE.BoxGeometry(11, 0.5, 9);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x1a2130,
      metalness: 0.85,
      roughness: 0.35
    });
    const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
    chassisMesh.position.y = 0.25;
    chassisMesh.castShadow = true;
    chassisMesh.receiveShadow = true;
    masterGroup.add(chassisMesh);

    // Part 2: Matte Motherboard PCB with Gold Contact Traces
    const pcbGeo = new THREE.BoxGeometry(10.5, 0.1, 8.5);
    const pcbMat = new THREE.MeshStandardMaterial({
      color: 0x0f1820,
      metalness: 0.3,
      roughness: 0.75
    });
    const pcbMesh = new THREE.Mesh(pcbGeo, pcbMat);
    pcbMesh.position.y = 0.55;
    pcbMesh.receiveShadow = true;
    masterGroup.add(pcbMesh);

    // Part 3: Dual CPU Socket & Copper Heat Spreader Blocks
    const cpuMat = new THREE.MeshPhysicalMaterial({
      color: 0xb87333,
      metalness: 0.95,
      roughness: 0.18,
      clearcoat: 0.6
    });
    const cpu1 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.25, 2.2), cpuMat);
    cpu1.position.set(-1.8, 0.7, 0);
    cpu1.castShadow = true;
    masterGroup.add(cpu1);

    const cpu2 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.25, 2.2), cpuMat);
    cpu2.position.set(1.8, 0.7, 0);
    cpu2.castShadow = true;
    masterGroup.add(cpu2);

    // Part 4: Heatsink Fin Stack (Separates during Exploded View)
    const heatsinkGroup = new THREE.Group();
    masterGroup.add(heatsinkGroup);
    animStateRef.current.heatsinkGroup = heatsinkGroup;

    const finMat = new THREE.MeshStandardMaterial({
      color: 0x8ca0b4,
      metalness: 0.9,
      roughness: 0.25
    });
    for (let f = 0; f < 14; f++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(6.5, 1.2, 0.08), finMat);
      fin.position.set(0, 1.4, -2.6 + f * 0.4);
      fin.castShadow = true;
      heatsinkGroup.add(fin);
    }
    const heatpipeMat = new THREE.MeshPhysicalMaterial({
      color: 0xc87d55,
      metalness: 0.9,
      roughness: 0.15
    });
    const pipe1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6.2, 16), heatpipeMat);
    pipe1.rotation.z = Math.PI / 2;
    pipe1.position.set(0, 1.3, -1);
    heatsinkGroup.add(pipe1);
    const pipe2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6.2, 16), heatpipeMat);
    pipe2.rotation.z = Math.PI / 2;
    pipe2.position.set(0, 1.3, 1);
    heatsinkGroup.add(pipe2);

    // Part 5: PCIe FPGA Low-Latency NIC Blade
    const nicGroup = new THREE.Group();
    nicGroup.position.set(-4.2, 1.2, 0);
    masterGroup.add(nicGroup);

    const nicPcb = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.8, 6), new THREE.MeshStandardMaterial({
      color: 0x1b2838,
      metalness: 0.5,
      roughness: 0.5
    }));
    nicGroup.add(nicPcb);

    // Dual Optical Transceivers (QSFP28)
    const optMat = new THREE.MeshStandardMaterial({ color: 0x607d8b, metalness: 0.8, roughness: 0.3 });
    const opt1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.7), optMat);
    opt1.position.set(0.2, 0.4, 2.2);
    nicGroup.add(opt1);
    const opt2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.7), optMat);
    opt2.position.set(0.2, -0.4, 2.2);
    nicGroup.add(opt2);

    // Part 6: Toroidal Memory-Mapped Lock-Free Ring Buffer (Holographic Conduit)
    const ringBufferGroup = new THREE.Group();
    ringBufferGroup.position.set(0, 3.2, 0);
    masterGroup.add(ringBufferGroup);
    animStateRef.current.ringBufferGroup = ringBufferGroup;

    const torusGeo = new THREE.TorusGeometry(3.6, 0.22, 24, 72);
    const torusMat = new THREE.MeshPhysicalMaterial({
      color: 0x8ca0b4,
      metalness: 0.2,
      roughness: 0.1,
      transmission: 0.75,
      ior: 1.5,
      transparent: true,
      opacity: 0.8
    });
    const ringTorus = new THREE.Mesh(torusGeo, torusMat);
    ringTorus.rotation.x = Math.PI / 2;
    ringBufferGroup.add(ringTorus);

    // Orbital Data Pulses inside Ring Buffer
    const particleCount = 128;
    const particleGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      posArray[i * 3] = Math.cos(angle) * 3.6;
      posArray[i * 3 + 1] = 0;
      posArray[i * 3 + 2] = Math.sin(angle) * 3.6;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x7ec1a6,
      size: 0.18,
      transparent: true,
      opacity: 0.95
    });
    const ringParticles = new THREE.Points(particleGeo, particleMat);
    ringBufferGroup.add(ringParticles);
    animStateRef.current.ringParticles = ringParticles;

    // Part 7: Bid Liquidity Depth Tower (Sage Green Extruded Levels)
    const bidBars: THREE.Mesh[] = [];
    const bidMat = new THREE.MeshStandardMaterial({
      color: 0x5ea387,
      metalness: 0.45,
      roughness: 0.35,
      transparent: true,
      opacity: 0.9
    });
    for (let i = 0; i < 8; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.8), bidMat);
      bar.position.set(-2.2 - (i % 3) * 0.9, 0.8 + i * 0.45, -2 + Math.floor(i / 3) * 0.9);
      bar.castShadow = true;
      masterGroup.add(bar);
      bidBars.push(bar);
    }
    animStateRef.current.bidBars = bidBars;

    // Part 8: Ask Liquidity Depth Tower (Brick Red Extruded Levels)
    const askBars: THREE.Mesh[] = [];
    const askMat = new THREE.MeshStandardMaterial({
      color: 0xc46365,
      metalness: 0.45,
      roughness: 0.35,
      transparent: true,
      opacity: 0.9
    });
    for (let i = 0; i < 8; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.8), askMat);
      bar.position.set(2.2 + (i % 3) * 0.9, 0.8 + i * 0.45, -2 + Math.floor(i / 3) * 0.9);
      bar.castShadow = true;
      masterGroup.add(bar);
      askBars.push(bar);
    }
    animStateRef.current.askBars = askBars;

    // Part 9: Central Match Core & Whale Radar Scanner
    const radarBeamGeo = new THREE.ConeGeometry(3.5, 0.1, 4, 1, true);
    const radarBeamMat = new THREE.MeshBasicMaterial({
      color: 0xc29850,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });
    const radarBeam = new THREE.Mesh(radarBeamGeo, radarBeamMat);
    radarBeam.rotation.x = Math.PI / 2;
    radarBeam.position.set(0, 3.2, 0);
    masterGroup.add(radarBeam);
    animStateRef.current.radarBeam = radarBeam;

    // 7. Render Loop with Lossless 60fps & Smooth Damping
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate);

      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const state = animStateRef.current;

      // Smooth camera position damping to target preset
      camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetCamPos.x, 3.5, dt);
      camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetCamPos.y, 3.5, dt);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetCamPos.z, 3.5, dt);

      controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetLookAt.x, 3.5, dt);
      controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetLookAt.y, 3.5, dt);
      controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetLookAt.z, 3.5, dt);
      controls.update();

      // Smooth exploded view damping
      state.exploded = THREE.MathUtils.damp(state.exploded, state.targetExploded, 4.0, dt);
      if (state.heatsinkGroup) {
        state.heatsinkGroup.position.y = state.exploded * 2.5;
      }
      if (state.ringBufferGroup) {
        state.ringBufferGroup.position.y = 3.2 + state.exploded * 3.8;
      }

      // Rotate zero-copy ring buffer data particles
      state.dataPulseAngle += dt * (burstMode ? 4.5 : 2.0);
      if (state.ringParticles) {
        state.ringParticles.rotation.y = state.dataPulseAngle;
      }

      // Rotate Whale Radar Scanner
      if (state.radarActive && state.radarBeam) {
        state.radarAngle += dt * 2.8;
        state.radarBeam.rotation.z = state.radarAngle;
        state.radarBeam.visible = true;
      } else if (state.radarBeam) {
        state.radarBeam.visible = false;
      }

      // Dynamic scale modulation on bid/ask bars representing real-time volume
      const timeScale = currentTime * 0.003;
      state.bidBars.forEach((bar, idx) => {
        const pulse = Math.sin(timeScale + idx * 0.8) * 0.3 + 1.0;
        bar.scale.y = pulse;
      });
      state.askBars.forEach((bar, idx) => {
        const pulse = Math.cos(timeScale + idx * 0.8) * 0.3 + 1.0;
        bar.scale.y = pulse;
      });

      // Wireframe toggle handling
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material as THREE.Material;
          if ('wireframe' in mat) {
            (mat as any).wireframe = state.wireframe;
          }
        }
      });

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // 8. Window Resize Handling
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [burstMode]);

  return (
    <div className="relative w-full h-[680px] bg-[#131722] rounded-lg overflow-hidden border border-[#2a2e39] font-mono select-none">
      {/* Isolated WebGL Mount Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Overlay Spec Badge (Minimal, Non-Occluding) */}
      <div className="absolute top-3 left-3 bg-[#1c2030]/90 backdrop-blur-sm border border-[#2a2e39] px-3 py-2 rounded text-xs flex items-center gap-2.5 pointer-events-none">
        <Cpu className="w-4 h-4 text-[#8ca0b4]" />
        <div>
          <div className="text-[11px] font-bold text-slate-100 flex items-center gap-1.5">
            CHRONOS CORE <span className="text-[#7da98f]">3D SPATIAL ARCHITECTURE</span>
          </div>
          <div className="text-[9px] text-[#64748b]">
            Zero-Copy mmap Torus | PBR Substrate | Nanosecond FIFO Engine
          </div>
        </div>
      </div>

      {/* Top Right Live Telemetry Ticker */}
      <div className="absolute top-3 right-3 bg-[#1c2030]/90 backdrop-blur-sm border border-[#2a2e39] px-3 py-1.5 rounded text-[11px] flex items-center gap-3 pointer-events-none">
        <span className="text-[#64748b]">Throughput:</span>
        <span className="text-[#7da98f] font-bold">{ingestTps.toLocaleString()} ord/s</span>
        <span className="text-slate-600">|</span>
        <span className="text-[#8ca0b4]">Execution: 2.1µs</span>
      </div>

      {/* Unified Bottom Control Dock (<= 15% Viewport footprint) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[94%] max-w-[860px] z-20">
        {/* Collapse / Expand Toggle Button */}
        <div className="flex justify-center -mb-2.5">
          <button
            onClick={() => setIsDockCollapsed(!isDockCollapsed)}
            className="px-3 py-0.5 rounded-t bg-[#1c2030] text-[#8ca0b4] hover:text-slate-200 border-t border-x border-[#2a2e39] text-[10px] font-semibold flex items-center gap-1 shadow-md transition"
          >
            {isDockCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span>{isDockCollapsed ? 'EXPAND CONTROLS' : 'HIDE DOCK'}</span>
          </button>
        </div>

        {/* Dock Panel */}
        {!isDockCollapsed && (
          <div className="bg-[#1c2030]/95 backdrop-blur border border-[#2a2e39] rounded-lg p-3 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* View Camera Presets */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#64748b] uppercase tracking-wider">View:</span>
              <button
                onClick={() => handleSelectPreset('iso')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                  viewPreset === 'iso'
                    ? 'bg-[#2a3444] text-slate-100 border border-[#3d4b60]'
                    : 'text-[#64748b] hover:text-slate-300'
                }`}
              >
                Isometric
              </button>
              <button
                onClick={() => handleSelectPreset('ring')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                  viewPreset === 'ring'
                    ? 'bg-[#2a3444] text-slate-100 border border-[#3d4b60]'
                    : 'text-[#64748b] hover:text-slate-300'
                }`}
              >
                Ring Buffer
              </button>
              <button
                onClick={() => handleSelectPreset('depth')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                  viewPreset === 'depth'
                    ? 'bg-[#2a3444] text-slate-100 border border-[#3d4b60]'
                    : 'text-[#64748b] hover:text-slate-300'
                }`}
              >
                Depth Towers
              </button>
              <button
                onClick={() => handleSelectPreset('core')}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                  viewPreset === 'core'
                    ? 'bg-[#2a3444] text-slate-100 border border-[#3d4b60]'
                    : 'text-[#64748b] hover:text-slate-300'
                }`}
              >
                Core CPU
              </button>
            </div>

            {/* Exploded View Slider */}
            <div className="flex items-center gap-2 flex-1 max-w-[240px]">
              <span className="text-[10px] text-[#64748b] whitespace-nowrap">Explode:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={explodedOffset}
                onChange={(e) => setExplodedOffset(parseFloat(e.target.value))}
                className="w-full accent-[#7da98f]"
              />
              <span className="text-[10px] text-[#8ca0b4] w-7 text-right">
                {Math.round(explodedOffset * 100)}%
              </span>
            </div>

            {/* Feature Toggles */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWireframeMode(!wireframeMode)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition ${
                  wireframeMode
                    ? 'bg-[#151926] text-[#7da98f] border-[#384a3e]'
                    : 'bg-[#151926] text-[#64748b] border-[#2a2e39] hover:text-slate-300'
                }`}
              >
                {wireframeMode ? 'Wireframe ON' : 'PBR Solid'}
              </button>

              <button
                onClick={() => setRadarActive(!radarActive)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold border transition ${
                  radarActive
                    ? 'bg-[#151926] text-[#c29850] border-[#4a391e]'
                    : 'bg-[#151926] text-[#64748b] border-[#2a2e39] hover:text-slate-300'
                }`}
              >
                <Zap className="w-3 h-3" />
                <span>Whale Radar</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
