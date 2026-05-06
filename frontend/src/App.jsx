import { useEffect, useState, useRef } from 'react';
import ForceGraph3D from 'react-force-graph-3d';

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [isIndexing, setIsIndexing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeNode, setActiveNode] = useState(null);
  const [typedText, setTypedText] = useState("");
  const [particles, setParticles] = useState([]);
  const [bootLines, setBootLines] = useState([]);
  const [booted, setBooted] = useState(false);
  const [clock, setClock] = useState('');
  const [glitchActive, setGlitchActive] = useState(false);
  const fgRef = useRef();
  const typeIntervalRef = useRef(null);
  const fileInputRef = useRef(null);
  const outputRef = useRef(null);

  // Boot sequence
  const scrollRef = useRef(null); // Add this ref at the top of your component

// Boot sequence
useEffect(() => {
  const lines = [
    '> CARTOGRAPHER OS v1.0 — INITIALIZING...',
    '> LOADING NEURAL ENGINE: GROQ LLAMA-3.3-70B',
    '> EMBEDDING MODULE: GEMINI-001 ONLINE',
    '> CHROMADB VECTOR STORE: READY',
    '> SCANNING FILESYSTEM...',
    '> ALL SYSTEMS NOMINAL. STANDING BY.',
  ];

  let index = 0;
  const interval = setInterval(() => {
    if (index < lines.length) {
      setBootLines(prev => [...prev, lines[index]]);
      index++;
    } else {
      clearInterval(interval);
      // Brief pause at the end for "dramatic effect"
      setTimeout(() => setBooted(true), 800);
    }
  }, 400); // Slightly slower for better readability

  return () => clearInterval(interval);
}, []);

