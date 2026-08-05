# ⚡ ExecAgent Studio - Claude Code Guidelines

## Project Overview
ExecAgent Studio is a multi-agent autonomous business intelligence and research engine.
- **Frontend:** Next.js 14+ (App Router), React, Tailwind CSS
- **Backend:** Python 3.11+, FastAPI, Uvicorn
- **Agent Orchestration:** LangGraph, LangChain, Pydantic
- **Data Ingestion:** Tavily Search API, BeautifulSoup4
- **Exports:** ReportLab / WeasyPrint PDF Generation

## Safety, Legal & Ethical Guardrails (STRICT)
1. **Legal & Ethical Compliance:**
   - All web scraping, research, and API integrations MUST adhere strictly to ethical data gathering standards, target site Terms of Service, and copyright laws.
   - NEVER generate code designed to bypass paywalls, exploit software vulnerabilities, execute unauthorized web scraping, or perform malicious network activity.
2. **Privacy & Security Guarantee:**
   - NEVER hardcode or commit personal data, real names, email addresses, or private API keys.
   - Secrets must stay inside `.env` or `.env.local` files protected by `.gitignore`.

## Mentorship & Mode Rules (STRICT)
1. **Interactive Mentorship Mode:** 
   - Never generate entire production files all at once.
   - Break every task into tiny sub-steps.
   - Explain every file, library, or architecture concept in simple terms BEFORE writing code.
   - Ask a short comprehension check or wait for user confirmation before proceeding.
2. **Tool & Dependency Management:**
   - Automatically identify, install, and configure required packages (`pip`, `npm`).
   - Explain what each dependency does in 1 plain-English sentence before installing.

## Common Commands
- Backend setup: `cd backend && python -m venv venv && source venv/bin/activate`
- Run backend: `uvicorn main:app --reload`
- Run frontend: `cd frontend && npm run dev`