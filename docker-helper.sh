#!/bin/bash

# Starknet Privacy Toolkit - Docker Helper Script
# This script helps manage the Docker environment for the project

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if .env exists
check_env() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from .env.example..."
        cp .env.example .env
        print_info "Please edit .env file with your configuration before running the app"
        exit 1
    fi
    print_success ".env file found"
}

# Build Docker image
build() {
    print_info "Building Docker image..."
    docker-compose build --no-cache
    print_success "Docker image built successfully"
}

# Start services
start() {
    check_env
    print_info "Starting services..."
    docker-compose up -d
    print_success "Services started successfully"
    print_info "Web UI: http://localhost:8080"
    print_info "API: http://localhost:3001"
}

# Stop services
stop() {
    print_info "Stopping services..."
    docker-compose down
    print_success "Services stopped"
}

# Restart services
restart() {
    stop
    start
}

# View logs
logs() {
    docker-compose logs -f
}

# Execute command in container
exec_cmd() {
    docker-compose exec app "$@"
}

# Generate ZK proof
generate_proof() {
    print_info "Generating ZK proof..."
    docker-compose exec app bash -c "cd /app/zk-badges && ./generate-proof.sh $@"
}

# Compile Noir circuit
compile_circuit() {
    print_info "Compiling Noir circuit..."
    docker-compose exec app bash -c "cd /app/zk-badges/donation_badge && nargo compile"
    print_success "Circuit compiled"
}

# Build Cairo verifier
build_verifier() {
    print_info "Building Cairo verifier..."
    docker-compose exec app bash -c "cd /app/donation_badge_verifier && scarb build"
    print_success "Verifier built"
}

# Run tests
test() {
    print_info "Running tests..."
    docker-compose exec app bash -c "cd /app/zk-badges/donation_badge && nargo test"
    print_success "Tests completed"
}

# Clean up
clean() {
    print_warning "This will remove all containers, volumes, and images. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_info "Cleaning up..."
        docker-compose down -v --rmi all
        print_success "Cleanup completed"
    else
        print_info "Cleanup cancelled"
    fi
}

# Shell access
shell() {
    print_info "Opening shell in container..."
    docker-compose exec app bash
}

# Show status
status() {
    docker-compose ps
}

# Help
show_help() {
    cat << EOF
Starknet Privacy Toolkit - Docker Helper

Usage: ./docker-helper.sh [command]

Commands:
    build           Build Docker image
    start           Start all services
    stop            Stop all services
    restart         Restart all services
    logs            View logs (follow mode)
    status          Show container status
    
    shell           Open bash shell in container
    exec [cmd]      Execute command in container
    
    compile         Compile Noir circuit
    build-verifier  Build Cairo verifier contract
    test            Run Noir circuit tests
    proof [args]    Generate ZK proof (pass args to generate-proof.sh)
    
    clean           Remove all containers, volumes, and images
    help            Show this help message

Examples:
    ./docker-helper.sh start
    ./docker-helper.sh logs
    ./docker-helper.sh proof --amount 1000 --threshold 1000 --donor-secret hunter2 --tier 1
    ./docker-helper.sh exec bun run build

EOF
}

# Main script
case "$1" in
    build)
        build
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        logs
        ;;
    status)
        status
        ;;
    shell)
        shell
        ;;
    exec)
        shift
        exec_cmd "$@"
        ;;
    compile)
        compile_circuit
        ;;
    build-verifier)
        build_verifier
        ;;
    test)
        test
        ;;
    proof)
        shift
        generate_proof "$@"
        ;;
    clean)
        clean
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
