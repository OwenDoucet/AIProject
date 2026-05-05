import { useEffect, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';

function App() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [aiResponse, setAiResponse] = useState("");
  const [isIndexing, setIsIndexing] = useState(false);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/graph')
      .then(res => res.json())
      .then(data => setGraphData(data));
  }, []);

  const handleIndex = async () => {
    setIsIndexing(true);
    await fetch('http://127.0.0.1:8000/api/index', { method: 'POST' });
    setIsIndexing(false);
    alert("Indexing Complete!");
  };

  const handleNodeClick = async (node) => {
    setAiResponse(`Analyzing ${node.id}...`);
    const res = await fetch('http://127.0.0.1:8000/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `Explain the code logic in ${node.id} and how it fits into the project.` })
    });
    const data = await res.json();
    setAiResponse(data.response);
  };

  return (
    <div style={{ height: '100vh', width: '100vw', background: '#000', display: 'flex', color: 'white', fontFamily: 'sans-serif' }}>
      {/* SIDEBAR */}
      <div style={{ width: '400px', background: '#111', padding: '20px', borderRight: '1px solid #333', zIndex: 10, overflowY: 'auto' }}>
        <h2 style={{ color: '#00D1FF' }}>Code Cartographer</h2>
        <button 
          onClick={handleIndex}
          style={{ width: '100%', padding: '10px', cursor: 'pointer', marginBottom: '20px', background: '#00D1FF', border: 'none', fontWeight: 'bold' }}
        >
          {isIndexing ? "Indexing..." : "Scan & Index Codebase"}
        </button>
        
        <div style={{ background: '#222', padding: '15px', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#aaa' }}>AI INSIGHTS</h4>
          <p style={{ lineHeight: '1.6', fontSize: '14px' }}>
            {aiResponse || "Click a node in the graph to analyze a specific file."}
          </p>
        </div>
      </div>

      {/* GRAPH VIEW */}
      <div style={{ flexGrow: 1 }}>
        <ForceGraph3D
          graphData={graphData}
          nodeAutoColorBy="group"
          nodeLabel="id"
          onNodeClick={handleNodeClick}
          backgroundColor="#000000"
        />
      </div>
    </div>
  );
}

export default App;