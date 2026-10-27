import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/* Low-poly / voxel night world (PS1-like): big pixel moon with halo rings, a dark sea with a moonlight path,
   a quay with little houses (Maison, Travail, Salle, Café) and Lucas, a voxel character holding his phone.
   Everything is driven by `t` (seconds) so the parent can rewind time. */

const rnd = (s: number) => {
  const x = Math.sin(s * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const pixelTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const tx = new THREE.CanvasTexture(c);
  tx.magFilter = THREE.NearestFilter;
  tx.minFilter = THREE.NearestFilter;
  tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
};

/* ---------------- moon ---------------- */
const Moon: React.FC<{ t: number; pos: [number, number, number]; glow: number }> = ({ t, pos, glow }) => {
  const tex = useMemo(
    () =>
      pixelTex(32, 32, (g) => {
        g.fillStyle = '#F3E39A';
        g.beginPath();
        g.arc(16, 16, 15.5, 0, Math.PI * 2);
        g.fill();
        for (let i = 0; i < 16; i++) {
          const x = 4 + rnd(i) * 24;
          const y = 4 + rnd(i + 40) * 24;
          const r = 1 + rnd(i + 80) * 3.5;
          g.fillStyle = rnd(i + 9) > 0.5 ? '#D9C77B' : '#E7D68A';
          g.fillRect(Math.round(x - r), Math.round(y - r), Math.round(r * 2), Math.round(r * 2));
        }
      }),
    [],
  );
  const rings = [1.35, 1.7, 2.1, 2.6];
  return (
    <group position={pos}>
      {rings.map((r, i) => (
        <mesh key={i} position={[0, 0, -0.5 - i * 0.1]}>
          <circleGeometry args={[r * 26, 48]} />
          <meshBasicMaterial color={'#8C9FE8'} transparent opacity={(0.2 - i * 0.035) * glow} fog={false} />
        </mesh>
      ))}
      <mesh>
        <circleGeometry args={[26, 40]} />
        <meshBasicMaterial map={tex} transparent fog={false} />
      </mesh>
    </group>
  );
};

/* ---------------- sea ---------------- */
const Sea: React.FC<{ t: number }> = ({ t }) => {
  const geo = useMemo(() => new THREE.PlaneGeometry(260, 200, 70, 50), []);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = base[i * 3];
    const y = base[i * 3 + 1];
    pos.setZ(i, Math.sin(x * 0.18 + t * 1.6) * 0.35 + Math.cos(y * 0.23 + t * 1.2) * 0.3);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return (
    <group>
      <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, -90]}>
        <meshLambertMaterial color={'#1B2A6B'} flatShading />
      </mesh>
      {/* moonlight path: pixel streaks on the water */}
      {[...Array(26)].map((_, i) => {
        const z = -170 + i * 5.2;
        const w = 1.5 + rnd(i) * 6 * (1 - i / 30);
        const x = 20 + Math.sin(t * 2 + i) * 1.2 + (rnd(i + 3) - 0.5) * 4;
        return (
          <mesh key={i} position={[x, -0.15, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w, 0.5]} />
            <meshBasicMaterial color={'#E9E2A8'} transparent opacity={0.35 + 0.35 * Math.abs(Math.sin(t * 3 + i * 1.7))} />
          </mesh>
        );
      })}
    </group>
  );
};

/* ---------------- quay + houses ---------------- */
export type PlaceId = 'home' | 'work' | 'gym' | 'cafe';
export const HOUSES: { id: PlaceId; x: number; z: number; w: number; h: number; d: number; color: string; roof: string; sign?: string }[] = [
  { id: 'home', x: -7, z: -5, w: 5, h: 4, d: 5, color: '#C9774B', roof: '#7A3B2A' },
  { id: 'cafe', x: -14, z: -8, w: 4, h: 3.2, d: 4, color: '#B48A5A', roof: '#5C3A22' },
  { id: 'work', x: 0, z: -12, w: 5, h: 9, d: 5, color: '#5A7FA8', roof: '#2E4560' },
  { id: 'gym', x: -21, z: -6, w: 6, h: 3.6, d: 5, color: '#B04A50', roof: '#5E2328' },
];

/* one merged mesh for all ground voxels and one for all lit windows: few draw calls = fast software rendering */
const colored = (g: THREE.BufferGeometry, hex: string) => {
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
};

const useGround = () =>
  useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (let x = -30; x <= 8; x += 2)
      for (let z = -18; z <= 6; z += 2) {
        const y = -0.5 + Math.floor(rnd(x * 3.1 + z * 7.7) * 3) * 0.12;
        const g = new THREE.BoxGeometry(2, 1, 2).toNonIndexed();
        g.translate(x, y, z);
        parts.push(colored(g, rnd(x * 1.3 + z * 2.9) > 0.5 ? '#3B4A86' : '#33417A'));
      }
    return mergeGeometries(parts)!;
  }, []);

