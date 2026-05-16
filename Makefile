.PHONY: help install reset backend frontend smoke

help:
	@echo "Heimdall — common commands"
	@echo "  make install   install backend + frontend deps"
	@echo "  make reset     wipe DB + reseed behavioral baselines"
	@echo "  make backend   run FastAPI on :8000"
	@echo "  make frontend  run Next.js dev server on :3000"
	@echo "  make smoke     curl-driven 6-scene smoke test"

install:
	python -m pip install -r backend/requirements.txt
	cd frontend && npm install

reset:
	python -m scripts.reset_demo

backend:
	python -m uvicorn backend.main:app --port 8000 --reload

frontend:
	cd frontend && npm run dev

smoke:
	python -m scripts.run_attack
