import React from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { continueRender, delayRender, staticFile } from 'remotion';

/* Hologram world: dark-blue void, neon grid floor, rings, light beams, receding frames,
   and a translucent glowing human (three.js Xbot, Mixamo rig) posed per activity. */

export const BLUE = new THREE.Color('#2F7BFF');
export type Cam = { pos: [number, number, number]; look: [number, number, number]; fov: number; roll?: number };
export type Pose = 'idle' | 'walk' | 'run' | 'sit' | 'type' | 'lift' | 'sleep' | 'drink' | 'phone' | 'couch' | 'cheer';

/* ---------- model cache ---------- */
let gltfPromise: Promise<any> | null = null;
const loadXbot = () => {
  if (!gltfPromise) gltfPromise = new GLTFLoader().loadAsync(staticFile('holo/Xbot.glb'));
  return gltfPromise;
};
export const useXbot = () => {
  const [g, setG] = React.useState<any>(null);
  const [h] = React.useState(() => delayRender('xbot'));
  React.useEffect(() => {
    loadXbot().then((x) => {
      setG(x);
      continueRender(h);
    });
  }, [h]);
  return g;
};

/* ---------- hologram material (rim glow, translucent) ---------- */
const holoMaterial = () => {
  const m = new THREE.MeshStandardMaterial({ color: '#1C4FD8', emissive: '#2C66FF', emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.1, transparent: true, opacity: 0.82, depthWrite: true });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
       float rim = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.2);
       totalEmissiveRadiance += vec3(0.45, 0.75, 1.0) * rim * 1.6;`,
    );
  };
  return m;
};

/* ---------- bone helpers ---------- */
const E = (x: number, y: number, z: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'XYZ'));
const d2r = Math.PI / 180;
type Off = Record<string, [number, number, number]>; // bone suffix -> extra local rotation (degrees)

const LEGS: Off = { LeftUpLeg: [-88, 0, 4], RightUpLeg: [-88, 0, -4], LeftLeg: [88, 0, 0], RightLeg: [88, 0, 0] };
const PHONE: Off = { RightArm: [0, 50, 0], RightForeArm: [0, 88, 0], LeftArm: [0, -50, 0], LeftForeArm: [0, -88, 0], Head: [26, 0, 0] };
const POSES: Record<string, (t: number) => Off> = {
  sit: () => ({ ...LEGS, Spine: [6, 0, 0] }),
  type: (t) => ({
    ...LEGS, Spine: [10, 0, 0], Head: [12, 0, 0],
    RightArm: [-40, 30, 0], LeftArm: [-40, -30, 0],
    RightForeArm: [0, 80 + Math.sin(t * 17) * 5, 0], LeftForeArm: [0, -80 - Math.cos(t * 19) * 5, 0],
  }),
  drink: (t) => {
    const k = Math.max(0, Math.sin(t * 1.6)); // lift cup to the mouth
    return { ...LEGS, RightArm: [0, 50, 0], RightForeArm: [0, 45 + 75 * k, 0], LeftArm: [-45, 0, 0], LeftForeArm: [0, -75, 0], Head: [-8 * k, 0, 0] };
  },
  lift: (t) => {
    const k = (1 - Math.cos(t * 3.4)) / 2; // curl
    return { RightArm: [-30, 0, 0], LeftArm: [-30, 0, 0], RightForeArm: [0, 15 + 115 * k, 0], LeftForeArm: [0, -15 - 115 * k, 0], Spine: [-3 * k, 0, 0] };
  },
  sleep: (t) => ({ Spine: [2 + Math.sin(t * 1.2) * 1.5, 0, 0], Head: [0, 0, 10] }),
  phone: (t) => ({ ...PHONE, Head: [26 + Math.sin(t * 2) * 2, 0, 0] }),
  couch: (t) => ({ ...LEGS, ...PHONE, Spine: [-8, 0, 0], Head: [22 + Math.sin(t * 2) * 2, 0, 0] }),
  cheer: (t) => ({ LeftArm: [0, 0, 150 + Math.sin(t * 6) * 8], RightArm: [0, 0, -150 - Math.sin(t * 6) * 8], LeftForeArm: [0, -15, 0], RightForeArm: [0, 15, 0] }),
};
const SIT = new Set(['sit', 'type', 'drink', 'couch']);

/** a posed hologram human; `pose` picks the base clip + procedural overrides.
 *  onHead receives the true world position of the top of the head (for DOM timers). */
export const Human: React.FC<{ g: any; t: number; pose: Pose; pos?: [number, number, number]; rotY?: number; lie?: boolean; scale?: number; onHead?: (v: THREE.Vector3) => void; chip?: { label: string; time: string; live?: boolean; s?: number; o?: number; dy?: number }; o?: number }> = ({ g, t, pose, pos = [0, 0, 0], rotY = 0, lie, scale = 1, onHead, chip, o = 1 }) => {
  const rig = React.useMemo(() => {
    const root = SkeletonUtils.clone(g.scene) as THREE.Object3D;
    const mat = holoMaterial();
    root.traverse((o: any) => {
      if (o.isMesh) {
        o.material = mat;
        o.frustumCulled = false;
      }
    });
    const mixer = new THREE.AnimationMixer(root);
    const clips: Record<string, THREE.AnimationAction> = {};
    for (const c of g.animations as THREE.AnimationClip[]) clips[c.name] = mixer.clipAction(c);
    const bones: Record<string, THREE.Bone> = {};
    root.traverse((o: any) => {
      if (o.isBone) bones[o.name.replace(/^mixamorig:?/, '')] = o;
    });
    return { root, mixer, clips, bones, mat };
  }, [g]);
  rig.mat.opacity = 0.82 * o;
  rig.root.visible = o > 0.01;
  const base = pose === 'walk' ? 'walk' : pose === 'run' ? 'run' : 'idle';
  for (const [n, a] of Object.entries(rig.clips)) {
    a.enabled = n === base;
    a.setEffectiveWeight(n === base ? 1 : 0);
    if (n === base) a.play();
  }
  rig.mixer.setTime(t);
  const off = POSES[pose]?.(t);
  if (off)
    for (const [b, [x, y, z]] of Object.entries(off)) {
      const bone = rig.bones[b];
      if (bone) bone.quaternion.multiply(E(x * d2r, y * d2r, z * d2r));
    }
  rig.root.updateMatrixWorld(true);
  // positions in the group's space (independent of whatever parent transform three has cached)
  const inv = rig.root.matrixWorld.clone().invert();
  const local = (name: string) => {
    const b = rig.bones[name];
    return b ? b.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv).applyMatrix4(rig.root.matrix) : null;
  };
  const sitY = SIT.has(pose) ? -0.42 : 0;
  const gp: [number, number, number] = [pos[0], pos[1] + sitY, pos[2]];
  const gr: [number, number, number] = [lie ? -Math.PI / 2 : 0, rotY, 0];
  let headW: THREE.Vector3 | null = null;
  {
    const h = local('HeadTop_End');
    if (h) {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(...gp), new THREE.Quaternion().setFromEuler(new THREE.Euler(...gr)), new THREE.Vector3(scale, scale, scale));
      headW = h.applyMatrix4(m);
      onHead?.(headW.clone());
    }
  }
  const rh = local('RightHand');
  const lh = local('LeftHand');
  const rhEnd = local('RightHandMiddle1');
  let held: React.ReactNode = null;
  if (pose === 'lift' && rh && lh) {
    const mid = rh.clone().add(lh).multiplyScalar(0.5);
    const dir = lh.clone().sub(rh).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    held = (
      <group position={mid} quaternion={q}>
        <mesh>
          <cylinderGeometry args={[0.018, 0.018, 1.5, 8]} />
          <meshBasicMaterial color="#9FD0FF" />
        </mesh>
        {[-0.62, 0.62].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.07, 24]} />
            <meshBasicMaterial color="#3E86FF" transparent opacity={0.85} />
          </mesh>
        ))}
      </group>
    );
  } else if ((pose === 'drink' || pose === 'phone' || pose === 'couch') && rh) {
    const p = (rhEnd ?? rh).clone();
    held =
      pose === 'drink' ? (
        <group position={p}>
          <mesh>
            <cylinderGeometry args={[0.045, 0.038, 0.11, 16]} />
            <meshBasicMaterial color="#8CC8FF" transparent opacity={0.75} />
          </mesh>
        </group>
      ) : (
        <group position={p}>
          <mesh rotation={[-0.9, rotY * 0, 0]}>
            <boxGeometry args={[0.08, 0.15, 0.012]} />
            <meshBasicMaterial color="#BFE3FF" transparent opacity={0.9} />
          </mesh>
        </group>
      );
  }
  return (
    <>
      <group position={gp} rotation={gr} scale={scale}>
        <primitive object={rig.root} />
        {held}
      </group>
      {chip && headW && <Chip pos={[headW.x, headW.y + (chip.dy ?? 0.2) * scale, headW.z]} label={chip.label} time={chip.time} live={chip.live} s={(chip.s ?? 1) * scale} o={chip.o} />}
    </>
  );
};

/* ---------- timer chip above the head (sprite, always faces camera) ---------- */
const chipTex = new Map<string, THREE.CanvasTexture>();
export const chipTexture = (label: string, time: string, live: boolean) => {
  const key = label + '|' + time + '|' + live;
  let tx = chipTex.get(key);
  if (tx) return tx;
  const W = 640, H = 220;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  const r = 70;
  const box = (pad: number) => { x.beginPath(); x.roundRect(pad, pad, W - pad * 2, H - pad * 2, r); };
  x.shadowColor = '#3F8CFF'; x.shadowBlur = 30;
  box(22); x.fillStyle = 'rgba(6,20,60,0.78)'; x.fill();
  x.lineWidth = 5; x.strokeStyle = '#7DC0FF'; x.stroke();
  x.shadowBlur = 0;
  // live dot
  x.fillStyle = live ? '#5CFFB0' : '#7DC0FF';
  x.beginPath(); x.arc(84, 82, 13, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#A9D4FF'; x.font = '700 40px "Helvetica Neue", Arial, sans-serif'; x.textBaseline = 'middle';
  x.fillText(label.toUpperCase(), 112, 84);
  x.fillStyle = '#FFFFFF'; x.font = '800 78px "Helvetica Neue", Arial, sans-serif';
  x.shadowColor = '#5AA8FF'; x.shadowBlur = 18;
  x.fillText(time, 64, 152);
  tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace;
  chipTex.set(key, tx);
  return tx;
};
export const Chip: React.FC<{ pos: THREE.Vector3 | [number, number, number]; label: string; time: string; live?: boolean; s?: number; o?: number }> = ({ pos, label, time, live = true, s = 1, o = 1 }) => (
  <sprite position={pos as any} scale={[0.78 * s, 0.268 * s, 1]} renderOrder={999}>
    <spriteMaterial map={chipTexture(label, time, live)} transparent opacity={o} depthTest={false} depthWrite={false} fog={false} />
  </sprite>
);

/* ---------- neon line props ---------- */
export const LineBox: React.FC<{ size: [number, number, number]; pos: [number, number, number]; color?: string; opacity?: number }> = ({ size, pos, color = '#4FA3FF', opacity = 0.9 }) => {
  const geo = React.useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(...size)), [size[0], size[1], size[2]]);
  return (
    <lineSegments geometry={geo} position={pos}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  );
};
export const GlowBox: React.FC<{ size: [number, number, number]; pos: [number, number, number]; opacity?: number }> = ({ size, pos, opacity = 0.12 }) => (
  <group>
    <mesh position={pos}>
      <boxGeometry args={size} />
      <meshBasicMaterial color="#2F7BFF" transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
    <LineBox size={size} pos={pos} />
  </group>
);

export const Prop: React.FC<{ kind: 'desk' | 'bed' | 'sofa' | 'barbell' | 'cafe' | 'door' | 'bench'; pos: [number, number, number]; rotY?: number; t?: number }> = ({ kind, pos, rotY = 0, t = 0 }) => (
  <group position={pos} rotation={[0, rotY, 0]}>
    {kind === 'desk' && (
      <>
        <GlowBox size={[1.6, 0.06, 0.8]} pos={[0, 0.76, 0.55]} />
        <LineBox size={[0.06, 0.76, 0.06]} pos={[-0.75, 0.38, 0.2]} />
        <LineBox size={[0.06, 0.76, 0.06]} pos={[0.75, 0.38, 0.2]} />
        <LineBox size={[0.06, 0.76, 0.06]} pos={[-0.75, 0.38, 0.9]} />
        <LineBox size={[0.06, 0.76, 0.06]} pos={[0.75, 0.38, 0.9]} />
        <GlowBox size={[0.7, 0.45, 0.03]} pos={[0, 1.05, 0.75]} opacity={0.35} />
        <GlowBox size={[0.55, 0.06, 0.55]} pos={[0, 0.46, -0.05]} />
      </>
    )}
    {kind === 'cafe' && (
      <>
        <GlowBox size={[0.8, 0.05, 0.8]} pos={[0, 0.74, 0.6]} />
        <LineBox size={[0.06, 0.74, 0.06]} pos={[0, 0.37, 0.6]} />
        <GlowBox size={[0.12, 0.14, 0.12]} pos={[0.15, 0.84, 0.55]} opacity={0.4} />
        <GlowBox size={[0.5, 0.06, 0.5]} pos={[0, 0.46, -0.05]} />
      </>
    )}
    {kind === 'sofa' && (
      <>
        <GlowBox size={[2.0, 0.45, 0.9]} pos={[0, 0.22, -0.1]} />
        <GlowBox size={[2.0, 0.6, 0.2]} pos={[0, 0.7, -0.5]} />
      </>
    )}
    {kind === 'bed' && (
      <>
        <GlowBox size={[1.2, 0.4, 2.1]} pos={[0, 0.2, 0]} />
        <GlowBox size={[1.2, 0.8, 0.08]} pos={[0, 0.4, -1.05]} />
      </>
    )}
    {kind === 'bench' && <GlowBox size={[0.45, 0.45, 1.4]} pos={[0, 0.22, 0]} />}
    {kind === 'door' && (
      <>
        <LineBox size={[1.2, 2.4, 0.08]} pos={[0, 1.2, 0]} />
        <mesh position={[0, 1.2, 0]}>
          <planeGeometry args={[1.1, 2.3]} />
          <meshBasicMaterial color="#5FB2FF" transparent opacity={0.18 + 0.08 * Math.sin(t * 3)} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </>
    )}
    {kind === 'barbell' && (
      <>
        <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1.6, 8]} />
          <meshBasicMaterial color="#7FC0FF" />
        </mesh>
        {[-0.7, 0.7].map((x) => (
          <mesh key={x} rotation={[0, 0, Math.PI / 2]} position={[x, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.08, 20]} />
            <meshBasicMaterial color="#3E86FF" transparent opacity={0.8} />
          </mesh>
        ))}
      </>
    )}
  </group>
);

/* ---------- environment ---------- */
const Grid: React.FC = () => {
  const geo = React.useMemo(() => {
    const pts: number[] = [];
    const N = 40;
    const S = 2;
    for (let i = -N; i <= N; i++) {
      pts.push(i * S, 0, -N * S, i * S, 0, N * S);
      pts.push(-N * S, 0, i * S, N * S, 0, i * S);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#2B6BFF" transparent opacity={0.55} />
    </lineSegments>
  );
};
const Ring: React.FC<{ r: number; pos: [number, number, number]; opacity?: number; w?: number }> = ({ r, pos, opacity = 0.9, w = 0.03 }) => (
  <mesh position={[pos[0], pos[1] + 0.01, pos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
    <ringGeometry args={[r - w, r, 96]} />
    <meshBasicMaterial color="#5AA8FF" transparent opacity={opacity} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} depthWrite={false} />
  </mesh>
);
const Beam: React.FC<{ x: number; z: number; h?: number; tilt?: number; o?: number }> = ({ x, z, h = 30, tilt = 0, o = 0.8 }) => (
  <group position={[x, h / 2, z]} rotation={[0, 0, tilt]}>
    <mesh>
      <boxGeometry args={[0.08, h, 0.08]} />
      <meshBasicMaterial color="#6FB6FF" transparent opacity={o} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
    <mesh>
      <boxGeometry args={[0.5, h, 0.5]} />
      <meshBasicMaterial color="#2F7BFF" transparent opacity={o * 0.12} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  </group>
);
const Frames: React.FC<{ z0: number; x: number }> = ({ z0, x }) => (
  <group>
    {[...Array(8)].map((_, i) => (
      <LineBox key={i} size={[3 + i * 0.2, 3 + i * 0.2, 0.01]} pos={[x, 1.6 + i * 0.1, z0 - i * 2.2]} opacity={0.75 - i * 0.07} />
    ))}
  </group>
);

export const HoloWorld: React.FC<{ t: number; cam: Cam; bgx?: number; bgz?: number; rings?: [number, number, number][]; children?: React.ReactNode }> = ({ t, cam, bgx = 0, bgz = 0, rings = [], children }) => (
  <>
    <color attach="background" args={['#020617']} />
    <fog attach="fog" args={['#020617', 6, 34]} />
    <CamRig cam={cam} />
    <ambientLight intensity={0.35} color="#7FA8FF" />
    <directionalLight position={[3, 8, 5]} intensity={1.1} color="#9CC2FF" />
    <pointLight position={[0, 4, 2]} intensity={14} distance={12} color="#3F86FF" />
    <Grid />
    {rings.map((p, i) => (
      <group key={i}>
        <Ring r={1.6} pos={p} />
        <Ring r={2.6 + Math.sin(t * 2 + i) * 0.05} pos={p} opacity={0.35} w={0.02} />
      </group>
    ))}
    <group position={[bgx * 0.85, 0, bgz * 0.9]}>
    {[
      [-6, -8, 0.0],
      [7, -12, 0.08],
      [-11, -18, -0.05],
      [4, -24, 0],
      [12, -6, 0.15],
    ].map(([x, z, tl], i) => (
      <Beam key={i} x={x} z={z} tilt={tl} o={0.6 + 0.3 * Math.sin(t * 1.5 + i)} />
    ))}
    <Frames z0={-6} x={-7} />
    <Frames z0={-10} x={8} />
    </group>
    {children}
  </>
);

export const SAFE = { zoom: 1.22, dx: 70, dy: 40 };
const CamRig: React.FC<{ cam: Cam }> = ({ cam }) => {
  const { camera } = useThree();
  const c = camera as THREE.PerspectiveCamera;
  c.position.set(...cam.pos);
  c.lookAt(new THREE.Vector3(...cam.look));
  if (cam.roll) c.rotateZ(cam.roll);
  // TikTok safe zone: everything ~13% smaller and the optical centre moved left/up
  // (away from the right-hand buttons and the bottom caption/name area)
  c.fov = (2 * Math.atan(Math.tan((cam.fov * Math.PI) / 360) * SAFE.zoom) * 180) / Math.PI;
  c.setViewOffset(1080, 1920, SAFE.dx, SAFE.dy, 1080, 1920);
  c.updateProjectionMatrix();
  c.near = 0.05;
  c.far = 200;
  return null;
};

export const project = (cam: Cam, p: THREE.Vector3) => {
  const c = new THREE.PerspectiveCamera(cam.fov, 1080 / 1920, 0.05, 200);
  c.position.set(...cam.pos);
  c.lookAt(new THREE.Vector3(...cam.look));
  if (cam.roll) c.rotateZ(cam.roll);
  c.updateMatrixWorld();
  const v = p.clone().project(c);
  return { x: (v.x * 0.5 + 0.5) * 1080, y: (-v.y * 0.5 + 0.5) * 1920, vis: v.z < 1 && v.z > -1 };
};