const useHouses = () =>
  useMemo(() => {
    const solid: THREE.BufferGeometry[] = [];
    const glow: THREE.BufferGeometry[] = [];
    HOUSES.forEach((h) => {
      const body = new THREE.BoxGeometry(h.w, h.h, h.d).toNonIndexed();
      body.translate(h.x, h.h / 2, h.z);
      solid.push(colored(body, h.color));
      const roof = new THREE.ConeGeometry(Math.max(h.w, h.d) * 0.78, 1.8, 4).toNonIndexed();
      roof.rotateY(Math.PI / 4);
      roof.translate(h.x, h.h + 0.9, h.z);
      solid.push(colored(roof, h.roof));
      const cols = Math.max(1, Math.floor(h.w / 1.4));
      const rows = Math.max(1, Math.floor((h.h - 0.8) / 1.4));
      let i = 0;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const w = new THREE.PlaneGeometry(0.7, 0.8).toNonIndexed();
          w.translate(h.x - h.w / 2 + 0.9 + c * 1.4, 0.9 + r * 1.4, h.z + h.d / 2 + 0.02);
          glow.push(colored(w, rnd(i++ * 7 + h.x) > 0.25 ? '#FFD36E' : '#1C2240'));
        }
      const door = new THREE.PlaneGeometry(0.9, 1.4).toNonIndexed();
      door.translate(h.x, 0.7, h.z + h.d / 2 + 0.03);
      glow.push(colored(door, '#2A1A12'));
    });
    [-17, -10, -3, 4].forEach((x) => {
      const pole = new THREE.BoxGeometry(0.18, 3.2, 0.18).toNonIndexed();
      pole.translate(x, 1.6, -1.5);
      solid.push(colored(pole, '#1A1F38'));
      const lamp = new THREE.BoxGeometry(0.5, 0.4, 0.5).toNonIndexed();
      lamp.translate(x, 3.3, -1.5);
      glow.push(colored(lamp, '#FFD98A'));
    });
    return { solid: mergeGeometries(solid)!, glow: mergeGeometries(glow)! };
  }, []);

const Quay: React.FC<{ t: number }> = ({ t }) => {
  const ground = useGround();
  const houses = useHouses();
  return (
    <group>
      <mesh geometry={ground}>
        <meshLambertMaterial vertexColors flatShading />
      </mesh>
      <mesh geometry={houses.solid}>
        <meshLambertMaterial vertexColors flatShading />
      </mesh>
      <mesh geometry={houses.glow}>
        <meshBasicMaterial vertexColors />
      </mesh>
    </group>
  );
};

/* ---------------- Lucas (voxel character) ---------------- */
export const PHONE_Y = 1.9;
export const PHONE_Z = 0.72;
export type LucasPose = { x: number; z: number; rotY: number; walk: number; phone: number; jump: number; smile: number; opacity?: number; scatter?: number; pov?: boolean };

