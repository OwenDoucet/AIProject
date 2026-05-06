import os
import shutil
import zipfile
import time
import re
import gc
import uuid
import chromadb
import traceback
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, SecretStr

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_groq import ChatGroq
from langchain_chroma import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

# API Keys
raw_google_key = os.getenv("GOOGLE_API_KEY", "")
google_api_key: SecretStr = SecretStr(raw_google_key)

raw_groq_key = os.getenv("GROQ_API_KEY", "")
groq_api_key: SecretStr = SecretStr(raw_groq_key)

app = FastAPI()

# Cloud CORS: Allows your frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# RENDER FREE STORAGE: Writes to the local 'backend' folder on the server
# Note: Data resets when the server sleeps or redeploys
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploaded_projects"
UPLOAD_DIR.mkdir(exist_ok=True)

# Initialize Gemini Embeddings
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-2",
    api_key=google_api_key,
    task_type="retrieval_document" 
)

class QueryRequest(BaseModel):
    text: str

@app.get("/")
async def health():
    return {"status": "Backend is online", "mode": "Render Free"}

@app.post("/api/upload")
async def upload_codebase(file: UploadFile = File(...)):
    try:
        gc.collect()
        # Clean up existing uploads to save space
        if UPLOAD_DIR.exists():
            shutil.rmtree(UPLOAD_DIR)
        UPLOAD_DIR.mkdir()

        # Clean up old DB folders
        for old_folder in BASE_DIR.glob("chroma_db_*"):
            shutil.rmtree(old_folder, ignore_errors=True)
        
        zip_path = UPLOAD_DIR / "project.zip"
        with open(zip_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(UPLOAD_DIR)
            
        return {"message": "Upload successful!"}
    except Exception as e:
        return {"message": f"Upload error: {str(e)}"}

@app.get("/api/graph")
async def get_graph():
    nodes, links, file_map = [], [], {}
    ignore = {"node_modules", "venv", "__pycache__", ".git", "dist", "project.zip"}
    if not UPLOAD_DIR.exists(): return {"nodes": [], "links": []}

    try:
        for root, dirs, files in os.walk(UPLOAD_DIR):
            dirs[:] = [d for d in dirs if d not in ignore]
            for file in files:
                if file.endswith(('.py', '.jsx', '.js', '.tsx')):
                    file_id = file
                    file_map[file_id] = os.path.join(root, file)
                    nodes.append({"id": file_id, "group": 1 if file.endswith('.py') else 2})

        for file_id, full_path in file_map.items():
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
                for other_file in file_map.keys():
                    if file_id == other_file: continue
                    base_name = os.path.splitext(other_file)[0]
                    if re.search(f"['\"/]{base_name}['\"]", content) or f"import {base_name}" in content:
                        links.append({"source": file_id, "target": other_file, "value": 1})
        return {"nodes": nodes, "links": links}
    except Exception:
        return {"nodes": [], "links": []}

@app.post("/api/index")
async def index_codebase():
    try:
        gc.collect()
        for folder in BASE_DIR.glob("chroma_db_*"):
            shutil.rmtree(folder, ignore_errors=True)
        
        time.sleep(0.5)
        unique_id = uuid.uuid4().hex[:8]
        new_path = BASE_DIR / f"chroma_db_{unique_id}"
        new_path.mkdir(exist_ok=True)

        documents = []
        ignore = {"node_modules", "venv", "__pycache__", ".git", "dist", "project.zip"}

        for root, dirs, files in os.walk(UPLOAD_DIR):
            dirs[:] = [d for d in dirs if d not in ignore]
            for file in files:
                if file.endswith(('.py', '.jsx', '.js', '.tsx')):
                    try:
                        with open(os.path.join(root, file), 'r', encoding='utf-8') as f:
                            text_content = f.read().strip()
                            if text_content:
                                documents.append(Document(page_content=text_content, metadata={"source": file}))
                    except: continue

        if not documents: return {"message": "No files to index."}

        # Optimized chunking for speed
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=6000, chunk_overlap=200)
        split_docs = text_splitter.split_documents(documents)
        safe_docs = [d for d in split_docs if d.page_content.strip()]

        client = chromadb.PersistentClient(path=str(new_path))
        collection = client.get_or_create_collection(name="code_index")
        
        chunks_indexed = 0
        LIMIT_CHUNKS = 10 # Lightning fast scan

        for doc in safe_docs:
            if chunks_indexed >= LIMIT_CHUNKS:
                break

            # Bypasses the IndexError bug in LangChain-Chroma
            vector = embeddings.embed_query(doc.page_content)
            
            collection.add(
                ids=[str(uuid.uuid4())],
                embeddings=[vector],
                metadatas=[doc.metadata],
                documents=[doc.page_content]
            )
            
            chunks_indexed += 1
            print(f"Indexed {chunks_indexed}: {doc.metadata['source']}")
            time.sleep(0.2) 

        gc.collect()
        return {"message": f"Scan complete. Indexed {chunks_indexed} chunks."}
    except Exception as e:
        print(traceback.format_exc())
        return {"message": f"Index failed: {str(e)}"}

@app.post("/api/query")
async def ask_ai(request: QueryRequest):
    chroma_folders = sorted(list(BASE_DIR.glob("chroma_db_*")), key=os.path.getmtime, reverse=True)
    if not chroma_folders:
        return {"response": "⚠️ Please upload and index a project first."}

    active_path = chroma_folders[0]
    
    try:
        client = chromadb.PersistentClient(path=str(active_path))
        vectorstore = Chroma(client=client, embedding_function=embeddings, collection_name="code_index")

        relevant_docs = vectorstore.similarity_search(request.text, k=1)
        context_text = relevant_docs[0].page_content if relevant_docs else "No context found."

        llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0, api_key=groq_api_key)

        prompt = f"""
        Role: Friendly Guide. 
        Context: {context_text}
        Question: {request.text}

        Task:
        1. Write one sentence explaining what this file does (analogy).
        2. Write one sentence starting exactly with "Connected to [names of other files] for [simple explanation of why]."
        """

        response = llm.invoke(prompt)
        return {"response": str(response.content).strip()}
        
    except Exception as e:
        return {"response": f"Error: {str(e)}"}
    finally:
        gc.collect()