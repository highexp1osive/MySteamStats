"use client";

import { useState, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Billboard } from "@react-three/drei";
import * as THREE from "three";

interface Planet {
  id: string;
  name: string;
  coverUrl: string;
  playtimeHours: number;
}

function CoverPlane({ url }: { url: string }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!url) return;
    new THREE.TextureLoader().load(
      url,
      setTexture,
      undefined,
      () => {}
    );
  }, [url]);

  if (!texture) {
    return <meshBasicMaterial color="#1a1a2e" />;
  }
  return <meshBasicMaterial map={texture} />;
}

function PlanetMesh({
  planet,
  angle,
  distance,
  scale,
}: {
  planet: Planet;
  angle: number;
  distance: number;
  scale: number;
}) {
  const x = Math.cos(angle) * distance;
  const z = Math.sin(angle) * distance;
  const y = (Math.random() - 0.5) * 2;

  return (
    <group position={[x, y, z]}>
      <Billboard>
        <mesh>
          <planeGeometry args={[scale, scale * 1.25]} />
          <CoverPlane url={planet.coverUrl} />
        </mesh>
        <Text
          position={[0, -scale * 0.65, 0]}
          fontSize={0.18}
          color="white"
          anchorX="center"
          anchorY="top"
          maxWidth={scale * 2}
        >
          {planet.name}
        </Text>
        <Text
          position={[0, -scale * 0.85, 0]}
          fontSize={0.14}
          color="#1a9fff"
          anchorX="center"
          anchorY="top"
        >
          {planet.playtimeHours}h
        </Text>
      </Billboard>
    </group>
  );
}

function CenterSphere({ avatarUrl }: { avatarUrl: string }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!avatarUrl) return;
    new THREE.TextureLoader().load(avatarUrl, setTexture);
  }, [avatarUrl]);

  return (
    <mesh>
      <sphereGeometry args={[1, 32, 32]} />
      {texture ? (
        <meshBasicMaterial map={texture} />
      ) : (
        <meshBasicMaterial color="#1a9fff" />
      )}
      <pointLight intensity={2} color="#1a9fff" distance={20} />
    </mesh>
  );
}

function GalaxyScene({
  planets,
  centerAvatar,
}: {
  planets: Planet[];
  centerAvatar: string;
}) {
  const maxH = Math.max(...planets.map((p) => p.playtimeHours), 1);
  const minH = Math.min(...planets.map((p) => p.playtimeHours), 1);

  return (
    <>
      <ambientLight intensity={0.4} />
      <CenterSphere avatarUrl={centerAvatar} />
      {planets.map((planet, i) => {
        const t =
          maxH === minH
            ? 0.5
            : (planet.playtimeHours - minH) / (maxH - minH);
        const distance = 3 + (1 - t) * 10;
        const scale = 0.4 + t * 1.6;
        const angle = (i / planets.length) * Math.PI * 2;

        return (
          <PlanetMesh
            key={planet.id}
            planet={planet}
            angle={angle}
            distance={distance}
            scale={scale}
          />
        );
      })}
    </>
  );
}

export default function GalaxyView({
  planets,
  centerAvatar,
}: {
  planets: Planet[];
  centerAvatar: string;
}) {
  return (
    <Canvas
      camera={{ position: [0, 5, 15], fov: 50 }}
      style={{ background: "#0a0a14" }}
    >
      <OrbitControls
        enableZoom
        enablePan
        minDistance={3}
        maxDistance={40}
        autoRotate
        autoRotateSpeed={0.3}
      />
      <GalaxyScene planets={planets} centerAvatar={centerAvatar} />
    </Canvas>
  );
}