// Auto-scroll logic: Whenever bootLines updates, scroll to bottom
useEffect(() => {
  if (scrollRef.current) {
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }
}, [bootLines]);

  // Clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toISOString().replace('T', ' ').slice(0, 19));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Graph force config
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force('charge')?.strength(-80);
      fgRef.current.d3Force('link')?.distance(25);
    }
  }, [graphData]);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [typedText]);

  const fetchGraph = () => {
    fetch('http://127.0.0.1:8000/api/graph')
      .then(res => res.json())
      .then(data => setGraphData(data));
  };

  useEffect(() => {
    fetchGraph();
    const pts = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 0.5,
      duration: Math.random() * 10 + 6,
      delay: Math.random() * 8,
      color: i % 5 === 0 ? '#7b2fff' : i % 7 === 0 ? '#00ff9d' : '#00c8ff',
    }));
    setParticles(pts);
  }, []);

  const triggerGlitch = () => {
    setGlitchActive(true);
    setTimeout(() => setGlitchActive(false), 400);
  };

  const typeText = (text) => {
    setTypedText("");
    if (typeIntervalRef.current) clearInterval(typeIntervalRef.current);
    let i = 0;
    typeIntervalRef.current = setInterval(() => {
      if (i < text.length) {
        setTypedText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(typeIntervalRef.current);
      }
    }, 10);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setIsUploading(true);
    triggerGlitch();
    typeText(`SYSTEM: Uploading ${file.name}... extracting neural pathways...`);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await fetch('http://127.0.0.1:8000/api/upload', { method: 'POST', body: formData });
      setIsUploading(false);
      typeText('UPLOAD COMPLETE. Codebase ingested. Ready for indexing.');
      fetchGraph();
    } catch {
      setIsUploading(false);
      typeText('ERROR: Upload sequence failed. Check backend connection.');
    }
  };

  const handleIndex = async () => {
    setIsIndexing(true);
    triggerGlitch();
    typeText('Scanning codebase... chunking files... embedding vectors... building neural index...');
    await fetch('http://127.0.0.1:8000/api/index', { method: 'POST' });
    setIsIndexing(false);
    fetchGraph();
    typeText('NEURAL INDEX COMPLETE. All nodes are queryable. Click any node to begin analysis.');
  };

  const handleNodeClick = async (node) => {
    setActiveNode(node.id);
    setIsAnalyzing(true);
    triggerGlitch();
    typeText(`ACTIVATING NODE: ${node.id}...`);

    const distance = 100;
    const distRatio = 1 + distance / Math.hypot(node.x || 1, node.y || 1, node.z || 1);
    fgRef.current?.cameraPosition(
      { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
      node,
      1200
    );

    const res = await fetch('http://127.0.0.1:8000/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `Explain the code logic in ${node.id} and how it fits into the project.` })
    });
    const data = await res.json();
    setIsAnalyzing(false);
    typeText(data.response);
  };

  const pyCount = graphData.nodes.filter(n => n.group === 1).length;
  const jsCount = graphData.nodes.filter(n => n.group === 2).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@400;600;700;900&family=Exo+2:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:       #020609;
          --panel:    #040c12;
          --panel2:   #061018;
          --border:   rgba(0,200,255,0.12);
          --border2:  rgba(0,200,255,0.25);
          --glow:     #00c8ff;
          --glow2:    #7b2fff;
          --glow3:    #00ff9d;
          --warn:     #ffb830;
          --text:     #7aa8be;
          --text2:    #b0d4e8;
          --bright:   #e0f6ff;
          --mono:     'Share Tech Mono', monospace;
          --display:  'Orbitron', sans-serif;
          --body:     'Exo 2', sans-serif;
        }

        html, body { height: 100%; overflow: hidden; background: var(--bg); }

        /* ── BOOT SCREEN ── */
        .boot-screen {
          position: fixed; inset: 0; background: var(--bg);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          z-index: 9999; transition: opacity 0.6s;
          font-family: var(--mono); color: var(--glow3);
          gap: 8px; padding: 40px;
        }
        .boot-screen.hidden { opacity: 0; pointer-events: none; }
        .boot-logo {
          font-family: var(--display); font-size: 32px; font-weight: 900;
          color: var(--glow); letter-spacing: 6px;
          text-shadow: 0 0 30px rgba(0,200,255,0.8), 0 0 60px rgba(0,200,255,0.3);
          margin-bottom: 32px;
        }
        .boot-line { font-size: 11px; letter-spacing: 1px; opacity: 0; animation: fadeIn 0.3s forwards; }
        @keyframes fadeIn { to { opacity: 1; } }
        .boot-bar-wrap { width: 400px; height: 2px; background: rgba(0,200,255,0.1); margin-top: 24px; overflow: hidden; }
        .boot-bar { height: 100%; background: var(--glow); animation: bootFill 2s ease-out forwards; }
        @keyframes bootFill { from { width: 0; } to { width: 100%; } }

        /* ── SHELL ── */
        .app-shell {
          height: 100vh; width: 100vw;
          display: flex; font-family: var(--body);
          color: var(--text); position: relative; overflow: hidden;
          opacity: 0; transition: opacity 0.8s 0.3s;
        }
        .app-shell.visible { opacity: 1; }

        /* ── BACKGROUNDS ── */
        .grid-bg {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background-image:
            linear-gradient(rgba(0,200,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,200,255,0.025) 1px, transparent 1px);
          background-size: 44px 44px;
        }
        .vignette {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%);
        }
        .scanline {
          position: fixed; inset: 0; pointer-events: none; z-index: 1;
          background: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px);
        }
        .particle {
          position: fixed; border-radius: 50%; pointer-events: none; z-index: 0;
          animation: floatUp linear infinite;
        }
        @keyframes floatUp {
          0%   { transform: translateY(105vh) scale(0); opacity: 0; }
          8%   { opacity: 0.5; }
          92%  { opacity: 0.2; }
          100% { transform: translateY(-10vh) scale(1.2); opacity: 0; }
        }

        /* ── GLITCH OVERLAY ── */
        .glitch-overlay {
          position: fixed; inset: 0; pointer-events: none; z-index: 100;
          opacity: 0; transition: opacity 0.05s;
        }
        .glitch-overlay.active {
          opacity: 1;
          background: linear-gradient(
            transparent 30%,
            rgba(0,200,255,0.04) 30%, rgba(0,200,255,0.04) 31%,
            transparent 31%,
            transparent 60%,
            rgba(123,47,255,0.04) 60%, rgba(123,47,255,0.04) 61%,
            transparent 61%
          );
          animation: glitchFlash 0.4s steps(2) forwards;
        }
        @keyframes glitchFlash {
          0%,100% { opacity: 0; }
          20%,60% { opacity: 1; }
        }

        /* ── SIDEBAR ── */
        .sidebar {
          width: 360px; min-width: 360px;
          background: var(--panel);
          border-right: 1px solid var(--border2);
          display: flex; flex-direction: column;
          z-index: 10; position: relative; overflow: hidden;
        }

        /* Top sweep line */
        .sidebar::after {
          content: ''; position: absolute; top: 0; left: -100%; right: 100%; height: 1px;
          background: linear-gradient(90deg, transparent, var(--glow), transparent);
          animation: sweepLine 4s linear infinite;
        }
        @keyframes sweepLine {
          0%   { left: -100%; right: 100%; }
          100% { left: 100%;  right: -100%; }
        }

        /* ── HEADER ── */
        .sidebar-header {
          padding: 22px 20px 18px;
          border-bottom: 1px solid var(--border);
          background: linear-gradient(180deg, rgba(0,200,255,0.04) 0%, transparent 100%);
          position: relative;
        }
        .header-top {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 6px;
        }
        .app-title {
          font-family: var(--display); font-size: 17px; font-weight: 700;
          letter-spacing: 4px; color: var(--glow);
          text-shadow: 0 0 16px rgba(0,200,255,0.7);
        }
        .version-tag {
          font-family: var(--mono); font-size: 9px; padding: 2px 7px;
          border: 1px solid rgba(0,200,255,0.25); color: rgba(0,200,255,0.5);
          letter-spacing: 1px;
        }
        .header-sub {
          font-family: var(--mono); font-size: 9px; letter-spacing: 2px;
          color: rgba(0,200,255,0.35); text-transform: uppercase; margin-bottom: 10px;
        }
        .status-row {
          display: flex; align-items: center; justify-content: space-between;
        }
        .status-online {
          display: flex; align-items: center; gap: 6px;
          font-family: var(--mono); font-size: 9px; color: var(--glow3);
          letter-spacing: 1px;
        }
        .dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--glow3); box-shadow: 0 0 8px var(--glow3);
          animation: dotPulse 2s ease-in-out infinite;
        }
        @keyframes dotPulse { 50% { opacity: 0.3; transform: scale(0.7); } }
        .clock {
          font-family: var(--mono); font-size: 9px;
          color: rgba(0,200,255,0.3); letter-spacing: 1px;
        }

        /* ── STATS ── */
        .stats-row {
          display: grid; grid-template-columns: 1fr 1fr 1fr;
          border-bottom: 1px solid var(--border);
        }
        .stat-cell {
          padding: 14px 10px; text-align: center; position: relative;
          border-right: 1px solid var(--border);
        }
        .stat-cell:last-child { border-right: none; }
        .stat-cell::before {
          content: ''; position: absolute; bottom: 0; left: 20%; right: 20%; height: 1px;
          background: var(--glow); opacity: 0; transform: scaleX(0);
          transition: opacity 0.3s, transform 0.3s;
        }
        .stat-cell:hover::before { opacity: 0.5; transform: scaleX(1); }
        .stat-value {
          font-family: var(--display); font-size: 22px; font-weight: 700;
          color: var(--glow); text-shadow: 0 0 12px rgba(0,200,255,0.5);
          display: block; line-height: 1;
        }
        .stat-label {
          font-family: var(--mono); font-size: 8px; letter-spacing: 2px;
          text-transform: uppercase; color: rgba(138,180,200,0.4);
          display: block; margin-top: 4px;
        }

        /* ── CONTROLS ── */
        .controls { padding: 16px 20px; display: flex; flex-direction: column; gap: 10px; border-bottom: 1px solid var(--border); }

        .upload-zone {
          padding: 11px 14px; cursor: pointer;
          background: rgba(123,47,255,0.05);
          border: 1px dashed rgba(123,47,255,0.35);
          color: rgba(123,47,255,0.8); font-family: var(--mono);
          font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
          text-align: center; transition: all 0.25s; position: relative;
          overflow: hidden;
        }
        .upload-zone::before {
          content: ''; position: absolute; inset: 0;
          background: rgba(123,47,255,0.08); transform: scaleX(0);
          transform-origin: left; transition: transform 0.25s;
        }
        .upload-zone:hover::before { transform: scaleX(1); }
        .upload-zone:hover {
          border-color: rgba(123,47,255,0.7);
          color: #b060ff;
          box-shadow: 0 0 16px rgba(123,47,255,0.2);
        }

        .index-btn {
          padding: 13px; cursor: pointer;
          background: transparent;
          border: 1px solid var(--border2);
          color: var(--glow); font-family: var(--display);
          font-size: 11px; font-weight: 600;
          letter-spacing: 3px; text-transform: uppercase;
          position: relative; overflow: hidden; transition: all 0.25s;
          clip-path: polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%);
        }
        .index-btn::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, rgba(0,200,255,0.08), transparent);
          transform: translateX(-100%); transition: transform 0.4s;
        }
        .index-btn:hover::before { transform: translateX(0); }
        .index-btn:hover {
          border-color: var(--glow);
          box-shadow: 0 0 20px rgba(0,200,255,0.25), inset 0 0 12px rgba(0,200,255,0.05);
          text-shadow: 0 0 10px rgba(0,200,255,0.9);
        }
        .index-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .index-btn.loading {
          border-color: rgba(0,200,255,0.4); color: rgba(0,200,255,0.6);
          animation: loadPulse 1.2s ease-in-out infinite;
        }
        @keyframes loadPulse {
          0%,100% { box-shadow: 0 0 8px rgba(0,200,255,0.1); }
          50%      { box-shadow: 0 0 24px rgba(0,200,255,0.4); }
        }
        .progress-bar {
          position: absolute; bottom: 0; left: 0; height: 2px;
          background: linear-gradient(90deg, var(--glow2), var(--glow));
          animation: progAnim 2s ease-in-out infinite;
        }
        @keyframes progAnim { 0% { width:0; } 60% { width:75%; } 100% { width:100%; } }

        /* ── ACTIVE NODE ── */
        .active-node-bar {
          margin: 0 20px 0;
          padding: 9px 12px;
          background: rgba(0,200,255,0.04);
          border: 1px solid rgba(0,200,255,0.2);
          border-left: 3px solid var(--glow);
          display: flex; align-items: center; gap: 8px;
          font-family: var(--mono); font-size: 11px; color: var(--glow);
          overflow: hidden;
        }
        .active-node-bar .arrow { color: rgba(0,200,255,0.4); flex-shrink: 0; }
        .active-node-name {
          flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .analyzing-pill {
          flex-shrink: 0; font-size: 8px; padding: 2px 7px; letter-spacing: 1.5px;
          background: rgba(0,200,255,0.1); border: 1px solid rgba(0,200,255,0.3);
          animation: dotPulse 1s ease-in-out infinite;
        }

        /* ── AI PANEL ── */
        .ai-panel {
          flex: 1; margin: 12px 20px 20px;
          border: 1px solid var(--border);
          background: rgba(0,0,0,0.35);
          display: flex; flex-direction: column;
          overflow: hidden; position: relative;
        }
        .ai-panel::before, .ai-panel::after {
          content: ''; position: absolute;
          width: 10px; height: 10px; pointer-events: none;
        }
        .ai-panel::before {
          top: -1px; left: -1px;
          border-top: 2px solid var(--glow); border-left: 2px solid var(--glow);
        }
        .ai-panel::after {
          bottom: -1px; right: -1px;
          border-bottom: 2px solid var(--glow); border-right: 2px solid var(--glow);
        }
        .ai-header {
          padding: 9px 14px; border-bottom: 1px solid var(--border);
          background: rgba(0,200,255,0.03);
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0;
        }
        .ai-title {
          font-family: var(--mono); font-size: 9px;
          letter-spacing: 2px; color: rgba(0,200,255,0.55);
          display: flex; align-items: center; gap: 6px;
        }
        .ai-title-dot { color: var(--glow); }
        .model-badge {
          font-family: var(--mono); font-size: 8px; padding: 1px 6px;
          border: 1px solid rgba(123,47,255,0.35); color: rgba(123,47,255,0.65);
          letter-spacing: 1px;
        }
        .ai-output {
          flex: 1; padding: 14px 16px;
          overflow-y: auto;
          font-family: var(--mono); font-size: 11.5px; line-height: 1.9;
          color: var(--text2);
          scrollbar-width: thin; scrollbar-color: rgba(0,200,255,0.15) transparent;
        }
        .ai-output::-webkit-scrollbar { width: 3px; }
        .ai-output::-webkit-scrollbar-thumb { background: rgba(0,200,255,0.2); }
        .placeholder { color: rgba(138,180,200,0.25); line-height: 2.2; }
        .placeholder span { display: block; }
        .cursor {
          display: inline-block; width: 7px; height: 13px;
          background: var(--glow); margin-left: 2px; vertical-align: middle;
          box-shadow: 0 0 6px var(--glow);
          animation: blink 0.75s step-end infinite;
        }
        @keyframes blink { 50% { opacity: 0; } }

        /* ── GRAPH ── */
        .graph-area { flex: 1; position: relative; overflow: hidden; }

        .hud-top {
          position: absolute; top: 18px; left: 50%;
          transform: translateX(-50%);
          z-index: 10; font-family: var(--mono); font-size: 9px;
          color: rgba(0,200,255,0.2); letter-spacing: 2.5px; text-transform: uppercase;
          white-space: nowrap; pointer-events: none;
        }

        .hud-tr {
          position: absolute; top: 18px; right: 18px; z-index: 10;
          font-family: var(--mono); font-size: 9px; line-height: 2;
          color: rgba(0,200,255,0.25); text-align: right; pointer-events: none;
        }
        .hud-tr .hi { color: rgba(0,200,255,0.5); }

        .hud-bl {
          position: absolute; bottom: 18px; left: 18px; z-index: 10;
          font-family: var(--mono); font-size: 8px; line-height: 2;
          color: rgba(0,200,255,0.15); pointer-events: none; letter-spacing: 1px;
        }

        .hud-br {
          position: absolute; bottom: 18px; right: 18px; z-index: 10;
          font-family: var(--mono); font-size: 9px;
          color: rgba(0,200,255,0.2); pointer-events: none; letter-spacing: 1px;
        }

        /* Corner brackets on graph */
        .corner { position: absolute; width: 16px; height: 16px; z-index: 5; pointer-events: none; }
        .corner.tl { top: 14px; left: 14px; border-top: 1px solid rgba(0,200,255,0.2); border-left: 1px solid rgba(0,200,255,0.2); }
        .corner.tr { top: 14px; right: 14px; border-top: 1px solid rgba(0,200,255,0.2); border-right: 1px solid rgba(0,200,255,0.2); }
        .corner.bl { bottom: 14px; left: 14px; border-bottom: 1px solid rgba(0,200,255,0.2); border-left: 1px solid rgba(0,200,255,0.2); }
        .corner.br { bottom: 14px; right: 14px; border-bottom: 1px solid rgba(0,200,255,0.2); border-right: 1px solid rgba(0,200,255,0.2); }

        .boot-lines-container {
  width: 100%;
  max-height: 250px; /* Adjust based on your logo/bar spacing */
  overflow-y: auto;
  margin: 20px 0;
  display: flex;
  flex-direction: column;
  scrollbar-width: none;
}

.boot-lines-inner {
  margin: 0 auto; /* Centers the block itself */
  display: flex;
  flex-direction: column;
  align-items: flex-start; /* Keeps the '>' symbols aligned vertically */
  text-align: left; /* Standard terminal look */
}

.boot-line {
  font-family: 'Courier New', Courier, monospace;
  color: #13b9c5;
  margin-bottom: 8px;
  white-space: nowrap; /* Prevents lines from wrapping and breaking alignment */
  opacity: 0;
  transform: translateY(5px);
  animation: lineIn 0.2s ease-out forwards;
}

@keyframes lineIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
      `}</style>

      {/* Boot screen */}
      <div className={`boot-screen ${booted ? 'hidden' : ''}`}>
  <div className="boot-logo">CODEBASE CARTOGRAPHER</div>
  
  <div className="boot-lines-container" ref={scrollRef}>
    {/* This inner div ensures everything stays centered */}
    <div className="boot-lines-inner">
      {bootLines.map((l, i) => (
        <div key={i} className="boot-line">
          {l}
        </div>
      ))}
    </div>
  </div>

  <div className="boot-bar-wrap">
    <div className="boot-bar" />
  </div>
</div>


      {/* Glitch overlay */}
      <div className={`glitch-overlay ${glitchActive ? 'active' : ''}`} />

      <div className={`app-shell ${booted ? 'visible' : ''}`}>
        <div className="grid-bg" />
        <div className="vignette" />
        <div className="scanline" />

        {particles.map(p => (
          <div key={p.id} className="particle" style={{
            left: `${p.x}%`,
            width: `${p.size}px`, height: `${p.size}px`,
            background: p.color,
            opacity: 0.35,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }} />
        ))}

        {/* ── SIDEBAR ── */}
        <div className="sidebar">

          {/* Header */}
          <div className="sidebar-header">
            <div className="header-top">
              <span className="app-title">CARTOGRAPHER</span>
              <span className="version-tag">1.0</span>
            </div>
            <div className="header-sub">neural code analysis system</div>
            <div className="status-row">
              <div className="status-online">
                <div className="dot" /> SYSTEM ONLINE
              </div>
              <div className="clock">{clock}</div>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-row">
            <div className="stat-cell">
              <span className="stat-value">{graphData.nodes.length}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-cell">
              <span className="stat-value" style={{ color: 'var(--glow)' }}>{pyCount}</span>
              <span className="stat-label">Python</span>
            </div>
            <div className="stat-cell">
              <span className="stat-value" style={{ color: 'var(--glow2)' }}>{jsCount}</span>
              <span className="stat-label">JS/JSX</span>
            </div>
          </div>

          {/* Controls */}
          <div className="controls">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} accept=".zip" />
            <div className="upload-zone" onClick={() => fileInputRef.current.click()}>
              {isUploading ? '⇪  UPLOADING...' : '⇪  UPLOAD CODEBASE  (.ZIP)'}
            </div>
            <button
              className={`index-btn ${isIndexing ? 'loading' : ''}`}
              onClick={handleIndex}
              disabled={isIndexing || isUploading}
            >
              {isIndexing ? '◈  INDEXING CODEBASE...' : '◈  SCAN & INDEX'}
              {isIndexing && <div className="progress-bar" />}
            </button>
          </div>

          {/* Active node */}
          {activeNode && (
            <div className="active-node-bar" style={{ margin: '0 20px 12px' }}>
              <span className="arrow">▶</span>
              <span className="active-node-name">{activeNode}</span>
              {isAnalyzing && <span className="analyzing-pill">ANALYZING</span>}
            </div>
          )}

          {/* AI output */}
          <div className="ai-panel">
            <div className="ai-header">
              <div className="ai-title">
                <span className="ai-title-dot">◆</span> NEURAL OUTPUT
              </div>
              <div className="model-badge">LLAMA-3.3-70B</div>
            </div>
            <div className="ai-output" ref={outputRef}>
              {typedText ? (
                <>{typedText}<span className="cursor" /></>
              ) : (
                <div className="placeholder">
                  <span>&gt; awaiting node selection...</span>
                  <span>&gt; click any node to begin analysis</span>
                  <span style={{ marginTop: '8px', color: 'rgba(0,200,255,0.12)' }}>&gt; use scan &amp; index first</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── GRAPH ── */}
        <div className="graph-area">
          <div className="corner tl" /><div className="corner tr" />
          <div className="corner bl" /><div className="corner br" />

          <div className="hud-top">3D NEURAL MAP — DRAG · SCROLL · CLICK</div>

          <div className="hud-tr">
            <div><span className="hi">ENGINE</span> GROQ / LLAMA-3.3</div>
            <div><span className="hi">EMBED</span> GEMINI-001</div>
            <div><span className="hi">DATABASE</span> CHROMADB</div>
          </div>

          <div className="hud-bl">
            SYS://CARTOGRAPHER/NEURAL-GRAPH<br />
            RENDER: 3D-FORCE-GRAPH — WebGL
          </div>

          <div className="hud-br">
            {graphData.nodes.length} NODES MAPPED
          </div>

          <ForceGraph3D
            ref={fgRef}
            graphData={graphData}
            nodeLabel="id"
            onNodeClick={handleNodeClick}
            backgroundColor="#020609"
            nodeRelSize={7}
            nodeColor={node => node.group === 1 ? '#00c8ff' : '#7b2fff'}
            nodeOpacity={0.92}
            linkColor={() => 'rgba(0,200,255,0.18)'}
            linkWidth={0.8}
            linkDirectionalParticles={3}
            linkDirectionalParticleWidth={1.5}
            linkDirectionalParticleSpeed={0.004}
            linkDirectionalParticleColor={() => '#ffffff'}
          />
        </div>
      </div>
    </>
  );
}

export default App;
