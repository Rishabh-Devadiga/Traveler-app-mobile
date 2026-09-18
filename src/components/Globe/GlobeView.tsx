import {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react';
import * as THREE from 'three';
import type {
  GlobeViewProps,
  GlobeRef,
  GlobeDestination,
  Arc,
} from './types';
import { DESTINATIONS } from '../../data/destinations';
import {
  STATE_ARCS,
  DISTRICT_ARCS,
  STATE_CENTROIDS,
} from '../../data/indiaBoundaries';

/* Geographic coordinate conversion to 3D Cartesian coordinates */
function latLngToVec3(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

const GlobeView = forwardRef<GlobeRef, GlobeViewProps>(function GlobeView(
  {
    mode = 'full',
    destinations = DESTINATIONS,
    selectedId = null,
    onSelectDestination,
    onDeselect,
    onRotateChange,
    onError,
    onWarn,
    onClickPreview,
    height,
    className = '',
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Mutable refs to expose imperative API to parent components
  const apiRef = useRef<GlobeRef>({
    zoomIn: () => {},
    zoomOut: () => {},
    toggleRotate: () => {},
    resetView: () => {},
    flyTo: () => {},
    selectById: () => {},
  });

  useImperativeHandle(ref, () => ({
    zoomIn: () => apiRef.current.zoomIn(),
    zoomOut: () => apiRef.current.zoomOut(),
    toggleRotate: () => apiRef.current.toggleRotate(),
    resetView: () => apiRef.current.resetView(),
    flyTo: (lat, lng, id) => apiRef.current.flyTo(lat, lng, id),
    selectById: (id) => apiRef.current.selectById(id),
  }));

  // Handlers wrapped in refs to avoid re-initializing the WebGL context
  const onSelectDestRef = useRef(onSelectDestination);
  onSelectDestRef.current = onSelectDestination;

  const onDeselectRef = useRef(onDeselect);
  onDeselectRef.current = onDeselect;

  const onRotateChangeRef = useRef(onRotateChange);
  onRotateChangeRef.current = onRotateChange;

  const onClickPreviewRef = useRef(onClickPreview);
  onClickPreviewRef.current = onClickPreview;

  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.clientWidth || 360;
    let containerHeight =
      typeof height === 'number'
        ? height
        : container.clientHeight || 360;

    const isPreview = mode === 'preview';

    /* Scene, Camera & WebGL Renderer */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      width / containerHeight,
      0.1,
      300
    );

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: isPreview,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, containerHeight);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = isPreview ? 'pan-y' : 'none';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    /* Realistic Lighting */
    const ambientLight = new THREE.AmbientLight(0xdde6f5, 1.15);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.4);
    sunLight.position.set(6, 4, 6);
    scene.add(sunLight);

    const backLight = new THREE.DirectionalLight(0x234477, 0.6);
    backLight.position.set(-6, -2, -5);
    scene.add(backLight);

    const R = 1.0;
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    /* Earth Sphere */
    const globeMat = new THREE.MeshPhongMaterial({
      color: 0x1a4f8b,
      shininess: 12,
      specular: 0x223344,
    });
    const globeGeo = new THREE.SphereGeometry(R, 64, 64);
    const globe = new THREE.Mesh(globeGeo, globeMat);
    globeGroup.add(globe);

    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = 'anonymous';
    textureLoader.load(
      'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
      (tex) => {
        tex.generateMipmaps = true;
        globeMat.map = tex;
        globeMat.color.set(0xffffff);
        globeMat.needsUpdate = true;
      },
      undefined,
      () => {
        onWarn?.(
          'High-res Earth texture offline; displaying fallback realistic terrain styling.'
        );
      }
    );

    /* Atmosphere Glow Layer */
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x4f94ff,
      transparent: true,
      opacity: 0.16,
      side: THREE.BackSide,
    });
    const atmoGeo = new THREE.SphereGeometry(R * 1.075, 64, 64);
    const atmo = new THREE.Mesh(atmoGeo, atmoMat);
    scene.add(atmo);

    /* Space Starfield */
    const starCount = isPreview ? 250 : 850;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const u = Math.random() * 2 - 1;
      const a = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const dist = 45 + Math.random() * 35;
      starPositions[i * 3] = s * Math.cos(a) * dist;
      starPositions[i * 3 + 1] = u * dist;
      starPositions[i * 3 + 2] = s * Math.sin(a) * dist;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(starPositions, 3)
    );
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.85,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    /* Line segments builder for boundaries */
    function buildLineSegments(
      arcs: Arc[],
      radiusElevation: number,
      colorHex: number,
      initialOpacity: number
    ): THREE.LineSegments {
      const positions: number[] = [];
      for (let a = 0; a < arcs.length; a++) {
        const arc = arcs[a];
        for (let p = 0; p < arc.length - 1; p++) {
          const p1 = latLngToVec3(arc[p][1], arc[p][0], radiusElevation);
          const p2 = latLngToVec3(arc[p + 1][1], arc[p + 1][0], radiusElevation);
          positions.push(p1.x, p1.y, p1.z);
          positions.push(p2.x, p2.y, p2.z);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: initialOpacity,
        depthTest: true,
        depthWrite: false,
      });
      return new THREE.LineSegments(geo, mat);
    }

    /* State boundaries in refined warm gold */
    const stateMesh = buildLineSegments(STATE_ARCS, R * 1.0025, 0xe5c058, 0.85);
    globeGroup.add(stateMesh);

    /* District boundaries in subtle slate-blue (only in full mode for performance) */
    let districtMesh: THREE.LineSegments | null = null;
    if (!isPreview) {
      districtMesh = buildLineSegments(DISTRICT_ARCS, R * 1.0018, 0x7fa6d8, 0.4);
      districtMesh.visible = false;
      globeGroup.add(districtMesh);
    }

    /* Subtle State Name Labels on Centroids (full mode) */
    const stateLabelSprites: THREE.Sprite[] = [];
    if (!isPreview) {
      const createStateLabel = (name: string, lat: number, lng: number): THREE.Sprite => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.font =
            'bold 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = 'rgba(5, 11, 24, 0.88)';
          ctx.fillText(name.toUpperCase(), 129, 33);
          ctx.fillStyle = '#FFEAA7';
          ctx.fillText(name.toUpperCase(), 128, 32);
        }
        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          opacity: 0.85,
          depthTest: true,
          depthWrite: false,
        });
        const sprite = new THREE.Sprite(mat);
        const p = latLngToVec3(lat, lng, R * 1.006);
        sprite.position.copy(p);
        sprite.scale.set(0.18, 0.045, 1.0);
        sprite.visible = false;
        globeGroup.add(sprite);
        return sprite;
      };

      STATE_CENTROIDS.forEach((c) => {
        const lbl = createStateLabel(c.name, c.lat, c.lng);
        stateLabelSprites.push(lbl);
      });
    }

    /* Destination Markers Generation */
    function createMarkerTexture(
      dest: GlobeDestination,
      onReady?: () => void
    ): THREE.CanvasTexture {
      const size = 128;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      function drawBaseEmblem(img: HTMLImageElement | null) {
        if (!ctx) return;
        ctx.clearRect(0, 0, size, size);
        const cx = size / 2;
        const cy = size / 2;
        const radius = size * 0.38;

        /* Outer glow ring */
        const glowGrad = ctx.createRadialGradient(
          cx,
          cy,
          radius * 0.8,
          cx,
          cy,
          radius * 1.25
        );
        glowGrad.addColorStop(0, 'rgba(212, 175, 55, 0.45)');
        glowGrad.addColorStop(0.7, 'rgba(255, 215, 0, 0.15)');
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.25, 0, Math.PI * 2);
        ctx.fill();

        /* Drop shadow ring */
        ctx.beginPath();
        ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(5, 11, 24, 0.85)';
        ctx.fill();

        /* Clipped photo or monogram */
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.clip();

        if (img) {
          ctx.drawImage(img, cx - radius, cy - radius, radius * 2, radius * 2);
        } else {
          const grad = ctx.createLinearGradient(0, 0, size, size);
          grad.addColorStop(0, '#102046');
          grad.addColorStop(1, '#081226');
          ctx.fillStyle = grad;
          ctx.fill();

          ctx.fillStyle = '#FFD700';
          ctx.font = 'bold 26px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(dest.name.charAt(0) || '★', cx, cy);
        }
        ctx.restore();

        /* Premium Double Gold Border */
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#D4AF37';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#FFF3A8';
        ctx.stroke();
      }

      drawBaseEmblem(null);
      const texture = new THREE.CanvasTexture(canvas);

      // Asynchronously load real photo
      if (dest.image) {
        const imageObj = new Image();
        imageObj.crossOrigin = 'anonymous';
        imageObj.onload = () => {
          drawBaseEmblem(imageObj);
          texture.needsUpdate = true;
          onReady?.();
        };
        imageObj.src = dest.image;
      }

      return texture;
    }

    const markerSprites: THREE.Sprite[] = [];
    const hitMeshes: THREE.Mesh[] = [];
    const markerPositions: THREE.Vector3[] = [];
    const hitGeo = new THREE.SphereGeometry(0.065, 8, 8);
    const hitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    destinations.forEach((d, idx) => {
      const p = latLngToVec3(d.latitude, d.longitude, R * 1.025);
      markerPositions.push(p.clone());

      const texture = createMarkerTexture(d, () => {
        renderer.render(scene, camera);
      });

      const spriteMat = new THREE.SpriteMaterial({
        map: texture,
        depthTest: true,
        depthWrite: false,
        transparent: true,
      });

      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.copy(p);
      const initialScale = isPreview ? 0.085 : 0.072;
      sprite.scale.set(initialScale, initialScale, 1.0);
      sprite.userData = { id: d.id, dest: d, index: idx, tier: d.tier || 1 };
      globeGroup.add(sprite);
      markerSprites.push(sprite);

      if (!isPreview) {
        const hit = new THREE.Mesh(hitGeo, hitMat);
        hit.position.copy(p);
        hit.userData = { id: d.id, dest: d, index: idx };
        globeGroup.add(hit);
        hitMeshes.push(hit);
      }
    });

    /* Camera & Coordinates State (India overview) */
    const HOME = { theta: 2.949, phi: 1.187, radius: isPreview ? 2.4 : 2.15 };
    let theta = HOME.theta;
    let phi = HOME.phi;
    let radius = HOME.radius;
    const MIN_R = 1.22;
    const MAX_R = 6.5;

    let autoRotate = isPreview;
    let flying = false;
    let tTheta = 0;
    let tPhi = 0;
    let targetRadius = 2.0;
    let selectedIndex = destinations.findIndex((d) => d.id === selectedIdRef.current);

    function updateCamera() {
      camera.position.set(
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.cos(theta)
      );
      camera.lookAt(0, 0, 0);
    }
    updateCamera();

    /* Raycasting & Focal Point */
    const raycaster = new THREE.Raycaster();
    const el = renderer.domElement;

    function getGlobePointAtScreen(cx: number, cy: number): THREE.Vector3 | null {
      const rect = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((cx - rect.left) / rect.width) * 2 - 1,
        -((cy - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObject(globe);
      if (hits.length > 0) {
        return hits[0].point;
      }
      return null;
    }

    /* Imperative API Implementation */
    apiRef.current = {
      zoomIn: () => {
        radius = clamp(radius * 0.8, MIN_R, MAX_R);
      },
      zoomOut: () => {
        radius = clamp(radius * 1.25, MIN_R, MAX_R);
      },
      toggleRotate: () => {
        autoRotate = !autoRotate;
        onRotateChangeRef.current?.(autoRotate);
      },
      resetView: () => {
        tTheta = HOME.theta;
        tPhi = HOME.phi;
        targetRadius = HOME.radius;
        while (tTheta - theta > Math.PI) tTheta -= Math.PI * 2;
        while (theta - tTheta > Math.PI) tTheta += Math.PI * 2;
        flying = true;
        selectedIndex = -1;
        onDeselectRef.current?.();
      },
      flyTo: (lat: number, lng: number, id?: string) => {
        const v = latLngToVec3(lat, lng, 1);
        v.normalize();
        tPhi = Math.acos(clamp(v.y, -1, 1));
        tTheta = Math.atan2(v.x, v.z);
        while (tTheta - theta > Math.PI) tTheta -= Math.PI * 2;
        while (theta - tTheta > Math.PI) tTheta += Math.PI * 2;
        targetRadius = 1.8;
        flying = true;
        if (autoRotate) {
          autoRotate = false;
          onRotateChangeRef.current?.(false);
        }
        if (id) {
          apiRef.current.selectById(id);
        }
      },
      selectById: (id: string) => {
        const idx = destinations.findIndex((d) => d.id === id);
        selectedIndex = idx;
      },
    };

    /* Interaction State */
    let downX = 0;
    let downY = 0;
    let lastX = 0;
    let lastY = 0;
    let isPinching = false;
    let lastPinchDist = 0;
    let lastMidX = 0;
    let lastMidY = 0;
    let moved = false;
    let mDown = false;

    function getPinchDist(touches: TouchList) {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function getMidpoint(touches: TouchList) {
      return {
        x: (touches[0].clientX + touches[1].clientX) * 0.5,
        y: (touches[0].clientY + touches[1].clientY) * 0.5,
      };
    }

    function handleTap(cx: number, cy: number) {
      if (isPreview) {
        onClickPreviewRef.current?.();
        return;
      }

      const rect = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(
        ((cx - rect.left) / rect.width) * 2 - 1,
        -((cy - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);

      const hits = raycaster.intersectObjects(hitMeshes);
      const globeHits = raycaster.intersectObject(globe);

      for (let k = 0; k < hits.length; k++) {
        const ud = hits[k].object.userData;
        const sprite = markerSprites[ud.index];
        if (!sprite || !sprite.visible) continue;

        if (globeHits.length && hits[k].distance > globeHits[0].distance + 0.03)
          continue;

        selectedIndex = ud.index;
        onSelectDestRef.current?.(ud.id);
        apiRef.current.flyTo(ud.dest.latitude, ud.dest.longitude, ud.id);
        return;
      }

      selectedIndex = -1;
      onDeselectRef.current?.();
    }

    /* Touch Event Listeners */
    const onTouchStart = (e: TouchEvent) => {
      flying = false;
      moved = false;

      if (e.touches.length === 1) {
        isPinching = false;
        lastX = downX = e.touches[0].clientX;
        lastY = downY = e.touches[0].clientY;
      } else if (e.touches.length === 2 && !isPreview) {
        isPinching = true;
        lastPinchDist = getPinchDist(e.touches);
        const mid = getMidpoint(e.touches);
        lastMidX = mid.x;
        lastMidY = mid.y;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPreview && e.cancelable) {
        e.preventDefault();
      }

      if (e.touches.length === 1) {
        if (isPinching) {
          isPinching = false;
          lastX = downX = e.touches[0].clientX;
          lastY = downY = e.touches[0].clientY;
          return;
        }

        const x = e.touches[0].clientX;
        const y = e.touches[0].clientY;
        const dx = x - lastX;
        const dy = y - lastY;

        if (Math.abs(x - downX) + Math.abs(y - downY) > 8) moved = true;

        theta -= dx * 0.0055;
        phi = clamp(phi - dy * 0.0055, 0.14, Math.PI - 0.14);

        lastX = x;
        lastY = y;
      } else if (e.touches.length === 2 && !isPreview) {
        isPinching = true;
        moved = true;

        const curDist = getPinchDist(e.touches);
        const curMid = getMidpoint(e.touches);

        // Two-finger pan tracking
        const panDx = curMid.x - lastMidX;
        const panDy = curMid.y - lastMidY;
        if (Math.abs(panDx) > 0 || Math.abs(panDy) > 0) {
          theta -= panDx * 0.004;
          phi = clamp(phi - panDy * 0.004, 0.14, Math.PI - 0.14);
        }

        // Pinch Zoom with focal point stabilization
        if (lastPinchDist > 0 && curDist > 0 && Math.abs(curDist - lastPinchDist) > 0.8) {
          const zoomFactor = lastPinchDist / curDist;
          const oldRadius = radius;
          const newRadius = clamp(radius * zoomFactor, MIN_R, MAX_R);

          if (newRadius !== oldRadius) {
            if (zoomFactor < 1.0) {
              const hitPoint = getGlobePointAtScreen(curMid.x, curMid.y);
              if (hitPoint) {
                const hitNorm = hitPoint.clone().normalize();
                const targetPhi = Math.acos(clamp(hitNorm.y, -1, 1));
                let targetTheta = Math.atan2(hitNorm.x, hitNorm.z);

                while (targetTheta - theta > Math.PI) targetTheta -= Math.PI * 2;
                while (theta - targetTheta > Math.PI) targetTheta += Math.PI * 2;

                const zoomWeight = Math.min(0.55, (1.0 - zoomFactor) * 0.7);
                theta += (targetTheta - theta) * zoomWeight;
                phi = clamp(phi + (targetPhi - phi) * zoomWeight, 0.14, Math.PI - 0.14);
              }
            }
            radius = newRadius;
          }
          lastPinchDist = curDist;
        }

        lastMidX = curMid.x;
        lastMidY = curMid.y;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isPinching = false;
        lastX = downX = e.touches[0].clientX;
        lastY = downY = e.touches[0].clientY;
        moved = true;
      } else if (e.touches.length === 0) {
        isPinching = false;
        if (!moved && e.changedTouches.length === 1) {
          handleTap(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        }
      }
    };

    /* Mouse Event Listeners */
    const onMouseDown = (e: MouseEvent) => {
      mDown = true;
      moved = false;
      flying = false;
      lastX = downX = e.clientX;
      lastY = downY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!mDown) return;
      if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 6) moved = true;
      theta -= (e.clientX - lastX) * 0.0055;
      phi = clamp(phi - (e.clientY - lastY) * 0.0055, 0.14, Math.PI - 0.14);
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onMouseUp = (e: MouseEvent) => {
      if (mDown && !moved) {
        handleTap(e.clientX, e.clientY);
      }
      mDown = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (isPreview) return;
      e.preventDefault();
      radius = clamp(radius * (1 + e.deltaY * 0.001), MIN_R, MAX_R);
    };

    const onCanvasClick = (e: MouseEvent) => {
      if (moved) {
        e.stopPropagation();
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('click', onCanvasClick, true);

    /* Responsive Resize */
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || 360;
      containerHeight =
        typeof height === 'number'
          ? height
          : container.clientHeight || 360;
      camera.aspect = width / containerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(width, containerHeight);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    /* Render Loop & Progressive LOD */
    let rafId = 0;
    const camNorm = new THREE.Vector3();
    const worldPos = new THREE.Vector3();
    const lblWorld = new THREE.Vector3();

    const animate = () => {
      rafId = requestAnimationFrame(animate);

      if (flying) {
        theta += (tTheta - theta) * 0.085;
        phi += (tPhi - phi) * 0.085;
        radius += (targetRadius - radius) * 0.085;
        if (
          Math.abs(tTheta - theta) < 0.003 &&
          Math.abs(tPhi - phi) < 0.003 &&
          Math.abs(targetRadius - radius) < 0.01
        ) {
          flying = false;
        }
      } else if (autoRotate) {
        theta += isPreview ? 0.0018 : 0.0012;
      }

      updateCamera();
      camNorm.copy(camera.position).normalize();

      /* Progressive LOD for Boundaries */
      if (stateMesh) {
        if (radius > 3.2) {
          stateMesh.visible = false;
        } else {
          stateMesh.visible = true;
          const stateOpacity = Math.min(0.85, Math.max(0.1, (3.2 - radius) / 0.6));
          (stateMesh.material as THREE.LineBasicMaterial).opacity = stateOpacity;
        }
      }

      if (districtMesh) {
        if (radius > 2.05) {
          districtMesh.visible = false;
        } else {
          districtMesh.visible = true;
          const distOpacity = Math.min(
            0.48,
            Math.max(0.08, ((2.05 - radius) / 0.75) * 0.48)
          );
          (districtMesh.material as THREE.LineBasicMaterial).opacity = distOpacity;
        }
      }

      /* State Labels LOD */
      if (stateLabelSprites.length > 0) {
        const showStateLabels = radius <= 1.95;
        for (let l = 0; l < stateLabelSprites.length; l++) {
          const lbl = stateLabelSprites[l];
          if (!showStateLabels) {
            lbl.visible = false;
          } else {
            lblWorld.copy(lbl.position);
            lbl.visible = lblWorld.dot(camNorm) > 0.35;
          }
        }
      }

      /* Destination Markers LOD & Pulse with Screen-Size Preservation */
      const showDetailedMarkers = radius < 2.3 || isPreview;
      const t = performance.now() * 0.0025;
      const refDist = HOME.radius - 1.025;

      for (let i = 0; i < markerSprites.length; i++) {
        const sprite = markerSprites[i];
        const p = markerPositions[i];
        worldPos.copy(p);

        const facingDot = worldPos.dot(camNorm);
        if (facingDot < 0.18) {
          sprite.visible = false;
          continue;
        }

        const isTier1 = sprite.userData.tier === 1;
        const isSelected = i === selectedIndex;
        const visible = isSelected || isTier1 || showDetailedMarkers;
        sprite.visible = visible;

        if (visible) {
          const dist = camera.position.distanceTo(worldPos);
          const scaleFactor = Math.min(2.0, Math.max(0.12, dist / refDist));

          const baseScale = isPreview
            ? 0.08
            : isTier1
            ? 0.075
            : 0.065;

          if (isSelected) {
            const selScale = (0.105 + 0.008 * Math.sin(t * 3)) * scaleFactor;
            sprite.scale.set(selScale, selScale, 1.0);
          } else {
            const pulse = 1.0 + 0.06 * Math.sin(t + i * 0.6);
            const s = baseScale * scaleFactor * pulse;
            sprite.scale.set(s, s, 1.0);
          }

          if (hitMeshes[i]) {
            hitMeshes[i].scale.set(scaleFactor, scaleFactor, scaleFactor);
          }
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    /* WebGL Cleanup on Unmount */
    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();

      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('click', onCanvasClick, true);

      globeGeo.dispose();
      globeMat.dispose();
      atmoGeo.dispose();
      atmoMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      hitGeo.dispose();
      hitMat.dispose();

      if (stateMesh) {
        stateMesh.geometry.dispose();
        (stateMesh.material as THREE.Material).dispose();
      }
      if (districtMesh) {
        districtMesh.geometry.dispose();
        (districtMesh.material as THREE.Material).dispose();
      }
      stateLabelSprites.forEach((sprite) => {
        sprite.material.map?.dispose();
        sprite.material.dispose();
      });
      markerSprites.forEach((sprite) => {
        sprite.material.map?.dispose();
        sprite.material.dispose();
      });

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [mode, destinations, height, onError, onWarn]);

  // Sync selectedId changes from outside
  useEffect(() => {
    if (selectedId) {
      apiRef.current.selectById(selectedId);
    } else {
      apiRef.current.selectById('');
    }
  }, [selectedId]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden ${
        mode === 'preview' ? 'cursor-pointer' : ''
      } ${className}`}
      style={{
        height: height ?? '100%',
      }}
      role="region"
      aria-label={
        mode === 'preview'
          ? '3D Indian Globe Preview - Click to explore full screen'
          : '3D Interactive Indian Globe'
      }
    />
  );
});

export default GlobeView;
