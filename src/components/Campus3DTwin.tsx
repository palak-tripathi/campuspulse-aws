import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Box,
  Compass,
  Eye,
  EyeOff,
  Layers,
  RotateCw,
  Wifi,
  BookOpen,
  UtensilsCrossed,
  Radio,
  Thermometer,
} from 'lucide-react';
import { HostelBlock, HostelHealth } from '../types/campus';
import {
  IotHotspotPopup,
  IotSensorNode,
  IotHealthStatus,
} from './IotHotspotPopup';

interface Campus3DTwinProps {
  libraryOccupancyPct: number;
  avgWifiSpeed: number;
  foodWasteSavedKg: number;
  hostels: HostelBlock[];
  hasActiveReservation: boolean;
  onSelectSection: (sectionId: 'library' | 'wifi' | 'mess') => void;
  onOpenArchitecture: () => void;
}

type CameraPreset = 'overview' | 'library' | 'hostels' | 'mess';

interface FocusInfo {
  id: string;
  title: string;
  subtitle: string;
  metric: string;
  targetSection?: 'library' | 'wifi' | 'mess';
}

// Pre-allocated math helpers outside render loop (zero per-frame GC)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _projVec = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

interface HotspotAnchorConfig {
  id: string;
  nodeCode: string;
  zoneName: string;
  shortLabel: string;
  buildingType: 'library' | 'hostel' | 'mess';
  targetSection: 'library' | 'wifi' | 'mess';
  cameraPreset: 'library' | 'hostels' | 'mess';
  baseTempC: number;
  baseCo2: number;
  baseHumidity: number;
  extraLabel: string;
  attachTo: 'lib-f1' | 'lib-f3' | 'world';
  position: [number, number, number];
}

const HOTSPOT_CONFIGS: HotspotAnchorConfig[] = [
  {
    id: 'iot-lib-f1',
    nodeCode: 'IOT-LIB-01',
    zoneName: 'Central Library · Floor 1',
    shortLabel: 'LIB-F1',
    buildingType: 'library',
    targetSection: 'library',
    cameraPreset: 'library',
    baseTempC: 21.4,
    baseCo2: 430,
    baseHumidity: 46,
    extraLabel: 'Acoustic',
    attachTo: 'lib-f1',
    position: [2.45, 0.5, 0.65],
  },
  {
    id: 'iot-lib-f3',
    nodeCode: 'IOT-LAB-03',
    zoneName: 'Digital Research Lab · Floor 3',
    shortLabel: 'LAB-F3',
    buildingType: 'library',
    targetSection: 'library',
    cameraPreset: 'library',
    baseTempC: 20.6,
    baseCo2: 410,
    baseHumidity: 43,
    extraLabel: 'PM2.5',
    attachTo: 'lib-f3',
    position: [-1.95, 0.5, 0.85],
  },
  {
    id: 'iot-hostel-a',
    nodeCode: 'IOT-HST-A',
    zoneName: 'Hostel A · West Quad',
    shortLabel: 'HST-A',
    buildingType: 'hostel',
    targetSection: 'wifi',
    cameraPreset: 'hostels',
    baseTempC: 23.1,
    baseCo2: 485,
    baseHumidity: 49,
    extraLabel: 'Grid Load',
    attachTo: 'world',
    position: [-8.5, 2.35, -5.0],
  },
  {
    id: 'iot-hostel-c',
    nodeCode: 'IOT-HST-C',
    zoneName: 'Hostel C · North Block',
    shortLabel: 'HST-C',
    buildingType: 'hostel',
    targetSection: 'wifi',
    cameraPreset: 'hostels',
    baseTempC: 24.7,
    baseCo2: 675,
    baseHumidity: 54,
    extraLabel: 'Grid Load',
    attachTo: 'world',
    position: [-7.5, 2.95, 6.2],
  },
  {
    id: 'iot-mess',
    nodeCode: 'IOT-DIN-01',
    zoneName: 'Smart Dining & Compost Hub',
    shortLabel: 'DIN-HUB',
    buildingType: 'mess',
    targetSection: 'mess',
    cameraPreset: 'mess',
    baseTempC: 25.2,
    baseCo2: 720,
    baseHumidity: 57,
    extraLabel: 'Compost',
    attachTo: 'world',
    position: [7.2, 2.75, -5.2],
  },
];

function iotStatusToHex(status: IotHealthStatus): number {
  if (status === 'Optimal') return 0x34d399;
  if (status === 'Elevated') return 0xff9900;
  return 0xf43f5e;
}

