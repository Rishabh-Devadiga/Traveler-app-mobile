import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface GlobeMarker {
  name: string;
  lat: number;
  lon: number;
  color: string;
}

interface GlobeViewProps {
  markers: GlobeMarker[];
  height?: number;
}

/**
 * Supporting 3D globe component converted from Stitch `three.js/code.html`.
 * Procedural canvas texture + markers + drag + auto-rotate. Not a route.
 */
export default function GlobeView({ markers, height = 220 }: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 360;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 2.7;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    const texCanvas = document.createElement('canvas');
    texCanvas.width = 1024;
    texCanvas.height = 512;
    const ctx = texCanvas.getContext('2d');
    if (ctx) {
      const oceanGrad = ctx.createLinearGradient(0, 0, 0, 512);
      oceanGrad.addColorStop(0, '#10393b');
      oceanGrad.addColorStop(0.5, '#184e52');
      oceanGrad.addColorStop(1, '#0e3133');
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, 0, 1024, 512);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      for (let lat = 40; lat < 512; lat += 50) {
        ctx.beginPath();
        ctx.moveTo(0, lat);
        ctx.lineTo(1024, lat);
        ctx.stroke();
      }
      for (let lon = 50; lon < 1024; lon += 80) {
        ctx.beginPath();
        ctx.moveTo(lon, 0);
        ctx.lineTo(lon, 512);
        ctx.stroke();
      }
      const drawContinent = (points: number[][], fill: string) => {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i][0], points[i][1]);
        ctx.closePath();
        ctx.fill();
      };
      drawContinent(
        [[690, 180], [730, 185], [745, 230], [715, 285], [700, 260], [680, 220], [675, 195]],
        '#86efac',
      );
      drawContinent(
        [[520, 120], [600, 100], [700, 110], [820, 140], [860, 200], [780, 220]],
        '#34d399',
      );
      drawContinent([[510, 180], [580, 190], [610, 250], [570, 340], [530, 360]], '#6ee7b7');
    }
    const earthTexture = new THREE.CanvasTexture(texCanvas);
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(1, 48, 48),
      new THREE.MeshPhongMaterial({ map: earthTexture, shininess: 18 }),
    );
    globe.rotation.x = 0.35;
    globe.rotation.y = -1.2;
    scene.add(globe);

    const latLonToVector3 = (lat: number, lon: number, radius: number) => {
      const phi = ((90 - lat) * Math.PI) / 180;
      const theta = ((lon + 180) * Math.PI) / 180;
      return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta),
      );
    };

    const markersGroup = new THREE.Group();
    markers.forEach((m) => {
      const pos = latLonToVector3(m.lat, m.lon, 1.02);
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 12, 12),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(m.color) }),
      );
      dot.position.copy(pos);
      markersGroup.add(dot);
    });
    globe.add(markersGroup);

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const directional = new THREE.DirectionalLight(0xffffff, 0.9);
    directional.position.set(3, 2, 4);
    scene.add(directional);

    let dragging = false;
    let prevX = 0;
    let prevY = 0;
    let raf = 0;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      globe.rotation.y += (e.clientX - prevX) * 0.005;
      globe.rotation.x += (e.clientY - prevY) * 0.003;
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onUp = () => {
      dragging = false;
    };
    const onResize = () => {
      const w = container.clientWidth || 360;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };

    const animate = () => {
      if (!dragging) globe.rotation.y += 0.0025;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    renderer.domElement.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [markers, height]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Interactive 3D globe with TourFlow destinations"
      className="w-full overflow-hidden"
      style={{ height }}
    />
  );
}
