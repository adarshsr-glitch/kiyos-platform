.PHONY: help install dev dev-web dev-api test test-engine test-knowledge test-api lint seed reset-db clean

help:
	@echo "Kiyos platform — localhost dev"
	@echo ""
	@echo "  make install        install web + api dependencies"
	@echo "  make seed           create ./data/kiyos.db with a demo case"
	@echo "  make dev            run web (:3000) and api (:8000) together"
	@echo "  make dev-web        run only Next.js"
	@echo "  make dev-api        run only FastAPI"
	@echo "  make test           run all tests"
	@echo "  make test-engine    run engine unit tests"
	@echo "  make test-knowledge validate every YAML rule's test_cases"
	@echo "  make test-api       run api contract tests"
	@echo "  make lint           ruff + eslint"
	@echo "  make reset-db       delete ./data/kiyos.db (will be recreated on next start/seed)"
	@echo "  make clean          remove build artifacts"

install:
	cd web && pnpm install
	cd api && poetry install

dev:
	@(cd api && poetry run uvicorn main:app --reload --port 8000) & \
	 (cd web && pnpm dev) ; \
	 wait

dev-web:
	cd web && pnpm dev

dev-api:
	cd api && poetry run uvicorn main:app --reload --port 8000

test: test-engine test-knowledge test-api

test-engine:
	cd api && poetry run pytest ../engine/tests -v

test-knowledge:
	cd api && poetry run pytest ../engine/tests/test_knowledge_rules.py -v

test-api:
	cd api && poetry run pytest tests -v

lint:
	cd api && poetry run ruff check .
	cd web && pnpm lint

seed:
	mkdir -p data/documents
	cd api && poetry run python -m infra.seed

reset-db:
	rm -f data/kiyos.db

clean:
	rm -rf web/.next web/node_modules api/.pytest_cache api/__pycache__
	find . -name "*.pyc" -delete
	find . -name "__pycache__" -type d -exec rm -rf {} +
