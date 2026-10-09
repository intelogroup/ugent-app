"use client";

import { useRef, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment } from "@react-three/drei";
import * as THREE from "three";

// ── tetrahedron vertices (regular, edge ~2.3) ──
const TETRA_R = 1.25;
const TETRA_VERTS: [number, number, number][] = [
  [1, 1, 1],
  [-1, -1, 1],
  [-1, 1, -1],
  [1, -1, -1],
].map(([x, y, z]) => {
  const s = TETRA_R / Math.sqrt(3);
  return [x * s, y * s, z * s] as [number, number, number];
});

const TETRA_EDGES: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3],
];

function Bond({ a, b, color = "#94a3b8" }: { a: THREE.Vector3; b: THREE.Vector3; color?: string }) {
  const dir = useMemo(() => new THREE.Vector3().subVectors(b, a), [a, b]);
  const len = dir.length();
  const mid = useMemo(() => new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), [a, b]);
  const quat = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return q;
  }, [dir]);
  return (
    <mesh position={mid} quaternion={quat}>
      <cylinderGeometry args={[0.032, 0.032, len, 8]} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>
  );
}

function WireTetra({ verts, opacity = 0.14 }: { verts: THREE.Vector3[]; opacity?: number }) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    // 4 faces
    const idx = [0,1,2, 0,2,3, 0,3,1, 1,3,2];
    const pos: number[] = [];
    for (const i of idx) { pos.push(verts[i].x, verts[i].y, verts[i].z); }
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    return g;
  }, [verts]);
  return (
    <mesh geometry={geom}>
      <meshStandardMaterial color="#06b6d4" transparent opacity={opacity} side={THREE.DoubleSide} roughness={0.2} metalness={0.05} />
    </mesh>
  );
}