function buildInitialSensors(
  libraryOccupancyPct: number,
  hostels: HostelBlock[],
  foodWasteSavedKg: number
): IotSensorNode[] {
  const nowLabel = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return HOTSPOT_CONFIGS.map((cfg) => {
    let co2 = cfg.baseCo2;
    let temp = cfg.baseTempC;
    let extraValue = '34 dBA';
    let status: IotHealthStatus = 'Optimal';

    if (cfg.id === 'iot-lib-f1') {
      co2 = Math.round(415 + libraryOccupancyPct * 3.1);
      extraValue = `${Math.round(30 + libraryOccupancyPct * 0.14)} dBA`;
      status = co2 > 750 ? 'Alert' : co2 > 600 ? 'Elevated' : 'Optimal';
    } else if (cfg.id === 'iot-lib-f3') {
      co2 = Math.round(395 + libraryOccupancyPct * 2.4);
      extraValue = '8 µg/m³';
      status = co2 > 700 ? 'Elevated' : 'Optimal';
    } else if (cfg.id === 'iot-hostel-a') {
      const hA = hostels.find((h) => h.id === 'hostel-a');
      co2 = hA?.health === 'Outage' ? 780 : hA?.health === 'High Load' ? 630 : 485;
      temp = hA?.health === 'High Load' ? 24.4 : 23.1;
      extraValue = `${(28 + (hA?.connectedDevices ?? 120) * 0.06).toFixed(1)} kW`;
      status =
        hA?.health === 'Outage'
          ? 'Alert'
          : hA?.health === 'High Load'
          ? 'Elevated'
          : 'Optimal';
    } else if (cfg.id === 'iot-hostel-c') {
      const hC = hostels.find((h) => h.id === 'hostel-c');
      co2 = hC?.health === 'Outage' ? 860 : hC?.health === 'High Load' ? 685 : 520;
      temp = hC?.health === 'High Load' ? 24.8 : 23.5;
      extraValue = `${(32 + (hC?.connectedDevices ?? 160) * 0.07).toFixed(1)} kW`;
      status =
        hC?.health === 'Outage'
          ? 'Alert'
          : hC?.health === 'High Load'
          ? 'Elevated'
          : 'Optimal';
    } else if (cfg.id === 'iot-mess') {
      co2 = Math.round(690 + Math.max(0, 60 - foodWasteSavedKg) * 2);
      extraValue = `${(37.6 + Math.min(2.5, foodWasteSavedKg * 0.02)).toFixed(1)} °C`;
      status = co2 > 820 ? 'Alert' : co2 > 650 ? 'Elevated' : 'Optimal';
    }

    const history = Array.from({ length: 8 }, (_, idx) =>
      Math.max(380, co2 + Math.round(Math.sin(idx * 0.9) * 14))
    );

    return {
      id: cfg.id,
      nodeCode: cfg.nodeCode,
      zoneName: cfg.zoneName,
      shortLabel: cfg.shortLabel,
      buildingType: cfg.buildingType,
      targetSection: cfg.targetSection,
      cameraPreset: cfg.cameraPreset,
      baseTempC: cfg.baseTempC,
      tempC: temp,
      co2Ppm: co2,
      humidityPct: cfg.baseHumidity,
      extraLabel: cfg.extraLabel,
      extraValue,
      status,
      co2History: history,
      lastUpdated: nowLabel,
    };
  });
}

const CAMERA_PRESETS: Record<
  CameraPreset,
  { pos: [number, number, number]; target: [number, number, number]; label: string }
> = {
  overview: {
    pos: [17, 12.5, 19],
    target: [0, 1.8, 0],
    label: 'Campus Overview',
  },
  library: {
    pos: [7.5, 6.8, 8.2],
    target: [0, 2.6, 0],
    label: 'Library Tower',
  },
  hostels: {
    pos: [-13.5, 8.5, 13.5],
    target: [-3.5, 1.5, 2],
    label: 'Hostel Mesh',
  },
  mess: {
    pos: [12.5, 6.2, -9.5],
    target: [6.5, 1.4, -4.5],
    label: 'Dining Hub',
  },
};

function healthToHex(health: HostelHealth): number {
  if (health === 'Optimal') return 0x34d399;
  if (health === 'High Load') return 0xff9900;
  return 0xf43f5e;
}

