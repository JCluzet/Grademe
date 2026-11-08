NODE_MAJOR := $(shell node -p 'process.versions.node.split(".")[0]' 2>/dev/null)
SOURCES := $(shell find src contracts/src -type f 2>/dev/null)

.PHONY: all run build test clean check-node

all:
	@git pull --ff-only --quiet 2>/dev/null || true
	@$(MAKE) --no-print-directory run

run: dist/cli.js
	@node dist/cli.js $(ARGS)

build: dist/cli.js

test: node_modules
	@npm test --silent

clean:
	@rm -rf dist node_modules

dist/cli.js: node_modules package.json tsup.config.ts $(SOURCES)
	@npm run --silent build > /dev/null

node_modules: package-lock.json | check-node
	@npm ci --silent --no-audit --no-fund
	@touch node_modules

check-node:
	@if [ -z "$(NODE_MAJOR)" ] || [ "$(NODE_MAJOR)" -lt 22 ]; then \
		echo "Building Grademe from source needs Node.js 22 or newer."; \
		echo "Or install the native build: curl -fsSL https://grademe.io/install.sh | bash"; \
		exit 1; \
	fi
