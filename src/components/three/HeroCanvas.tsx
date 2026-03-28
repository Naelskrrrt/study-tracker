"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

function Polyhedron({
  position,
  color,
  speed,
}: {
  position: [number, number, number];
  color: string;
  speed: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * speed * 0.5;
      meshRef.current.rotation.y += delta * speed;
    }
    if (wireRef.current) {
      wireRef.current.rotation.x += delta * speed * 0.5;
      wireRef.current.rotation.y += delta * speed;
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.15}
        />
      </mesh>
      <mesh ref={wireRef}>
        <icosahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial
          color={color}
          wireframe
          transparent
          opacity={0.6}
        />
      </mesh>
    </group>
  );
}

function Particles() {
  const count = 80;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      // eslint-disable-next-line react-hooks/purity
      arr[i] = (Math.random() - 0.5) * 8;
    }
    return arr;
  }, []);

  const ref = useRef<THREE.Points>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.02;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#76b900"
        size={0.03}
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

function Scene() {
  const { pointer } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y +=
        (pointer.x * 0.3 - groupRef.current.rotation.y) * 0.05;
      groupRef.current.rotation.x +=
        (-pointer.y * 0.2 - groupRef.current.rotation.x) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <Polyhedron position={[-1.5, 0.3, 0]} color="#76b900" speed={0.4} />
      <Polyhedron position={[0, -0.2, 0.5]} color="#a8e063" speed={0.3} />
      <Polyhedron position={[1.5, 0.1, -0.5]} color="#6c63ff" speed={0.5} />
      <Particles />
    </group>
  );
}

export default function HeroCanvas() {
  return (
    <div className="h-[200px] w-full">
      <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 5, 5]} intensity={0.8} color="#76b900" />
        <Scene />
      </Canvas>
    </div>
  );
}
