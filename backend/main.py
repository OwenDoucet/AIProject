import os
from dotenv import load_dotenv

# Load env variables FIRST before anything else
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, SecretStr

# LangChain Imports
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_groq import ChatGroq
from langchain_chroma import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_classic.chains.combine_documents import create_stuff_documents_chain
from langchain_classic.chains import create_retrieval_chain
from langchain_core.prompts import ChatPromptTemplate

# Google API Key (for embeddings only)
raw_google_key = os.getenv("GOOGLE_API_KEY")
assert raw_google_key is not None, "GOOGLE_API_KEY not found in environment variables"
google_api_key: SecretStr = SecretStr(raw_google_key)

# Groq API Key (for chat/generation)
raw_groq_key = os.getenv("GROQ_API_KEY")
assert raw_groq_key is not None, "GROQ_API_KEY not found in environment variables"
groq_api_key: SecretStr = SecretStr(raw_groq_key)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CHROMA_PATH = "./chroma_db"

# Gemini Embeddings (free tier for embeddings)
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001",
    api_key=google_api_key
)

class QueryRequest(BaseModel):
    text: str

@app.get("/api/graph")
async def get_graph():
    """Scans local directory for files to display in the 3D graph."""
    nodes = []
    links = []
    ignore = {"node_modules", "venv", "chroma_db", "__pycache__", ".git", "dist"}

    for root, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if d not in ignore]
        for file in files:
            if file.endswith(('.py', '.jsx', '.js', '.css', '.html')):
                nodes.append({
                    "id": file,
                    "group": 1 if file.endswith('.py') else 2
                })
    return {"nodes": nodes, "links": links}

@app.post("/api/index")
async def index_codebase():
    """Converts code into vectors and stores them in ChromaDB using Gemini embeddings."""
    documents = []
    ignore = {"node_modules", "venv", "chroma_db", "__pycache__", ".git", "dist"}

    for root, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if d not in ignore]
        for file in files:
            if file.endswith(('.py', '.jsx')):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        documents.append(f"FILE: {file}\nCONTENT:\n{content}")
                except Exception as e:
                    print(f"Could not read {file}: {e}")

    splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=200)
    texts = splitter.create_documents(documents)

    Chroma.from_documents(
        texts,
        embeddings,
        persist_directory=CHROMA_PATH,
        collection_name="code_index"
    )
    return {"message": "Codebase successfully indexed!"}

@app.post("/api/query")
async def ask_ai(request: QueryRequest):
    """Retrieves code context and runs the AI generation chain using Groq."""
    vectorstore = Chroma(
        persist_directory=CHROMA_PATH,
        embedding_function=embeddings,
        collection_name="code_index"
    )

    # Groq for fast, free chat generation
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0,
        api_key=groq_api_key
    )

    prompt = ChatPromptTemplate.from_template("""
    You are a Senior AI Engineer. Use the provided code context to answer the user's question.
    If the answer isn't in the context, say you don't know based on the current files.

    Context:
    {context}

    Question: {input}

    Answer:""")

    combine_docs_chain = create_stuff_documents_chain(llm, prompt)
    retrieval_chain = create_retrieval_chain(vectorstore.as_retriever(), combine_docs_chain)

    result = retrieval_chain.invoke({"input": request.text})

    return {"response": result["answer"]}