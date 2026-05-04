import { useEffect, useState } from 'react'

function App() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/data')
      .then(res => res.json())
      .then(json => setData(json.items))
      .catch(err => console.error("Error fetching data:", err))
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Full Stack Template</h1>
      <h3>Backend Tech Stack Items:</h3>
      {data ? (
        <ul>
          {data.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      ) : (
        <p>Loading from backend...</p>
      )}
    </div>
  )
}

export default App