export const Campus3DTwin: React.FC<Campus3DTwinProps> = ({
  libraryOccupancyPct,
  avgWifiSpeed,
  foodWasteSavedKg,
  hostels,
  hasActiveReservation,
  onSelectSection,
  onOpenArchitecture,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const hotspotPinRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const popupAnchorRef = useRef<HTMLDivElement | null>(null);
  const lastProjectedCoordsRef = useRef<Record<string, { x: number; y: number }>>({});

  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('overview');
  const [autoOrbit, setAutoOrbit] = useState<boolean>(true);
  const [explodedView, setExplodedView] = useState<boolean>(false);
  const [showHotspots, setShowHotspots] = useState<boolean>(true);
  const [hudCollapsed, setHudCollapsed] = useState<boolean>(false);
  const [contextLost, setContextLost] = useState<boolean>(false);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);

  const [iotSensors, setIotSensors] = useState<IotSensorNode[]>(() =>
    buildInitialSensors(libraryOccupancyPct, hostels, foodWasteSavedKg)
  );

  const [focusInfo, setFocusInfo] = useState<FocusInfo>({
    id: 'campus',
    title: 'IITB Smart Campus 3D Digital Twin',
    subtitle: 'Click any glowing IoT sensor pin or building · Drag to orbit',
    metric: `${avgWifiSpeed} Mbps avg · ${libraryOccupancyPct}% lib`,
  });

  // Live telemetry refs so React state changes update the 3D scene without remounting WebGL
  const livePropsRef = useRef({
    libraryOccupancyPct,
    avgWifiSpeed,
    foodWasteSavedKg,
    hostels,
    hasActiveReservation,
    autoOrbit,
    explodedView,
    cameraPreset,
    showHotspots,
    selectedHotspotId,
    iotSensors,
  });

  livePropsRef.current = {
    libraryOccupancyPct,
    avgWifiSpeed,
    foodWasteSavedKg,
    hostels,
    hasActiveReservation,
    autoOrbit,
    explodedView,
    cameraPreset,
    showHotspots,
    selectedHotspotId,
    iotSensors,
  };

  // Real-time simulated IoT sensor network telemetry stream (2.5s ticks)
  useEffect(() => {
    const syncAndJitter = () => {
      const nowLabel = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setIotSensors((prev) => {
        const baseline = buildInitialSensors(
          libraryOccupancyPct,
          hostels,
          foodWasteSavedKg
        );
        return prev.map((curr, idx) => {
          const target = baseline[idx];
          const tempDelta = (Math.random() - 0.5) * 0.28;
          const nextTemp = Number(
            Math.max(
              target.baseTempC - 1.2,
              Math.min(target.baseTempC + 2.4, curr.tempC * 0.6 + target.tempC * 0.4 + tempDelta)
            ).toFixed(1)
          );
          const co2Jitter = Math.round((Math.random() - 0.5) * 18);
          const nextCo2 = Math.max(
            385,
            Math.min(980, Math.round(curr.co2Ppm * 0.55 + target.co2Ppm * 0.45 + co2Jitter))
          );
          const humDelta = Math.round((Math.random() - 0.5) * 2);
          const nextHum = Math.max(36, Math.min(72, target.humidityPct + humDelta));
          const nextStatus: IotHealthStatus =
            nextCo2 > 790 || target.status === 'Alert'
              ? 'Alert'
              : nextCo2 > 610 || target.status === 'Elevated'
              ? 'Elevated'
              : 'Optimal';

          return {
            ...target,
            tempC: nextTemp,
            co2Ppm: nextCo2,
            humidityPct: nextHum,
            status: nextStatus,
            co2History: [...curr.co2History.slice(-9), nextCo2],
            lastUpdated: nowLabel,
          };
        });
      });
    };

    const timer = window.setInterval(syncAndJitter, 2500);
    return () => window.clearInterval(timer);
  }, [libraryOccupancyPct, hostels, foodWasteSavedKg]);

  // Escape key closes open IoT hotspot popup
  useEffect(() => {
    if (!selectedHotspotId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedHotspotId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedHotspotId]);

  const presetTriggerRef = useRef<{ active: boolean; preset: CameraPreset }>({
    active: false,
    preset: 'overview',
  });

  const handlePresetClick = (preset: CameraPreset) => {
    setCameraPreset(preset);
    presetTriggerRef.current = { active: true, preset };
    if (preset === 'library') {
      setFocusInfo({
        id: 'library',
        title: 'Central Library Tower (3 Floors)',
        subtitle: 'Click to jump to Interactive Seat Map',
        metric: `${libraryOccupancyPct}% Occupied`,
        targetSection: 'library',
      });
    } else if (preset === 'hostels') {
      setFocusInfo({
        id: 'hostels',
        title: 'Hostel Mesh A–F',
        subtitle: 'Click to inspect Wi-Fi Speed & Outages',
        metric: `${avgWifiSpeed} Mbps Avg`,
        targetSection: 'wifi',
      });
    } else if (preset === 'mess') {
      setFocusInfo({
        id: 'mess',
        title: 'Smart Dining & Sustainability Pavilion',
        subtitle: 'Click to view Mess Ratings & Waste Chart',
        metric: `${foodWasteSavedKg} kg Saved`,
        targetSection: 'mess',
      });
    } else {
      setFocusInfo({
        id: 'campus',
        title: 'IITB Smart Campus 3D Digital Twin',
        subtitle: 'Interactive WebGL Telemetry · Click any building or drag to orbit',
        metric: `${avgWifiSpeed} Mbps avg · ${libraryOccupancyPct}% lib`,
      });
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    // Software WebGL probe (per Three.js skill guidelines)
    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 460;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener(
      'webglcontextrestored',
      onContextRestored
    );

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070c18);
    scene.fog = new THREE.FogExp2(0x070c18, 0.018);

    // Procedural Studio Environment Map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 160);
    camera.position.set(...CAMERA_PRESETS.overview.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.08;
    controls.minDistance = 6;
    controls.maxDistance = 36;
    controls.target.set(...CAMERA_PRESETS.overview.target);

    controls.addEventListener('start', () => {
      presetTriggerRef.current.active = false;
    });

    // 3-Point + Hemisphere Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffedd5, 1.85);
    keyLight.position.set(14, 22, 12);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 2;
      keyLight.shadow.camera.far = 55;
      const d = 18;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x00f0ff, 1.15);
    rimLight.position.set(-16, 10, -14);
    scene.add(rimLight);

    // Track disposable resources
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];
    const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
      geometries.push(g);
      return g;
    };
    const trackMat = <T extends THREE.Material>(m: T): T => {
      materials.push(m);
      return m;
    };

    // Ground & Procedural Cyber Campus Grid
    const groundGeo = trackGeo(new THREE.CircleGeometry(36, 64));
    const groundMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x0b1324,
        roughness: 0.85,
        metalness: 0.15,
      })
    );
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(34, 34, 0x1e3a5f, 0x111c33);
    gridHelper.position.y = 0.02;
    scene.add(gridHelper);

    // Glowing Central Ring Plaza
    const plazaRingGeo = trackGeo(new THREE.RingGeometry(4.2, 4.45, 64));
    const plazaRingMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45,
      })
    );
    const plazaRing = new THREE.Mesh(plazaRingGeo, plazaRingMat);
    plazaRing.rotation.x = -Math.PI / 2;
    plazaRing.position.y = 0.03;
    scene.add(plazaRing);

    const clickables: THREE.Object3D[] = [];

    // Shared PBR Materials
    const darkMetalMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x172136,
        roughness: 0.38,
        metalness: 0.72,
      })
    );
    const podiumMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.65,
        metalness: 0.25,
      })
    );
    const glassMat = trackMat(
      new THREE.MeshPhysicalMaterial({
        color: 0x0ea5e9,
        roughness: 0.12,
        metalness: 0.1,
        transparent: true,
        opacity: 0.55,
        clearcoat: 1.0,
      })
    );
    const orangeAccentMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xff9900,
        emissive: 0xff9900,
        emissiveIntensity: 0.85,
        roughness: 0.25,
        metalness: 0.6,
      })
    );
    const cyanAccentMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00f0ff,
        emissiveIntensity: 0.85,
        roughness: 0.2,
        metalness: 0.5,
      })
    );

    // --------------------------------------------------------
    // 1. CENTRAL LIBRARY TOWER (Composite 8-part Group, Explodable 3 Floors)
    // --------------------------------------------------------
    const libraryGroup = new THREE.Group();
    libraryGroup.userData = { buildingType: 'library' };
    scene.add(libraryGroup);

    const libBase = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(3.2, 3.6, 0.45, 8)),
      podiumMat
    );
    libBase.position.y = 0.225;
    libBase.receiveShadow = true;
    libBase.castShadow = true;
    libraryGroup.add(libBase);

    const libFloors: THREE.Group[] = [];
    const libFloorMats: THREE.MeshStandardMaterial[] = [];

    for (let f = 0; f < 3; f++) {
      const floorGroup = new THREE.Group();
      const baseY = 0.6 + f * 1.15;
      floorGroup.position.y = baseY;
      floorGroup.userData = { baseY, floorIdx: f };

      const radius = 2.45 - f * 0.22;
      const coreMesh = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(radius * 0.72, radius * 0.75, 0.85, 8)),
        darkMetalMat
      );
      coreMesh.castShadow = true;
      coreMesh.receiveShadow = true;
      coreMesh.userData = { buildingType: 'library' };
      floorGroup.add(coreMesh);

      const glassShell = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(radius, radius, 0.72, 8)),
        glassMat
      );
      glassShell.userData = { buildingType: 'library' };
      floorGroup.add(glassShell);

      const ringMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: f === 1 ? 0xff9900 : 0x00f0ff,
          emissive: f === 1 ? 0xff9900 : 0x00f0ff,
          emissiveIntensity: 0.9,
          roughness: 0.2,
          metalness: 0.4,
        })
      );
      libFloorMats.push(ringMat);

      const glowTrim = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(radius + 0.04, 0.055, 8, 32)),
        ringMat
      );
      glowTrim.rotation.x = Math.PI / 2;
      glowTrim.position.y = 0.36;
      floorGroup.add(glowTrim);

      libraryGroup.add(floorGroup);
      libFloors.push(floorGroup);
      clickables.push(coreMesh, glassShell);
    }

    // Library Rooftop Spire & Rotating Beacon
    const libSpireGroup = new THREE.Group();
    libSpireGroup.position.y = 4.25;
    libSpireGroup.userData = { baseY: 4.25 };
    const spireMast = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.06, 0.14, 1.4, 8)),
      darkMetalMat
    );
    spireMast.position.y = 0.7;
    libSpireGroup.add(spireMast);

    const spireOrb = new THREE.Mesh(
      trackGeo(new THREE.OctahedronGeometry(0.32, 0)),
      cyanAccentMat
    );
    spireOrb.position.y = 1.55;
    libSpireGroup.add(spireOrb);
    libraryGroup.add(libSpireGroup);

    // --------------------------------------------------------
    // 2. SIX HOSTEL BLOCKS (A–F) WITH LIVE WI-FI BEACONS
    // --------------------------------------------------------
    const hostelPositions: Array<[number, number, string]> = [
      [-8.5, -5.0, 'hostel-a'],
      [-9.5, 0.5, 'hostel-b'],
      [-7.5, 6.2, 'hostel-c'],
      [-2.2, 8.8, 'hostel-d'],
      [3.8, 8.5, 'hostel-e'],
      [8.5, 4.8, 'hostel-f'],
    ];

    const hostelBeacons: Map<
      string,
      { mat: THREE.MeshStandardMaterial; orb: THREE.Mesh; ring: THREE.Mesh }
    > = new Map();
    const hostelWorldTargets: THREE.Vector3[] = [];

    hostelPositions.forEach(([hx, hz, hid], idx) => {
      const hGroup = new THREE.Group();
      hGroup.position.set(hx, 0, hz);
      hGroup.lookAt(0, 0, 0);
      scene.add(hGroup);
      hostelWorldTargets.push(new THREE.Vector3(hx, 2.4, hz));

      // Podium
      const plinth = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(2.5, 0.3, 2.1)),
        podiumMat
      );
      plinth.position.y = 0.15;
      plinth.receiveShadow = true;
      plinth.castShadow = true;
      hGroup.add(plinth);

      // Main Building Body
      const bHeight = 1.7 + (idx % 3) * 0.42;
      const body = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(2.05, bHeight, 1.65)),
        darkMetalMat
      );
      body.position.y = 0.3 + bHeight / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      body.userData = { buildingType: 'hostel', hostelId: hid };
      hGroup.add(body);
      clickables.push(body);

      // Rooftop Crown
      const crown = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(1.75, 0.16, 1.35)),
        podiumMat
      );
      crown.position.y = 0.3 + bHeight + 0.08;
      hGroup.add(crown);

      // Antenna Mast
      const mast = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.035, 0.06, 0.75, 8)),
        darkMetalMat
      );
      mast.position.y = 0.3 + bHeight + 0.5;
      hGroup.add(mast);

      // Live Health Beacon Orb & Signal Ring
      const beaconMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x34d399,
          emissive: 0x34d399,
          emissiveIntensity: 1.1,
          roughness: 0.2,
          metalness: 0.3,
        })
      );

      const orb = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.2, 16, 16)),
        beaconMat
      );
      orb.position.y = 0.3 + bHeight + 0.92;
      orb.userData = { buildingType: 'hostel', hostelId: hid };
      hGroup.add(orb);
      clickables.push(orb);

      const sigRing = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.45, 0.025, 8, 24)),
        beaconMat
      );
      sigRing.rotation.x = Math.PI / 2;
      sigRing.position.y = 0.3 + bHeight + 0.92;
      hGroup.add(sigRing);

      hostelBeacons.set(hid, { mat: beaconMat, orb, ring: sigRing });
    });

    // --------------------------------------------------------
    // 3. SMART DINING & SUSTAINABILITY HUB
    // --------------------------------------------------------
    const messGroup = new THREE.Group();
    messGroup.position.set(7.2, 0, -5.2);
    scene.add(messGroup);

    const messBase = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(2.6, 2.9, 0.35, 16)),
      podiumMat
    );
    messBase.position.y = 0.175;
    messBase.receiveShadow = true;
    messBase.castShadow = true;
    messGroup.add(messBase);

    const messDome = new THREE.Mesh(
      trackGeo(
        new THREE.SphereGeometry(2.05, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2)
      ),
      glassMat
    );
    messDome.position.y = 0.35;
    messDome.userData = { buildingType: 'mess' };
    messGroup.add(messDome);
    clickables.push(messDome);

    const messCoreMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x34d399,
        emissive: 0x34d399,
        emissiveIntensity: 0.9,
        roughness: 0.3,
        metalness: 0.4,
      })
    );
    const messCore = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.7, 0.95, 1.1, 12)),
      messCoreMat
    );
    messCore.position.y = 0.9;
    messCore.userData = { buildingType: 'mess' };
    messGroup.add(messCore);
    clickables.push(messCore);

    const messHalo = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(2.2, 0.06, 10, 48)),
      orangeAccentMat
    );
    messHalo.rotation.x = Math.PI / 2;
    messHalo.position.y = 0.4;
    messGroup.add(messHalo);

    // --------------------------------------------------------
    // 4. ORBITING AWS ap-south-1 CLOUD CORE SATELLITE
    // --------------------------------------------------------
    const awsCoreGroup = new THREE.Group();
    awsCoreGroup.position.set(0, 8.2, 0);
    scene.add(awsCoreGroup);

    const awsCorePoly = new THREE.Mesh(
      trackGeo(new THREE.IcosahedronGeometry(0.75, 0)),
      orangeAccentMat
    );
    awsCorePoly.userData = { buildingType: 'aws' };
    awsCoreGroup.add(awsCorePoly);
    clickables.push(awsCorePoly);

    const awsOrbitRing1 = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(1.35, 0.035, 8, 48)),
      cyanAccentMat
    );
    awsOrbitRing1.rotation.x = Math.PI / 3;
    awsCoreGroup.add(awsOrbitRing1);

    const awsOrbitRing2 = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(1.65, 0.025, 8, 48)),
      orangeAccentMat
    );
    awsOrbitRing2.rotation.y = Math.PI / 4;
    awsCoreGroup.add(awsOrbitRing2);

    // --------------------------------------------------------
    // 5. FIBER-OPTIC DATA STREAM ARCS + INSTANCED DATA PACKETS
    // --------------------------------------------------------
    const routes: THREE.CatmullRomCurve3[] = [];
    const cloudPos = new THREE.Vector3(0, 8.2, 0);

    // Library -> Cloud Core
    routes.push(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 5.6, 0),
        new THREE.Vector3(0.4, 6.9, 0.2),
        cloudPos,
      ])
    );

    // Each Hostel -> Cloud Core
    hostelWorldTargets.forEach((hp) => {
      const mid = hp.clone().lerp(cloudPos, 0.5);
      mid.y += 1.6;
      routes.push(new THREE.CatmullRomCurve3([hp, mid, cloudPos]));
    });

    // Dining Hub -> Cloud Core
    const messTop = new THREE.Vector3(7.2, 2.4, -5.2);
    const messMid = messTop.clone().lerp(cloudPos, 0.5);
    messMid.y += 1.8;
    routes.push(new THREE.CatmullRomCurve3([messTop, messMid, cloudPos]));

    // Draw subtle glowing fiber tubes
    const tubeMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.22,
      })
    );
    routes.forEach((curve) => {
      const tubeGeo = trackGeo(new THREE.TubeGeometry(curve, 24, 0.028, 6, false));
      scene.add(new THREE.Mesh(tubeGeo, tubeMat));
    });

    // InstancedMesh Data Packets traveling along routes
    const packetsPerRoute = 4;
    const totalPackets = routes.length * packetsPerRoute;
    const packetGeo = trackGeo(new THREE.SphereGeometry(0.11, 8, 8));
    const packetMat = trackMat(
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    const packetInstances = new THREE.InstancedMesh(
      packetGeo,
      packetMat,
      totalPackets
    );
    packetInstances.frustumCulled = false;
    packetInstances.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(totalPackets * 3),
      3
    );
    for (let i = 0; i < totalPackets; i++) {
      _color.setHex(i % 2 === 0 ? 0x00f0ff : 0xff9900);
      packetInstances.setColorAt(i, _color);
    }
    packetInstances.instanceColor.needsUpdate = true;
    scene.add(packetInstances);

    // Ambient Campus Trees / Pillars (InstancedMesh for crisp spatial scale)
    const treeCount = 24;
    const treeGeo = trackGeo(new THREE.ConeGeometry(0.32, 1.05, 7));
    const treeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x0f3b4c,
        roughness: 0.8,
        metalness: 0.1,
      })
    );
    const treeInstances = new THREE.InstancedMesh(treeGeo, treeMat, treeCount);
    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2;
      const dist = 12.2 + (i % 3) * 1.4;
      _dummy.position.set(Math.cos(angle) * dist, 0.52, Math.sin(angle) * dist);
      const sc = 0.85 + (i % 4) * 0.12;
      _dummy.scale.set(sc, sc, sc);
      _dummy.rotation.y = angle;
      _dummy.updateMatrix();
      treeInstances.setMatrixAt(i, _dummy.matrix);
    }
    treeInstances.instanceMatrix.needsUpdate = true;
    treeInstances.computeBoundingSphere();
    scene.add(treeInstances);

    // --------------------------------------------------------
    // 6. 3D IOT ENVIRONMENTAL SENSOR HOTSPOTS
    // --------------------------------------------------------
    const hotspotBeacons = new Map<
      string,
      {
        group: THREE.Group;
        anchor: THREE.Object3D;
        mat: THREE.MeshStandardMaterial;
        ring: THREE.Mesh;
        core: THREE.Mesh;
      }
    >();

    const sensorStemGeo = trackGeo(new THREE.CylinderGeometry(0.028, 0.028, 0.44, 8));
    const sensorPodGeo = trackGeo(new THREE.CylinderGeometry(0.18, 0.18, 0.14, 6));
    const sensorCoreGeo = trackGeo(new THREE.SphereGeometry(0.14, 14, 14));
    const sensorRingGeo = trackGeo(new THREE.TorusGeometry(0.28, 0.024, 8, 24));
    const sensorHitGeo = trackGeo(new THREE.SphereGeometry(0.55, 8, 8));
    const sensorHitMat = trackMat(new THREE.MeshBasicMaterial({ visible: false }));

    HOTSPOT_CONFIGS.forEach((cfg) => {
      const beaconGroup = new THREE.Group();
      beaconGroup.position.set(...cfg.position);

      const stem = new THREE.Mesh(sensorStemGeo, darkMetalMat);
      stem.position.y = 0.22;
      beaconGroup.add(stem);

      const pod = new THREE.Mesh(sensorPodGeo, podiumMat);
      pod.position.y = 0.46;
      pod.userData = { buildingType: 'hotspot', hotspotId: cfg.id };
      beaconGroup.add(pod);

      const statusMat = trackMat(
        new THREE.MeshStandardMaterial({
          color: 0x34d399,
          emissive: 0x34d399,
          emissiveIntensity: 1.25,
          roughness: 0.2,
          metalness: 0.3,
        })
      );

      const core = new THREE.Mesh(sensorCoreGeo, statusMat);
      core.position.y = 0.66;
      core.userData = { buildingType: 'hotspot', hotspotId: cfg.id };
      beaconGroup.add(core);

      const ring = new THREE.Mesh(sensorRingGeo, statusMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.66;
      beaconGroup.add(ring);

      const hitProxy = new THREE.Mesh(sensorHitGeo, sensorHitMat);
      hitProxy.position.y = 0.62;
      hitProxy.userData = { buildingType: 'hotspot', hotspotId: cfg.id };
      beaconGroup.add(hitProxy);

      const anchor = new THREE.Object3D();
      anchor.position.y = 0.85;
      beaconGroup.add(anchor);

      if (cfg.attachTo === 'lib-f1' && libFloors[0]) {
        libFloors[0].add(beaconGroup);
      } else if (cfg.attachTo === 'lib-f3' && libFloors[2]) {
        libFloors[2].add(beaconGroup);
      } else {
        scene.add(beaconGroup);
      }

      clickables.push(hitProxy, core, pod);
      hotspotBeacons.set(cfg.id, {
        group: beaconGroup,
        anchor,
        mat: statusMat,
        ring,
        core,
      });
    });

    // Pre-warm shaders on GPU
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting for Click & Hover (throttled hover per Three.js interaction guide)
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    let lastHoverRaycast = 0;

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverRaycast < 55) return;
      lastHoverRaycast = now;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickables, false);
      const hasInteractive = hits.some(
        (h) =>
          h.object.userData.buildingType !== 'hotspot' ||
          livePropsRef.current.showHotspots
      );
      renderer.domElement.style.cursor = hasInteractive ? 'pointer' : 'grab';
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const moved = Math.hypot(
        e.clientX - pointerDownPos.x,
        e.clientY - pointerDownPos.y
      );
      if (moved > 6) return; // Ignore orbit drags

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickables, false);
      if (hits.length === 0) {
        setSelectedHotspotId(null);
        return;
      }

      const lp = livePropsRef.current;

      // Prioritize IoT hotspot hits when hotspots are visible
      const hotspotHit = lp.showHotspots
        ? hits.find((h) => Boolean(h.object.userData.hotspotId))
        : undefined;

      if (hotspotHit) {
        const hId = hotspotHit.object.userData.hotspotId as string;
        setSelectedHotspotId((prev) => (prev === hId ? null : hId));
        return;
      }

      const hitData = hits[0].object.userData;
      setSelectedHotspotId(null);

      if (hitData.buildingType === 'library') {
        handlePresetClick('library');
      } else if (hitData.buildingType === 'mess') {
        handlePresetClick('mess');
      } else if (hitData.buildingType === 'aws') {
        onOpenArchitecture();
      } else if (hitData.buildingType === 'hostel') {
        const matched = lp.hostels.find((h) => h.id === hitData.hostelId);
        if (matched) {
          setFocusInfo({
            id: matched.id,
            title: `${matched.name} (${matched.wingLabel})`,
            subtitle: `Status: ${matched.health} · Ping ${matched.pingMs} ms`,
            metric: `${matched.downloadMbps} Mbps`,
            targetSection: 'wifi',
          });
        }
      }
    };

    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // Animation Loop with Software-WebGL Pacing
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || !gl.fenceSync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const lp = livePropsRef.current;

      // Smooth Camera Preset Transition
      if (presetTriggerRef.current.active) {
        const targetPreset = CAMERA_PRESETS[presetTriggerRef.current.preset];
        _vec3A.set(...targetPreset.pos);
        _vec3B.set(...targetPreset.target);
        const factor = 1 - Math.exp(-4.5 * delta);
        camera.position.lerp(_vec3A, factor);
        controls.target.lerp(_vec3B, factor);
        if (camera.position.distanceTo(_vec3A) < 0.08) {
          presetTriggerRef.current.active = false;
        }
      } else if (lp.autoOrbit && !prefersReducedMotion && !isSoftwareGl) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.65;
      } else {
        controls.autoRotate = false;
      }

      controls.update();

      // Exploded Library Floors & Reservation Highlight
      const explodeOffset = lp.explodedView ? 0.85 : 0;
      libFloors.forEach((fg, idx) => {
        const targetY = (fg.userData.baseY as number) + idx * explodeOffset;
        fg.position.y = THREE.MathUtils.damp(fg.position.y, targetY, 6, delta);
        if (!prefersReducedMotion) {
          fg.rotation.y = elapsed * (0.08 + idx * 0.04);
        }
      });

      const targetSpireY = (libSpireGroup.userData.baseY as number) + 2.4 * explodeOffset;
      libSpireGroup.position.y = THREE.MathUtils.damp(
        libSpireGroup.position.y,
        targetSpireY,
        6,
        delta
      );

      // Library floor emissive intensity reflects occupancy & user reservation
      const occRatio = lp.libraryOccupancyPct / 100;
      libFloorMats.forEach((mat, idx) => {
        if (lp.hasActiveReservation && idx === 0) {
          mat.color.setHex(0xff9900);
          mat.emissive.setHex(0xff9900);
          mat.emissiveIntensity = 1.2 + Math.sin(elapsed * 3) * 0.25;
        } else {
          mat.emissiveIntensity = 0.55 + occRatio * 0.7;
        }
      });

      if (!prefersReducedMotion) {
        spireOrb.rotation.y = elapsed * 1.4;
        spireOrb.position.y = 1.55 + Math.sin(elapsed * 2.2) * 0.08;

        // Orbiting AWS Cloud Core
        awsCorePoly.rotation.y = elapsed * 0.7;
        awsCorePoly.rotation.x = elapsed * 0.35;
        awsOrbitRing1.rotation.z = elapsed * 0.9;
        awsOrbitRing2.rotation.x = elapsed * 0.65;

        // Dining hub halo float
        messHalo.position.y = 0.42 + Math.sin(elapsed * 1.8) * 0.07;
      }

      // Sync Hostel Wi-Fi Beacons to Live Health State
      lp.hostels.forEach((h, hIdx) => {
        const entry = hostelBeacons.get(h.id);
        if (!entry) return;
        const hex = healthToHex(h.health);
        entry.mat.color.setHex(hex);
        entry.mat.emissive.setHex(hex);

        if (!prefersReducedMotion) {
          const pulseSpeed = h.health === 'Outage' ? 6.5 : h.health === 'High Load' ? 3.5 : 1.6;
          const wave = (elapsed * pulseSpeed + hIdx) % (Math.PI * 2);
          const ringScale = 0.85 + Math.abs(Math.sin(wave * 0.5)) * 0.55;
          entry.ring.scale.set(ringScale, ringScale, 1);
        }
      });

      // Animate Data Packets along Fiber Arcs
      const speedScale = Math.max(0.18, Math.min(0.65, lp.avgWifiSpeed / 450));
      let pIdx = 0;
      for (let r = 0; r < routes.length; r++) {
        const curve = routes[r];
        for (let k = 0; k < packetsPerRoute; k++) {
          const t = prefersReducedMotion
            ? k / packetsPerRoute
            : (elapsed * speedScale + k / packetsPerRoute + r * 0.13) % 1;
          curve.getPointAt(t, _vec3A);
          _dummy.position.copy(_vec3A);
          _dummy.scale.setScalar(1);
          _dummy.updateMatrix();
          packetInstances.setMatrixAt(pIdx, _dummy.matrix);
          pIdx++;
        }
      }
      packetInstances.instanceMatrix.needsUpdate = true;

      // Animate & Project 3D IoT Sensor Hotspots to 2D Screen Coordinates (Zero React re-renders)
      const vpW = container?.clientWidth || 960;
      const vpH = container?.clientHeight || 460;

      lp.iotSensors.forEach((sensor, sIdx) => {
        const beacon = hotspotBeacons.get(sensor.id);
        if (!beacon) return;

        beacon.group.visible = lp.showHotspots;
        const hex = iotStatusToHex(sensor.status);
        beacon.mat.color.setHex(hex);
        beacon.mat.emissive.setHex(hex);

        const isSelected = lp.selectedHotspotId === sensor.id;
        const targetScale = isSelected ? 1.35 : 1.0;
        beacon.group.scale.setScalar(
          THREE.MathUtils.damp(beacon.group.scale.x, targetScale, 8, delta)
        );
        beacon.mat.emissiveIntensity = isSelected ? 1.85 : 1.15;

        if (!prefersReducedMotion) {
          beacon.core.position.y = 0.66 + Math.sin(elapsed * 2.4 + sIdx) * 0.05;
          const ringPulse = 0.9 + Math.abs(Math.sin(elapsed * 1.8 + sIdx)) * 0.35;
          beacon.ring.scale.set(ringPulse, ringPulse, 1);
        }

        const pinEl = hotspotPinRefs.current[sensor.id];
        if (pinEl) {
          if (!lp.showHotspots) {
            pinEl.style.opacity = '0';
            pinEl.style.pointerEvents = 'none';
          } else {
            beacon.anchor.getWorldPosition(_projVec);
            _projVec.project(camera);
            const inFront = _projVec.z < 1 && _projVec.z > -1;
            const px = (_projVec.x * 0.5 + 0.5) * vpW;
            const py = (-_projVec.y * 0.5 + 0.5) * vpH;
            const inBounds =
              inFront && px > 24 && px < vpW - 24 && py > 24 && py < vpH - 48;

            lastProjectedCoordsRef.current[sensor.id] = { x: px, y: py };

            if (inBounds) {
              pinEl.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -100%)`;
              pinEl.style.opacity = '1';
              pinEl.style.pointerEvents = 'auto';
            } else {
              pinEl.style.opacity = '0';
              pinEl.style.pointerEvents = 'none';
            }
          }
        }

        if (isSelected && popupAnchorRef.current && lp.showHotspots) {
          beacon.anchor.getWorldPosition(_projVec);
          _projVec.project(camera);
          const rawX = (_projVec.x * 0.5 + 0.5) * vpW;
          const rawY = (-_projVec.y * 0.5 + 0.5) * vpH;
          const cardHalfW = vpW < 640 ? 150 : 162;
          const clampedX = Math.max(
            cardHalfW + 10,
            Math.min(vpW - cardHalfW - 10, rawX)
          );
          const clampedY = Math.max(20, Math.min(vpH - 295, rawY - 12));
          popupAnchorRef.current.style.transform = `translate3d(${clampedX.toFixed(
            1
          )}px, ${clampedY.toFixed(1)}px, 0) translate(-50%, 0)`;
        }
      });

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener(
        'webglcontextrestored',
        onContextRestored
      );
      controls.dispose();
      envTex.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <section
      aria-label="3D Smart Campus Digital Twin"
      className="relative overflow-hidden rounded-2xl border border-slate-800/90 bg-[#070C18] shadow-[0_0_50px_rgba(0,240,255,0.08)]"
    >
      {/* 3D WebGL Viewport Container */}
      <div
        ref={mountRef}
        className="h-[380px] sm:h-[440px] lg:h-[490px] w-full cursor-grab active:cursor-grabbing"
      />

      {contextLost && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0B1120] p-6 text-center">
          <Box className="h-10 w-10 text-[#00F0FF]" aria-hidden="true" />
          <p className="mt-3 font-display text-base font-bold text-white">
            WebGL Context Restoring...
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Hardware graphics context paused; live telemetry controls below remain active.
          </p>
        </div>
      )}

      {/* 3D-Projected Clickable IoT Sensor Hotspots & Anchored Pop-Up Card */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {iotSensors.map((sensor) => {
          const isSelected = selectedHotspotId === sensor.id;
          const borderAccent =
            sensor.status === 'Alert'
              ? 'border-rose-500/80 text-rose-200'
              : sensor.status === 'Elevated'
              ? 'border-[#FF9900]/80 text-[#FF9900]'
              : 'border-emerald-400/75 text-emerald-300';

          return (
            <button
              key={sensor.id}
              ref={(el) => {
                hotspotPinRefs.current[sensor.id] = el;
              }}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedHotspotId((prev) =>
                  prev === sensor.id ? null : sensor.id
                );
              }}
              aria-label={`Inspect ${sensor.zoneName} IoT sensor (${sensor.tempC.toFixed(
                1
              )}°C, ${sensor.co2Ppm} ppm CO2)`}
              aria-expanded={isSelected}
              style={{ opacity: 0 }}
              className={`absolute top-0 left-0 inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 font-mono text-[10px] font-semibold shadow-md transition-colors cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'border-[#00F0FF] bg-[#00F0FF] text-[#0B1120] shadow-[0_0_18px_rgba(0,240,255,0.55)]'
                  : `bg-[#0B1120]/92 hover:border-[#00F0FF] hover:text-white ${borderAccent}`
              }`}
            >
              <Thermometer className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>{sensor.shortLabel}</span>
              <span className="opacity-85 tabular-nums">
                {sensor.tempC.toFixed(1)}°C
              </span>
            </button>
          );
        })}

        {showHotspots &&
          selectedHotspotId &&
          (() => {
            const activeSensor = iotSensors.find(
              (s) => s.id === selectedHotspotId
            );
            if (!activeSensor) return null;
            const vpW = mountRef.current?.clientWidth || 960;
            const vpH = mountRef.current?.clientHeight || 460;
            const cached = lastProjectedCoordsRef.current[activeSensor.id] ?? {
              x: vpW / 2,
              y: vpH / 2,
            };
            const cardHalfW = vpW < 640 ? 150 : 162;
            const initX = Math.max(
              cardHalfW + 10,
              Math.min(vpW - cardHalfW - 10, cached.x)
            );
            const initY = Math.max(20, Math.min(vpH - 295, cached.y - 12));
            return (
              <div
                ref={popupAnchorRef}
                style={{
                  transform: `translate3d(${initX.toFixed(1)}px, ${initY.toFixed(
                    1
                  )}px, 0) translate(-50%, 0)`,
                }}
                className="pointer-events-auto absolute top-0 left-0 z-20"
              >
                <IotHotspotPopup
                  sensor={activeSensor}
                  onClose={() => setSelectedHotspotId(null)}
                  onFocusZone={(preset) => handlePresetClick(preset)}
                  onJumpToModule={onSelectSection}
                />
              </div>
            );
          })()}
      </div>

      {/* Minimal Top-Left Focus Spec Card (Solid/RGBA, NO backdrop-blur over WebGL) */}
      <div className="pointer-events-none absolute top-4 left-4 right-4 z-10 flex flex-wrap items-start justify-between gap-3">
        <div className="pointer-events-auto max-w-md rounded-xl border border-slate-700/80 bg-[#0B1120]/90 px-4 py-3 shadow-lg">
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#00F0FF]">
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            <span>3D DIGITAL TWIN · {focusInfo.metric}</span>
          </div>
          <h2 className="mt-0.5 font-display text-sm sm:text-base font-bold text-white">
            {focusInfo.title}
          </h2>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>{focusInfo.subtitle}</span>
            {focusInfo.targetSection && (
              <button
                type="button"
                onClick={() => onSelectSection(focusInfo.targetSection!)}
                className="font-semibold text-[#FF9900] hover:underline cursor-pointer"
              >
                Jump to Module →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Bottom Control Dock (Zero Mid-Screen Occlusion) */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 flex w-[min(94%,880px)] -translate-x-1/2 flex-col items-center">
        <button
          type="button"
          onClick={() => setHudCollapsed((v) => !v)}
          className="pointer-events-auto mb-1.5 inline-flex items-center gap-1.5 rounded-t-lg border border-b-0 border-slate-700/80 bg-[#0B1120]/92 px-3 py-1 text-[11px] font-medium text-slate-300 hover:text-white cursor-pointer"
        >
          {hudCollapsed ? (
            <>
              <Eye className="h-3 w-3 text-[#00F0FF]" aria-hidden="true" />
              <span>Show 3D Controls</span>
            </>
          ) : (
            <>
              <EyeOff className="h-3 w-3 text-slate-400" aria-hidden="true" />
              <span>Hide 3D Controls</span>
            </>
          )}
        </button>

        {!hudCollapsed && (
          <div className="pointer-events-auto flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700/80 bg-[#0B1120]/92 px-3 py-2.5 shadow-xl">
            {/* Camera Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'overview', icon: Compass, label: 'Overview' },
                  { id: 'library', icon: BookOpen, label: 'Library' },
                  { id: 'hostels', icon: Wifi, label: 'Hostels' },
                  { id: 'mess', icon: UtensilsCrossed, label: 'Dining Hub' },
                ] as const
              ).map((preset) => {
                const Icon = preset.icon;
                const active = cameraPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetClick(preset.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'border-[#00F0FF]/60 bg-[#00F0FF]/15 text-[#00F0FF]'
                        : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Scene Modes */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setShowHotspots((v) => {
                    if (v) setSelectedHotspotId(null);
                    return !v;
                  });
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  showHotspots
                    ? 'border-[#00F0FF]/60 bg-[#00F0FF]/15 text-[#00F0FF]'
                    : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                <span>IoT Sensors ({iotSensors.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setExplodedView((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  explodedView
                    ? 'border-[#FF9900]/70 bg-[#FF9900]/20 text-[#FF9900]'
                    : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Explode Library Floors</span>
              </button>

              <button
                type="button"
                onClick={() => setAutoOrbit((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  autoOrbit
                    ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                    : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-700'
                }`}
              >
                <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{autoOrbit ? 'Orbiting' : 'Paused'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
