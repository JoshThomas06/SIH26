import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";
import { authRequest, setSession } from "@/lib/auth";

export default function OperatorAccessGate() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let active = true;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const uniforms = {
      u_time: { value: 0 },
      u_resolution: {
        value: new THREE.Vector2(window.innerWidth * 2, window.innerHeight * 2),
      },
    };
    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      transparent: true,
      uniforms,
      vertexShader: `
        precision mediump float;
        uniform vec2 u_resolution;
        out vec2 fragCoord;
        void main() {
          gl_Position = vec4(position, 1.0);
          fragCoord = (position.xy + 1.0) * 0.5 * u_resolution;
          fragCoord.y = u_resolution.y - fragCoord.y;
        }
      `,
      fragmentShader: `
        precision mediump float;
        in vec2 fragCoord;
        uniform float u_time;
        uniform vec2 u_resolution;
        out vec4 fragColor;
        float PHI = 1.61803398874989484820459;
        float random(vec2 xy) {
          return fract(tan(distance(xy * PHI, xy) * 0.5) * xy.x);
        }
        void main() {
          float total = 20.0;
          float dotSize = 6.0;
          vec2 st = fragCoord.xy;
          vec2 st2 = vec2(floor(st.x / total), floor(st.y / total));
          float rand = random(st2 * floor((u_time / 5.0) + random(st2) + 5.0));
          float opacity = 0.25 + rand * 0.75;
          opacity *= 1.0 - step(dotSize / total, fract(st.x / total));
          opacity *= 1.0 - step(dotSize / total, fract(st.y / total));
          vec2 center = u_resolution / 2.0 / total;
          float dist = distance(center, st2);
          opacity *= step(dist * 0.01, u_time * 3.0);
          fragColor = vec4(0.89, 0.89, 0.91, opacity * 0.55);
        }
      `,
    });
    const geometry = new THREE.PlaneGeometry(2, 2);
    scene.add(new THREE.Mesh(geometry, material));
    const start = performance.now();
    let raf = 0;
    const animate = () => {
      if (!active) return;
      uniforms.u_time.value = (performance.now() - start) / 1000;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();
    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      uniforms.u_resolution.value.set(window.innerWidth * 2, window.innerHeight * 2);
    };
    window.addEventListener("resize", onResize);
    return () => {
      active = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const profile = await authRequest(isLogin ? "/api/v1/auth/login" : "/api/v1/auth/register", {
        email,
        password,
        name: isLogin ? undefined : name,
      });
      setSession(profile);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Access denied");
    } finally {
      setBusy(false);
    }
  };

  const demoSso = async () => {
    setBusy(true);
    setError(null);
    try {
      const profile = await authRequest("/api/v1/auth/login", {
        email: "operator@aegis.local",
        password: "aegis",
      });
      setSession(profile);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "SSO unavailable");
    } finally {
      setBusy(false);
    }
  };

  const socialBtn: CSSProperties = {
    width: "100%",
    padding: "0.65rem",
    borderRadius: 2,
    border: "1px solid #333",
    background: "transparent",
    color: "#fff",
    fontWeight: 500,
    fontSize: "0.875rem",
    cursor: "pointer",
    marginBottom: "0.4rem",
  };
  const input: CSSProperties = {
    width: "100%",
    padding: "0.65rem 0.85rem",
    borderRadius: 2,
    border: "1px solid #333",
    background: "#000",
    color: "#fff",
    fontSize: "0.875rem",
    outline: "none",
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "#040404",
        color: "#fff",
        fontFamily: "Inter,-apple-system,sans-serif",
      }}
    >
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, zIndex: 0 }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background:
            "radial-gradient(circle at center,rgba(0,0,0,0.82) 0%,rgba(0,0,0,0.2) 100%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 2,
          background: "#121212",
          borderRadius: 4,
          padding: "2rem",
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 10px 40px rgba(0,0,0,0.8)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          border: "1px solid #262626",
        }}
      >
        <div
          style={{
            background: "#111",
            width: 44,
            height: 44,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "1.05rem",
            marginBottom: "0.75rem",
            border: "1px solid #333",
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          AE
        </div>
        <h1 style={{ fontSize: "1.2rem", fontWeight: 600, margin: "0 0 0.25rem", letterSpacing: "-0.02em" }}>
          {isLogin ? "Operator Access" : "Enrol Operator"}
        </h1>
        <p style={{ fontSize: "0.8rem", color: "#888", marginBottom: "0.85rem", textAlign: "center" }}>
          SMART SCAN EW // DRDO SIH26055 — classified training instance
        </p>
        <form onSubmit={submit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          {!isLogin && (
            <input style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Callsign" required />
          )}
          <input
            style={input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@work-email.mil"
            required
          />
          <input
            style={input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Passphrase"
            required
          />
          {error ? <div style={{ color: "#ff2a6d", fontSize: "0.75rem" }}>{error}</div> : null}
          <button
            type="submit"
            disabled={busy}
            style={{
              width: "100%",
              padding: "0.65rem",
              borderRadius: 2,
              border: "none",
              background: "#ededed",
              color: "#000",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {busy ? "Authorising…" : isLogin ? "Continue with Email" : "Enrol with Email"}
          </button>
        </form>
        <div style={{ height: 1, background: "#222", width: "100%", margin: "0.85rem 0" }} />
        <button type="button" style={{ ...socialBtn, marginBottom: 0 }} onClick={demoSso} disabled={busy}>
          Defence SSO (simulated)
        </button>
        <div style={{ marginTop: "1.25rem", fontSize: "0.875rem", color: "#888" }}>
          {isLogin ? "No billets issued? " : "Already enrolled? "}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            style={{
              color: "#fff",
              fontWeight: 500,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "inherit",
            }}
          >
            {isLogin ? "Sign Up" : "Sign In"}
          </button>
        </div>
        <div style={{ marginTop: "0.85rem", fontSize: "0.72rem", color: "#666", textAlign: "center", lineHeight: 1.5 }}>
          Authorised personnel only. Access is logged. Demo credentials:
          <br />
          operator@aegis.local / aegis
        </div>
      </div>
    </div>
  );
}
