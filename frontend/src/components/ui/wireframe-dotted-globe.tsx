import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";

interface RotatingEarthProps {
  width?: number;
  height?: number;
  className?: string;
}

type GeoFeature = {
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
  properties?: { featurecla?: string };
};

export default function RotatingEarth({
  width = 800,
  height = 600,
  className = "",
}: RotatingEarthProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    let cancelled = false;
    const containerWidth = Math.min(width, window.innerWidth - 40);
    const containerHeight = Math.min(height, window.innerHeight - 100);
    const radius = Math.min(containerWidth, containerHeight) / 2.5;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerWidth * dpr;
    canvas.height = containerHeight * dpr;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;
    context.scale(dpr, dpr);

    const projection = d3
      .geoOrthographic()
      .scale(radius)
      .translate([containerWidth / 2, containerHeight / 2])
      .clipAngle(90);

    const path = d3.geoPath().projection(projection).context(context);

    const pointInPolygon = (point: [number, number], polygon: number[][]): boolean => {
      const [x, y] = point;
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
          inside = !inside;
        }
      }
      return inside;
    };

    const pointInFeature = (point: [number, number], feature: GeoFeature): boolean => {
      const geometry = feature.geometry;
      if (geometry.type === "Polygon") {
        const coordinates = geometry.coordinates as number[][][];
        if (!pointInPolygon(point, coordinates[0])) return false;
        for (let i = 1; i < coordinates.length; i++) {
          if (pointInPolygon(point, coordinates[i])) return false;
        }
        return true;
      }
      if (geometry.type === "MultiPolygon") {
        for (const polygon of geometry.coordinates as number[][][][]) {
          if (pointInPolygon(point, polygon[0])) {
            let inHole = false;
            for (let i = 1; i < polygon.length; i++) {
              if (pointInPolygon(point, polygon[i])) {
                inHole = true;
                break;
              }
            }
            if (!inHole) return true;
          }
        }
        return false;
      }
      return false;
    };

    const generateDotsInPolygon = (feature: GeoFeature, dotSpacing = 16) => {
      const dots: [number, number][] = [];
      const bounds = d3.geoBounds(feature as d3.GeoPermissibleObjects);
      const [[minLng, minLat], [maxLng, maxLat]] = bounds;
      const stepSize = dotSpacing * 0.08;
      for (let lng = minLng; lng <= maxLng; lng += stepSize) {
        for (let lat = minLat; lat <= maxLat; lat += stepSize) {
          const point: [number, number] = [lng, lat];
          if (pointInFeature(point, feature)) dots.push(point);
        }
      }
      return dots;
    };

    const allDots: { lng: number; lat: number; india: boolean }[] = [];
    let landFeatures: { features: GeoFeature[] } | null = null;

    const inIndia = (lng: number, lat: number) => lat >= 8 && lat <= 37.5 && lng >= 68 && lng <= 97.5;

    const THREAT_CORRIDORS: { lng: number; lat: number }[] = [
      { lng: 66.8, lat: 24.6 },
      { lng: 67.9, lat: 18.2 },
      { lng: 70.2, lat: 12.6 },
      { lng: 88.5, lat: 16.1 },
      { lng: 91.7, lat: 22.3 },
      { lng: 77.1, lat: 34.2 },
    ];
    const INDIA_ORIGIN: [number, number] = [78.96, 20.59];

    const render = () => {
      context.clearRect(0, 0, containerWidth, containerHeight);
      const currentScale = projection.scale();
      const scaleFactor = currentScale / radius;
      const light = document.documentElement.classList.contains("theme-light");

      context.beginPath();
      context.arc(containerWidth / 2, containerHeight / 2, currentScale, 0, 2 * Math.PI);
      context.fillStyle = light ? "#b8b8c0" : "#040404";
      context.fill();
      context.strokeStyle = light ? "#18181b" : "#ffffff";
      context.lineWidth = 1.4 * scaleFactor;
      context.stroke();

      if (!landFeatures) return;

      const graticule = d3.geoGraticule();
      context.beginPath();
      path(graticule());
      context.strokeStyle = light ? "#3f3f46" : "#ffffff";
      context.lineWidth = 1 * scaleFactor;
      context.globalAlpha = 0.22;
      context.stroke();
      context.globalAlpha = 1;

      context.beginPath();
      landFeatures.features.forEach((feature) => {
        path(feature as d3.GeoPermissibleObjects);
      });
      context.strokeStyle = light ? "#18181b" : "#ffffff";
      context.lineWidth = 1 * scaleFactor;
      context.stroke();

      allDots.forEach((dot) => {
        const projected = projection([dot.lng, dot.lat]);
        if (
          projected &&
          projected[0] >= 0 &&
          projected[0] <= containerWidth &&
          projected[1] >= 0 &&
          projected[1] <= containerHeight
        ) {
          context.beginPath();
          context.arc(projected[0], projected[1], (dot.india ? 1.7 : 1.2) * scaleFactor, 0, 2 * Math.PI);
          context.fillStyle = dot.india ? (light ? "#111827" : "#f4f4f5") : light ? "#71717a" : "#999999";
          context.fill();
        }
      });

      const origin = projection(INDIA_ORIGIN);
      if (origin) {
        context.beginPath();
        context.arc(origin[0], origin[1], 4.2 * scaleFactor, 0, 2 * Math.PI);
        context.fillStyle = "#00ff66";
        context.shadowColor = "#00ff66";
        context.shadowBlur = 10;
        context.fill();
        context.shadowBlur = 0;
        context.font = `${10 * scaleFactor}px JetBrains Mono, monospace`;
        context.fillStyle = light ? "#14532d" : "#00ff66";
        context.fillText("INDIA · ES origin", origin[0] + 8, origin[1] - 6);
      }

      const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 420);
      THREAT_CORRIDORS.forEach((pt) => {
        const projected = projection([pt.lng, pt.lat]);
        if (!projected) return;
        context.beginPath();
        context.arc(projected[0], projected[1], (2.4 + pulse) * scaleFactor, 0, 2 * Math.PI);
        context.fillStyle = `rgba(255, 42, 109, ${0.35 + pulse * 0.35})`;
        context.fill();
        context.beginPath();
        context.arc(projected[0], projected[1], 1.6 * scaleFactor, 0, 2 * Math.PI);
        context.fillStyle = "#ff2a6d";
        context.fill();
      });
    };

    const loadWorldData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/ne_110m_land.json");
        if (!response.ok) throw new Error("Failed to load land data");
        landFeatures = (await response.json()) as { features: GeoFeature[] };
        landFeatures.features.forEach((feature) => {
          generateDotsInPolygon(feature, 16).forEach(([lng, lat]) => {
            allDots.push({ lng, lat, india: inIndia(lng, lat) });
          });
        });
        if (!cancelled) {
          render();
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load land map data");
          setIsLoading(false);
        }
      }
    };

    const rotation: [number, number] = [0, -12];
    let autoRotate = true;
    const rotationSpeed = 0.35;

    const rotate = () => {
      if (!autoRotate) return;
      if (document.documentElement.dataset.reduceMotion === "true") {
        render();
        return;
      }
      rotation[0] += rotationSpeed;
      projection.rotate(rotation);
      render();
    };

    const rotationTimer = d3.timer(rotate);

    const handleMouseDown = (event: MouseEvent) => {
      autoRotate = false;
      const startX = event.clientX;
      const startY = event.clientY;
      const startRotation: [number, number] = [...rotation];

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const sensitivity = 0.5;
        rotation[0] = startRotation[0] + (moveEvent.clientX - startX) * sensitivity;
        rotation[1] = Math.max(-90, Math.min(90, startRotation[1] - (moveEvent.clientY - startY) * sensitivity));
        projection.rotate(rotation);
        render();
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        window.setTimeout(() => {
          autoRotate = true;
        }, 900);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;
      const newRadius = Math.max(radius * 0.5, Math.min(radius * 3, projection.scale() * scaleFactor));
      projection.scale(newRadius);
      render();
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    void loadWorldData();

    return () => {
      cancelled = true;
      rotationTimer.stop();
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [width, height]);

  if (error) {
    return (
      <div className={`flex items-center justify-center rounded-2xl bg-card p-8 ${className}`}>
        <div className="text-center">
          <p className="mb-2 font-semibold text-destructive">Globe feed unavailable</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="h-auto w-full cursor-grab rounded-2xl bg-background active:cursor-grabbing"
        style={{ maxWidth: "100%", height: "auto" }}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[#040404]/70 font-mono text-[10px] uppercase tracking-[0.3em] text-[#a1a1aa]">
          Acquiring world coastline mesh…
        </div>
      )}
      <div className="absolute bottom-4 left-4 rounded-md bg-neutral-900 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Global surveillance — India = ES origin (demo) · red = illustrative threat corridors
      </div>
    </div>
  );
}
