"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Billboard, useTexture } from "@react-three/drei";

interface Planet {
  id: string;
  name: string;
  coverUrl: string;
  playtimeHours: number;
}

function PlanetMesh({
  planet,
  theta,
  phi,
  distance,
}: {
  planet: Planet;
  theta: number;
  phi: number;
  distance: number;
}) {
  const x = distance * Math.sin(phi) * Math.cos(theta);
  const y = distance * Math.cos(phi);
  const z = distance * Math.sin(phi) * Math.sin(theta);

  return (
    <group position={[x, y, z]}>
      <Billboard>
        <CoverMesh url={planet.coverUrl} />
        <Text
          position={[0, -0.8, 0]}
          fontSize={0.15}
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

function CoverMesh({ url }: { url: string }) {
  let texture: any = null;
  try {
    texture = useTexture(url);
  } catch {
    // texture loading failed
  }
  return (
    <mesh>
      <planeGeometry args={[1, 1.25]} />
      <meshBasicMaterial
        map={texture}
        color={texture ? "white" : "#1a1a2e"}
      />
    </mesh>
  );
}

function CenterSphere({ avatarUrl }: { avatarUrl: string }) {
  let texture = null;
  try {
    texture = useTexture(avatarUrl || " ");
  } catch {
    // will use fallback color
  }

  return (
    <mesh>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial
        map={texture}
        color={texture ? "white" : "#1a9fff"}
      />
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
        const distance = 2 + (1 - t) * 5;

        // Random spherical distribution
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        return (
          <PlanetMesh
            key={planet.id}
            planet={planet}
            theta={theta}
            phi={phi}
            distance={distance}
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