function EdgeLines({ verts, color = "#ffffff" }: { verts: THREE.Vector3[]; color?: string }) {
  const geom = useMemo(() => {
    const pts: number[] = [];
    for (const [i, j] of TETRA_EDGES) {
      pts.push(verts[i].x, verts[i].y, verts[i].z, verts[j].x, verts[j].y, verts[j].z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [verts]);
  return (
    <lineSegments geometry={geom}>
      <lineBasicMaterial color={color} transparent opacity={0.55} />
    </lineSegments>
  );
}

function Phosphate({
  position = new THREE.Vector3(0, 0, 0),
  scale = 1,
  showLabels = true,
  spin = true,
  rotOffset = 0,
}: {
  position?: THREE.Vector3;
  scale?: number;
  showLabels?: boolean;
  spin?: boolean;
  rotOffset?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const verts = useMemo(() => TETRA_VERTS.map(v => new THREE.Vector3(...v)), []);
  useFrame(({ clock }) => {
    if (!group.current || !spin) return;
    const t = clock.getElapsedTime() + rotOffset;
    group.current.rotation.y = t * 0.35;
    group.current.rotation.x = Math.sin(t * 0.3) * 0.2;
  });
  return (
    <group ref={group} position={position} scale={scale}>
      {/* central P */}
      <mesh>
        <sphereGeometry args={[0.42, 32, 32]} />
        <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.25} roughness={0.35} metalness={0.1} />
      </mesh>
      {showLabels && (
        <mesh position={[0, 0, 0.7]}>
          <planeGeometry args={[0, 0]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
      )}
      {/* 4 Oxygens */}
      {verts.map((v, i) => (
        <mesh key={i} position={v}>
          <sphereGeometry args={[0.30, 24, 24]} />
          <meshStandardMaterial
            color={i === 0 ? "#ef4444" : "#38bdf8"}
            emissive={i === 0 ? "#ef4444" : "#38bdf8"}
            emissiveIntensity={0.18}
            roughness={0.3}
          />
        </mesh>
      ))}
      {/* P-O bonds */}
      {verts.map((v, i) => (
        <Bond key={`b-${i}`} a={new THREE.Vector3(0, 0, 0)} b={v} color="#cbd5e1" />
      ))}
      <WireTetra verts={verts} opacity={0.13} />
      <EdgeLines verts={verts} color="#e0f2fe" />
    </group>
  );
}

function ATPChain() {
  const g = useRef<THREE.Group>(null);
  const offs = [-2.4, 0, 2.4];
  useFrame(({ clock }) => {
    if (!g.current) return;
    const t = clock.getElapsedTime();
    g.current.rotation.y = t * 0.22;
    g.current.rotation.x = Math.sin(t * 0.25) * 0.12;
  });
  return (
    <group ref={g}>
      {offs.map((x, i) => (
        <Phosphate key={i} position={new THREE.Vector3(x, 0, 0)} scale={0.85} spin={false} />
      ))}
      {/* bridging bonds between phosphates */}
      {offs.slice(0, 2).map((_, i) => {
        const a = new THREE.Vector3(offs[i] + 0.95, 0, 0);
        const b = new THREE.Vector3(offs[i + 1] - 0.95, 0, 0);
        return <Bond key={`atp-${i}`} a={a} b={b} color="#f59e0b" />;
      })}
      {/* ribose + adenine stump (simple) */}
      <group position={[-4.6, 0, 0]}>
        <mesh>
          <sphereGeometry args={[0.55, 24, 24]} />
          <meshStandardMaterial color="#a78bfa" roughness={0.4} />
        </mesh>
        <Bond a={new THREE.Vector3(0.55, 0, 0)} b={new THREE.Vector3(1.45, 0, 0)} color="#a78bfa" />
        <mesh position={[0, 0.9, 0]}>
          <sphereGeometry args={[0.35, 16, 16]} />
          <meshStandardMaterial color="#f0abfc" />
        </mesh>
      </group>
    </group>
  );
}

function ApatiteCluster() {
  const g = useRef<THREE.Group>(null);
  const phosphates: THREE.Vector3[] = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const s = 2.1;
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 0; z++) {
      if (x === 0 && y === 0 && z === 0) continue;
      if (Math.random() > 0.45) continue;
      pts.push(new THREE.Vector3(x * s + (Math.random() - 0.5) * 0.5, y * s + (Math.random() - 0.5) * 0.5, z * s + (Math.random() - 0.5) * 0.5));
    }
    // deterministic fallback — at least 4
    if (pts.length < 4) return [new THREE.Vector3(-2, 0, 0), new THREE.Vector3(2, 0, 0), new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, -2, 0)];
    return pts.slice(0, 6);
  }, []);
  const cas: THREE.Vector3[] = useMemo(() => {
    const c: THREE.Vector3[] = [];
    for (let i = 0; i < 8; i++) c.push(new THREE.Vector3((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 2));
    return c;
  }, []);
  useFrame(({ clock }) => {
    if (!g.current) return;
    g.current.rotation.y = clock.getElapsedTime() * 0.18;
  });
  return (
    <group ref={g}>
      {phosphates.map((p, i) => (
        <Phosphate key={`ap-${i}`} position={p} scale={0.62} spin={false} />
      ))}
      {cas.map((p, i) => (
        <mesh key={`ca-${i}`} position={p}>
          <sphereGeometry args={[0.28, 16, 16]} />
          <meshStandardMaterial color="#22d3ee" emissive="#06b6d4" emissiveIntensity={0.2} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
}

type Mode = "po4" | "atp" | "apitite" | "membrane";

export default function PhosphorusPage() {
  const [mode, setMode] = useState<Mode>("po4");

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col">
      {/* header — ugent glass strip */}
      <div className="border-b border-white/10 bg-white/[0.04] backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold tracking-[0.14em] uppercase text-cyan-300">Ugent · Study Visual</div>
            <div className="text-[22px] font-bold tracking-tight text-white -mt-0.5">Phosphorus — the tetrahedron</div>
            <p className="text-[13px] text-slate-400">One shape, every role · PO₄³⁻ in the body</p>
          </div>
          <a href="/dashboard" className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white text-slate-900 px-4 py-2 text-sm font-semibold hover:bg-slate-100 transition">
            ← Dashboard
          </a>
        </div>
      </div>

      <div className="flex-1 grid lg:grid-cols-[1.35fr_0.85fr] min-h-0">
        {/* 3D */}
        <div className="relative h-[52vh] lg:h-auto lg:min-h-[640px] bg-[#020617]">
          <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: false }} onCreated={({ gl }) => gl.setClearColor("#020617")}>
            <PerspectiveCamera makeDefault position={[0, 1.2, 9]} fov={38} />
            <OrbitControls enablePan={false} minDistance={4} maxDistance={14} autoRotate autoRotateSpeed={0.35} />
            <ambientLight intensity={0.9} />
            <directionalLight position={[4, 6, 5]} intensity={1.4} />
            <directionalLight position={[-4, -2, -4]} intensity={0.6} color="#38bdf8" />
            <pointLight position={[0, 3, 3]} intensity={1.2} color="#f97316" />
            <Environment preset="studio" />
            {mode === "po4" && <Phosphate />}
            {mode === "atp" && <ATPChain />}
            {mode === "apitite" && <ApatiteCluster />}
            {mode === "membrane" && (
              <group>
                <Phosphate position={new THREE.Vector3(-1.6, 0.6, 0)} scale={0.75} spin={false} rotOffset={0} />
                <Phosphate position={new THREE.Vector3(1.6, 0.6, 0)} scale={0.75} spin={false} rotOffset={1.2} />
                {/* glycerol bridge + tails (stylized) */}
                <mesh position={[0, -0.2, 0]}>
                  <sphereGeometry args={[0.35, 16, 16]} />
                  <meshStandardMaterial color="#fbbf24" />
                </mesh>
                {[[-0.5, -1.2], [0.5, -1.2]].map(([x, y], i) => (
                  <mesh key={i} position={[x, y as number - 0.8, 0]}>
                    <cylinderGeometry args={[0.09, 0.09, 2.2, 8]} />
                    <meshStandardMaterial color="#eab308" roughness={0.6} />
                  </mesh>
                ))}
              </group>
            )}
          </Canvas>

          {/* bottom mode bar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/15">
            {([
              ["po4", "PO₄³⁻"],
              ["atp", "ATP ×3"],
              ["apitite", "Bone"],
              ["membrane", "Membrane"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setMode(k)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition ${mode === k ? "bg-white text-slate-900 shadow" : "text-white/80 hover:text-white hover:bg-white/10"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="absolute top-4 left-4 text-[11px] font-medium tracking-wide text-white/45 bg-white/8 backdrop-blur px-2.5 py-1 rounded-full border border-white/10">
            drag to orbit · scroll to zoom · auto-rotate
          </div>
        </div>

        {/* explainer */}
        <div className="bg-[#f8fafc] text-slate-900 p-6 sm:p-8 overflow-auto">
          <div className="max-w-[520px]">
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 border border-cyan-200 px-3 py-1 text-[11px] font-bold tracking-widest uppercase text-cyan-700">
              <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" /> Why a tetrahedron?
            </div>

            <div className="mt-4 text-[26px] font-bold tracking-tight leading-none text-slate-900">Same tetrahedron everywhere.</div>
            <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
              Phosphate is <span className="font-semibold text-slate-900">one phosphorus + four oxygens</span> at the corners of a regular tetrahedron (~109.5°). Every biological use is just that shape chained, stacked, or draped in lipid.
            </p>

            {/* quick stats */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white border border-slate-200 p-3">
                <div className="text-[11px] font-bold tracking-widest uppercase text-slate-400">Body store</div>
                <div className="mt-1 text-[20px] font-bold">85%</div>
                <div className="text-[12px] text-slate-500 leading-tight">bone &amp; teeth as hydroxyapatite</div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 p-3">
                <div className="text-[11px] font-bold tracking-widest uppercase text-slate-400">Serum</div>
                <div className="mt-1 text-[20px] font-bold">2.5–4.5</div>
                <div className="text-[12px] text-slate-500 leading-tight">mg/dL · &lt;1% of total</div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 p-3">
                <div className="text-[11px] font-bold tracking-widest uppercase text-slate-400">Absorption</div>
                <div className="mt-1 text-[20px] font-bold">60–70%</div>
                <div className="text-[12px] text-slate-500 leading-tight">jejunum · NaPi-IIb + passive</div>
              </div>
            </div>

            {/* mode-specific */}
            <div className="mt-6 rounded-2xl bg-white border border-slate-200 p-5">
              {mode === "po4" && (
                <>
                  <h3 className="text-[13px] font-bold tracking-widest uppercase text-cyan-700">The unit — PO₄³⁻</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-600">Central P (orange) + 4 O (3 blue = O²⁻, 1 red = OH in HPO₄²⁻). Wireframe shows the tetrahedron. Drag to see the 109.5° geometry — that angle is why it tiles so well into bone and DNA.</p>
                  <ul className="mt-3 space-y-1.5 text-[13px] text-slate-700 list-disc pl-5">
                    <li>Titratable acid in urine = HPO₄²⁻ → H₂PO₄⁻</li>
                    <li>2,3-BPG in RBCs binds Hb via same charge</li>
                  </ul>
                </>
              )}
              {mode === "atp" && (
                <>
                  <h3 className="text-[13px] font-bold tracking-widest uppercase text-amber-600">ATP — three in a chain</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-600">Adenine (pink) — ribose (purple) — <span className="font-semibold">PPP</span> chain. Hydrolyzing one P–O bond drops ~7.3 kcal/mol. The chain is just three tetrahedra sharing corners.</p>
                  <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-[12px] text-amber-800">Exam: ATP → ADP + Pi is exergonic because the polyphosphate chain is electrostatically strained.</div>
                </>
              )}
              {mode === "apitite" && (
                <>
                  <h3 className="text-[13px] font-bold tracking-widest uppercase text-teal-700">Bone — Ca₁₀(PO₄)₆(OH)₂</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-600">Tetrahedra (dim) + Ca²⁺ (cyan spheres). Hydroxyapatite lattice. Vitamin D builds it; PTH/FGF23 dissolve it via phosphate wasting.</p>
                  <ul className="mt-3 space-y-1.5 text-[13px] text-slate-700 list-disc pl-5">
                    <li>XLH / TIO → excess FGF23 → wasting → rickets</li>
                    <li>CKD: PO₄ retained when GFR &lt;30 → secondary hyperPTH</li>
                  </ul>
                </>
              )}
              {mode === "membrane" && (
                <>
                  <h3 className="text-[13px] font-bold tracking-widest uppercase text-violet-700">Membrane — phospholipid</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-600">Two PO₄ heads + glycerol (yellow) + fatty-acid tails. The tetrahedron is the hydrophilic anchor; tails hide inside. That amphipathic split <em>is</em> the bilayer.</p>
                </>
              )}
            </div>

            {/* regulation strip */}
            <div className="mt-4 rounded-2xl bg-slate-900 text-white p-5">
              <div className="text-[11px] font-bold tracking-widest uppercase text-cyan-300">Regulation (USMLE high-yield)</div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                <div><div className="text-[11px] uppercase tracking-widest text-slate-400">PTH</div><div className="mt-1 text-[12px] font-semibold">wastes PO₄</div><div className="text-[11px] text-slate-400">NaPi-IIa internalized</div></div>
                <div><div className="text-[11px] uppercase tracking-widest text-slate-400">FGF23</div><div className="mt-1 text-[12px] font-semibold">wastes PO₄</div><div className="text-[11px] text-slate-400">+ ↓ 1α-hydroxylase</div></div>
                <div><div className="text-[11px] uppercase tracking-widest text-slate-400">Calcitriol</div><div className="mt-1 text-[12px] font-semibold">absorbs PO₄</div><div className="text-[11px] text-slate-400">NaPi-IIb ↑</div></div>
              </div>
              <div className="mt-4 flex gap-2">
                <a href="/strategy" className="flex-1 text-center rounded-full bg-white text-slate-900 py-2.5 text-[13px] font-semibold">Open Strategy</a>
                <a href="/quiz" className="flex-1 text-center rounded-full bg-white/10 border border-white/20 text-white py-2.5 text-[13px] font-semibold">Quiz me</a>
              </div>
            </div>

            <p className="mt-4 text-[11px] text-slate-400">Built with Three.js + @react-three/fiber · tetra geometry is exact · share this page as your memory palace for phosphorus.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