const Lucas: React.FC<{ p: LucasPose; t: number; screen?: THREE.Texture }> = ({ p, t, screen }) => {
  const sw = Math.sin(t * 9) * 0.6 * p.walk;
  const bob = Math.abs(Math.sin(t * 9)) * 0.12 * p.walk + p.jump;
  const armUp = p.phone; // 0 down, 1 holding phone in front of face
  const op = p.opacity ?? 1;
  const sc = p.scatter ?? 0;
  const mat = (c: string) => <meshLambertMaterial color={c} flatShading transparent={op < 1} opacity={op} />;
  const part = (k: number): [number, number, number] => [(rnd(k) - 0.5) * sc * 4, rnd(k + 9) * sc * 3, (rnd(k + 17) - 0.5) * sc * 4];
  return (
    <group position={[p.x, bob, p.z]} rotation={[0, p.rotY, 0]}>
      {/* legs */}
      <mesh position={[-0.22 + part(1)[0], 0.55 + part(1)[1], part(1)[2]]} rotation={[sw, 0, 0]}>
        <boxGeometry args={[0.36, 1.1, 0.4]} />
        {mat('#22274A')}
      </mesh>
      <mesh position={[0.22 + part(2)[0], 0.55 + part(2)[1], part(2)[2]]} rotation={[-sw, 0, 0]}>
        <boxGeometry args={[0.36, 1.1, 0.4]} />
        {mat('#22274A')}
      </mesh>
      {/* hoodie */}
      <mesh position={[part(3)[0], 1.65 + part(3)[1], part(3)[2]]} visible={!p.pov}>
        <boxGeometry args={[1.0, 1.15, 0.6]} />
        {mat('#2F8F6B')}
      </mesh>
      {/* arms */}
      <mesh position={[-0.65 + part(4)[0], 1.7 + part(4)[1], 0.1 * armUp + part(4)[2]]} rotation={[-sw * (1 - armUp) - armUp * 1.25, 0, 0.12 * armUp]}>
        <boxGeometry args={[0.3, 1.0, 0.32]} />
        {mat('#2A7E5E')}
      </mesh>
      <mesh position={[0.65 + part(5)[0], 1.7 + part(5)[1], 0.1 * armUp + part(5)[2]]} rotation={[sw * (1 - armUp) - armUp * 1.25, 0, -0.12 * armUp]}>
        <boxGeometry args={[0.3, 1.0, 0.32]} />
        {mat('#2A7E5E')}
      </mesh>
      {/* phone */}
      {armUp > 0.05 && (
        // screen facing Lucas (and the over-the-shoulder camera): it shows the real app
        <group position={[0, PHONE_Y + part(6)[1], PHONE_Z * armUp + part(6)[2]]} rotation={[0.3, 0, 0]} scale={armUp}>
          <mesh>
            <boxGeometry args={[0.5, 1.0, 0.06]} />
            <meshLambertMaterial color={'#141414'} />
          </mesh>
          <mesh position={[0, 0, -0.035]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.44, 0.94]} />
            <meshBasicMaterial key={screen ? 'tex' : 'none'} color={screen ? '#ffffff' : '#52DFAF'} map={screen ?? null} toneMapped={false} />
          </mesh>
        </group>
      )}
      {/* head */}
      <group position={[part(7)[0], 2.62 + part(7)[1], part(7)[2]]} visible={!p.pov}>
        <mesh>
          <boxGeometry args={[0.82, 0.8, 0.78]} />
          {mat('#E2A97E')}
        </mesh>
        <mesh position={[0, 0.42, -0.05]}>
          <boxGeometry args={[0.88, 0.2, 0.86]} />
          {mat('#2B1B14')}
        </mesh>
        <mesh position={[0, 0.2, -0.38]}>
          <boxGeometry args={[0.88, 0.5, 0.12]} />
          {mat('#2B1B14')}
        </mesh>
        {/* eyes */}
        <mesh position={[-0.18, 0.05, 0.4]}>
          <boxGeometry args={[0.13, 0.17 - 0.08 * p.smile, 0.02]} />
          <meshBasicMaterial color={'#111'} transparent={op < 1} opacity={op} />
        </mesh>
        <mesh position={[0.18, 0.05, 0.4]}>
          <boxGeometry args={[0.13, 0.17 - 0.08 * p.smile, 0.02]} />
          <meshBasicMaterial color={'#111'} transparent={op < 1} opacity={op} />
        </mesh>
        {/* mouth */}
        <mesh position={[0, -0.2, 0.4]}>
          <boxGeometry args={[0.18 + 0.16 * p.smile, 0.06, 0.02]} />
          <meshBasicMaterial color={'#5A2A20'} transparent={op < 1} opacity={op} />
        </mesh>
      </group>
    </group>
  );
};

/* ---------------- camera ---------------- */
export type Cam = { pos: [number, number, number]; look: [number, number, number]; fov: number; roll?: number };
const CameraRig: React.FC<{ cam: Cam }> = ({ cam }) => {
  const { camera } = useThree();
  const c = camera as THREE.PerspectiveCamera;
  c.position.set(...cam.pos);
  c.lookAt(new THREE.Vector3(...cam.look));
  if (cam.roll) c.rotateZ(cam.roll);
  if (c.fov !== cam.fov) {
    c.fov = cam.fov;
    c.updateProjectionMatrix();
  }
  return null;
};

export const World: React.FC<{ t: number; cam: Cam; lucas: LucasPose; moonGlow?: number; dim?: number; screen?: THREE.Texture }> = ({ t, cam, lucas, moonGlow = 1, dim = 0, screen }) => (
  <>
    <CameraRig cam={cam} />
    <color attach="background" args={['#0B1240']} />
    <fog attach="fog" args={['#121C5A', 60, 260]} />
    <ambientLight color={'#5868C8'} intensity={0.9 * (1 - dim * 0.6)} />
    <hemisphereLight args={['#7C8FE8', '#0A0F30', 0.6 * (1 - dim * 0.6)]} />
    <directionalLight position={[30, 40, -80]} color={'#F2E6B0'} intensity={1.6 * (1 - dim * 0.7)} />
    <Moon t={t} pos={[-2, 46, -170]} glow={moonGlow} />
    <Sea t={t} />
    <Quay t={t} />
    <pointLight position={[lucas.x + 1.8, 3.8, lucas.z + 3]} color={'#B9C6FF'} intensity={7} distance={12} decay={1.4} />
    <pointLight position={[lucas.x - 2, 2.5, lucas.z - 2]} color={'#FFB06A'} intensity={4} distance={8} decay={1.5} />
    <pointLight position={[lucas.x, 2.2, lucas.z + 1.2]} color={'#7FF0C8'} intensity={3 * lucas.phone} distance={3.5} />
    <Lucas p={lucas} t={t} screen={screen} />
  </>
);
