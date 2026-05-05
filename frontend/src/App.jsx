import { useEffect, useState, useRef } from 'react';
import ForceGraph3D from 'react-force-graph-3d';

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [aiResponse, setAiResponse] = useState("");
  const [isIndexing, setIsIndexing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeNode, setActiveNode] = useState(null);
  const [typedText, setTypedText] = useState("");
  const [particles, setParticles] = useState([]);
  const typeIntervalRef = useRef(null);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/graph')
      .then(res => res.json())
      .then(data => setGraphData(data));

    // Generate floating particles
    const pts = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 8 + 4,
      delay: Math.random() * 5,
    }));
    setParticles(pts);
  }, []);

  // Typewriter effect
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
    }, 12);
  };

  const handleIndex = async () => {
    setIsIndexing(true);
    typeText("Scanning codebase... vectorizing files... building neural index...");
    await fetch('http://127.0.0.1:8000/api/index', { method: 'POST' });
    setIsIndexing(false);
    typeText("Neural index complete. All nodes are now queryable.");
  };

  const handleNodeClick = async (node) => {
    setActiveNode(node.id);
    setIsAnalyzing(true);
    typeText(`Activating node: ${node.id}...`);

    const res = await fetch('http://127.0.0.1:8000/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `Explain the code logic in ${node.id} and how it fits into the project.` })
    });
    const data = await res.json();
    setIsAnalyzing(false);
    typeText(data.response);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@300;400;500;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #020408;
          --panel: #050d14;
          --border: rgba(0, 200, 255, 0.15);
          --glow: #00c8ff;
          --glow2: #7b2fff;
          --glow3: #00ff9d;
          --text: #8ab4c8;
          --text-bright: #d4f0ff;
          --danger: #ff4d6d;
          --mono: 'Share Tech Mono', monospace;
          --head: 'Rajdhani', sans-serif;
        }

        body { background: var(--bg); overflow: hidden; }

        .app-shell {
          height: 100vh;
          width: 100vw;
          display: flex;
          font-family: var(--head);
          color: var(--text);
          position: relative;
          overflow: hidden;
        }

        /* Animated grid background */
        .grid-bg {
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(0,200,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,200,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
          z-index: 0;
        }

        .scanline {
          position: fixed;
          inset: 0;
          background: linear-gradient(transparent 50%, rgba(0,0,0,0.03) 50%);
          background-size: 100% 4px;
          pointer-events: none;
          z-index: 1;
          opacity: 0.4;
        }

        /* Floating particles */
        .particle {
          position: fixed;
          border-radius: 50%;
          background: var(--glow);
          opacity: 0.4;
          pointer-events: none;
          z-index: 0;
          animation: floatUp linear infinite;
        }

        @keyframes floatUp {
          0% { transform: translateY(100vh) scale(0); opacity: 0; }
          10% { opacity: 0.4; }
          90% { opacity: 0.2; }
          100% { transform: translateY(-20vh) scale(1); opacity: 0; }
        }

        /* SIDEBAR */
        .sidebar {
          width: 380px;
          min-width: 380px;
          background: var(--panel);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          z-index: 10;
          position: relative;
          overflow: hidden;
        }

        .sidebar::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--glow), transparent);
          animation: scanH 3s linear infinite;
        }

        @keyframes scanH {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .sidebar-header {
          padding: 28px 24px 20px;
          border-bottom: 1px solid var(--border);
          position: relative;
        }

        .logo-line {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 4px;
        }

        .logo-icon {
          width: 28px;
          height: 28px;
          position: relative;
        }

        .logo-icon svg {
          width: 100%;
          height: 100%;
        }

        .app-title {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: var(--glow);
          text-shadow: 0 0 20px rgba(0,200,255,0.6);
        }

        .app-subtitle {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 2px;
          color: rgba(0,200,255,0.4);
          text-transform: uppercase;
          margin-left: 38px;
        }

        .status-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 12px;
          font-family: var(--mono);
          font-size: 10px;
          color: var(--glow3);
          letter-spacing: 1px;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--glow3);
          box-shadow: 0 0 8px var(--glow3);
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }

        /* Stats row */
        .stats-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1px;
          background: var(--border);
          border-bottom: 1px solid var(--border);
        }

        .stat-cell {
          background: var(--panel);
          padding: 12px 16px;
          text-align: center;
        }

        .stat-value {
          font-family: var(--mono);
          font-size: 18px;
          color: var(--glow);
          text-shadow: 0 0 10px rgba(0,200,255,0.5);
          display: block;
        }

        .stat-label {
          font-size: 9px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(138,180,200,0.5);
          display: block;
          margin-top: 2px;
        }

        /* Index button */
        .index-btn {
          margin: 20px 24px 0;
          padding: 14px;
          background: transparent;
          border: 1px solid var(--glow);
          color: var(--glow);
          font-family: var(--head);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 3px;
          text-transform: uppercase;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all 0.3s;
          clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
        }

        .index-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(0,200,255,0.1), transparent);
          opacity: 0;
          transition: opacity 0.3s;
        }

        .index-btn:hover::before { opacity: 1; }
        .index-btn:hover {
          box-shadow: 0 0 20px rgba(0,200,255,0.3), inset 0 0 20px rgba(0,200,255,0.05);
          text-shadow: 0 0 10px rgba(0,200,255,0.8);
        }

        .index-btn.loading {
          border-color: var(--glow2);
          color: var(--glow2);
          animation: borderPulse 1s ease-in-out infinite;
        }

        @keyframes borderPulse {
          0%, 100% { box-shadow: 0 0 5px rgba(123,47,255,0.3); }
          50% { box-shadow: 0 0 20px rgba(123,47,255,0.6); }
        }

        .btn-progress {
          position: absolute;
          bottom: 0; left: 0;
          height: 2px;
          background: var(--glow2);
          animation: progress 2s ease-in-out infinite;
        }

        @keyframes progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }

        /* Active node indicator */
        .active-node {
          margin: 16px 24px 0;
          padding: 10px 14px;
          background: rgba(0,200,255,0.05);
          border: 1px solid rgba(0,200,255,0.2);
          border-left: 3px solid var(--glow);
          font-family: var(--mono);
          font-size: 11px;
          color: var(--glow);
          display: flex;
          align-items: center;
          gap: 8px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .node-arrow {
          color: rgba(0,200,255,0.4);
          flex-shrink: 0;
        }

        /* AI Output panel */
        .ai-panel {
          flex: 1;
          margin: 16px 24px 24px;
          border: 1px solid var(--border);
          background: rgba(0,0,0,0.3);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }

        .ai-panel-header {
          padding: 10px 14px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(0,200,255,0.03);
        }

        .ai-panel-title {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(0,200,255,0.6);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .analyzing-badge {
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: 1px;
          padding: 2px 8px;
          background: rgba(123,47,255,0.2);
          border: 1px solid rgba(123,47,255,0.4);
          color: var(--glow2);
          animation: badgePulse 1s ease-in-out infinite;
        }

        @keyframes badgePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .ai-output {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          font-family: var(--mono);
          font-size: 12px;
          line-height: 1.8;
          color: var(--text-bright);
          scrollbar-width: thin;
          scrollbar-color: rgba(0,200,255,0.2) transparent;
        }

        .ai-output::-webkit-scrollbar { width: 4px; }
        .ai-output::-webkit-scrollbar-track { background: transparent; }
        .ai-output::-webkit-scrollbar-thumb { background: rgba(0,200,255,0.2); border-radius: 2px; }

        .cursor {
          display: inline-block;
          width: 8px;
          height: 14px;
          background: var(--glow);
          margin-left: 2px;
          vertical-align: middle;
          animation: blink 0.8s step-end infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        .placeholder-text {
          color: rgba(138,180,200,0.3);
          font-style: italic;
        }

        /* Corner decorations */
        .corner-tl, .corner-br {
          position: absolute;
          width: 12px;
          height: 12px;
          pointer-events: none;
        }

        .corner-tl {
          top: -1px; left: -1px;
          border-top: 2px solid var(--glow);
          border-left: 2px solid var(--glow);
        }

        .corner-br {
          bottom: -1px; right: -1px;
          border-bottom: 2px solid var(--glow);
          border-right: 2px solid var(--glow);
        }

        /* Graph area */
        .graph-area {
          flex: 1;
          position: relative;
          overflow: hidden;
        }

        /* HUD overlays */
        .hud-top-right {
          position: absolute;
          top: 20px;
          right: 20px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }

        .hud-label {
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: 2px;
          color: rgba(0,200,255,0.3);
          text-transform: uppercase;
        }

        .hud-value {
          font-family: var(--mono);
          font-size: 11px;
          color: rgba(0,200,255,0.6);
        }

        .hud-bottom-left {
          position: absolute;
          bottom: 20px;
          left: 20px;
          z-index: 10;
          font-family: var(--mono);
          font-size: 9px;
          color: rgba(0,200,255,0.2);
          letter-spacing: 1px;
          line-height: 1.8;
        }

        /* Cross-hair center */
        .crosshair {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 20px;
          height: 20px;
          pointer-events: none;
          z-index: 5;
          opacity: 0.15;
        }

        .crosshair::before, .crosshair::after {
          content: '';
          position: absolute;
          background: var(--glow);
        }

        .crosshair::before {
          width: 1px; height: 100%;
          left: 50%; transform: translateX(-50%);
        }

        .crosshair::after {
          height: 1px; width: 100%;
          top: 50%; transform: translateY(-50%);
        }

        /* Node count badge */
        .node-count {
          position: absolute;
          bottom: 20px;
          right: 20px;
          z-index: 10;
          font-family: var(--mono);
          font-size: 10px;
          color: rgba(0,200,255,0.4);
          letter-spacing: 1px;
        }

        /* Instruction hint */
        .hint {
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 2px;
          color: rgba(0,200,255,0.25);
          text-transform: uppercase;
          white-space: nowrap;
        }
      `}</style>

      <div className="app-shell">
        <div className="grid-bg" />
        <div className="scanline" />

        {/* Floating particles */}
        {particles.map(p => (
          <div
            key={p.id}
            className="particle"
            style={{
              left: `${p.x}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}

        {/* SIDEBAR */}
        <div className="sidebar">
          <div className="sidebar-header">
            <div className="logo-line">
              <div className="logo-icon">
                <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="14" cy="14" r="13" stroke="#00c8ff" strokeWidth="1" strokeOpacity="0.4"/>
                  <circle cx="14" cy="14" r="3" fill="#00c8ff" opacity="0.8"/>
                  <line x1="14" y1="1" x2="14" y2="8" stroke="#00c8ff" strokeWidth="1" strokeOpacity="0.6"/>
                  <line x1="14" y1="20" x2="14" y2="27" stroke="#00c8ff" strokeWidth="1" strokeOpacity="0.6"/>
                  <line x1="1" y1="14" x2="8" y2="14" stroke="#00c8ff" strokeWidth="1" strokeOpacity="0.6"/>
                  <line x1="20" y1="14" x2="27" y2="14" stroke="#00c8ff" strokeWidth="1" strokeOpacity="0.6"/>
                  <line x1="4" y1="4" x2="9" y2="9" stroke="#7b2fff" strokeWidth="1" strokeOpacity="0.5"/>
                  <line x1="19" y1="19" x2="24" y2="24" stroke="#7b2fff" strokeWidth="1" strokeOpacity="0.5"/>
                  <line x1="24" y1="4" x2="19" y2="9" stroke="#7b2fff" strokeWidth="1" strokeOpacity="0.5"/>
                  <line x1="9" y1="19" x2="4" y2="24" stroke="#7b2fff" strokeWidth="1" strokeOpacity="0.5"/>
                </svg>
              </div>
              <span className="app-title">CARTOGRAPHER</span>
            </div>
            <div className="app-subtitle">neural code analysis v2.0</div>
            <div className="status-bar">
              <div className="status-dot" />
              SYSTEM ONLINE — BACKEND CONNECTED
            </div>
          </div>

          <div className="stats-row">
            <div className="stat-cell">
              <span className="stat-value">{graphData.nodes.length}</span>
              <span className="stat-label">Nodes</span>
            </div>
            <div className="stat-cell">
              <span className="stat-value">{graphData.nodes.filter(n => n.group === 1).length}</span>
              <span className="stat-label">Python</span>
            </div>
            <div className="stat-cell">
              <span className="stat-value">{graphData.nodes.filter(n => n.group === 2).length}</span>
              <span className="stat-label">Frontend</span>
            </div>
          </div>

          <button
            className={`index-btn ${isIndexing ? 'loading' : ''}`}
            onClick={handleIndex}
            disabled={isIndexing}
          >
            {isIndexing ? '◈ INDEXING...' : '◈ SCAN & INDEX CODEBASE'}
            {isIndexing && <div className="btn-progress" />}
          </button>

          {activeNode && (
            <div className="active-node">
              <span className="node-arrow">▶</span>
              {activeNode}
              {isAnalyzing && <span style={{ marginLeft: 'auto', color: 'rgba(0,200,255,0.4)', animation: 'blink 0.8s step-end infinite' }}>●</span>}
            </div>
          )}

          <div className="ai-panel">
            <div className="corner-tl" />
            <div className="corner-br" />
            <div className="ai-panel-header">
              <div className="ai-panel-title">
                <span>◆</span> AI NEURAL OUTPUT
              </div>
              {isAnalyzing && <div className="analyzing-badge">PROCESSING</div>}
            </div>
            <div className="ai-output">
              {typedText ? (
                <>
                  {typedText}
                  <span className="cursor" />
                </>
              ) : (
                <span className="placeholder-text">
                  &gt; awaiting node selection...<br />
                  &gt; click any node in the graph<br />
                  &gt; to begin neural analysis
                </span>
              )}
            </div>
          </div>
        </div>

        {/* GRAPH */}
        <div className="graph-area">
          <div className="crosshair" />
          <div className="hint">DRAG TO ROTATE · SCROLL TO ZOOM · CLICK NODE TO ANALYZE</div>
          <div className="hud-top-right">
            <div className="hud-label">render mode</div>
            <div className="hud-value">3D FORCE GRAPH</div>
            <div className="hud-label" style={{ marginTop: '8px' }}>engine</div>
            <div className="hud-value">GROQ LLAMA-3.3</div>
          </div>
          <div className="hud-bottom-left">
            SYS://CODE-CARTOGRAPHER/NEURAL-GRAPH<br />
            BUILD: 2025.05 — GROQ + GEMINI EMBEDDINGS
          </div>
          <div className="node-count">
            {graphData.nodes.length} NODES MAPPED
          </div>
          <ForceGraph3D
            graphData={graphData}
            nodeAutoColorBy="group"
            nodeLabel="id"
            onNodeClick={handleNodeClick}
            backgroundColor="#020408"
            nodeColor={node => node.group === 1 ? '#00c8ff' : '#7b2fff'}
            linkColor={() => 'rgba(0,200,255,0.15)'}
            nodeOpacity={0.9}
            linkOpacity={0.3}
            nodeRelSize={5}
          />
        </div>
      </div>
    </>
  );
}

export default App;
