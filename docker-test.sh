#!/bin/bash

# Docker Compose testing script for Obsidian Plugin
# Usage: ./docker-test.sh [command]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to run a specific service
run_service() {
    local service=$1
    print_status "Running $service..."
    if docker-compose run --rm $service; then
        print_success "$service completed successfully"
        return 0
    else
        print_error "$service failed"
        return 1
    fi
}

# Function to setup testing environment
setup() {
    print_status "Setting up Docker testing environment..."
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Build the Docker image
    print_status "Building Docker image..."
    docker-compose build
    
    print_success "Setup completed"
}

# Function to run all tests
test_all() {
    print_status "Running complete test suite..."
    
    local failed=0
    
    # Run linting
    print_status "Step 1/3: Linting"
    if ! run_service lint; then
        failed=1
    fi
    
    # Run tests
    print_status "Step 2/3: Testing"
    if ! run_service test; then
        failed=1
    fi
    
    # Run build
    print_status "Step 3/3: Building"
    if ! run_service build; then
        failed=1
    fi
    
    if [ $failed -eq 0 ]; then
        print_success "All tests passed! 🎉"
    else
        print_error "Some tests failed! ❌"
        exit 1
    fi
}

# Function to run CI pipeline
ci() {
    print_status "Running CI pipeline simulation..."
    run_service ci
}

# Function to clean up Docker resources
cleanup() {
    print_status "Cleaning up Docker resources..."
    docker-compose down --volumes --remove-orphans
    docker system prune -f
    print_success "Cleanup completed"
}

# Function to show help
show_help() {
    echo "Docker Compose testing script for Obsidian Plugin"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  setup     Setup Docker testing environment"
    echo "  test      Run all tests (lint + test + build)"
    echo "  lint      Run linting only"
    echo "  jest      Run unit tests only"
    echo "  build     Run build only"
    echo "  ci        Run full CI pipeline"
    echo "  dev       Start development environment"
    echo "  cleanup   Clean up Docker resources"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup     # First time setup"
    echo "  $0 test      # Run all tests"
    echo "  $0 ci        # Simulate CI pipeline"
}

# Main script logic
case ${1:-help} in
    setup)
        setup
        ;;
    test)
        test_all
        ;;
    lint)
        run_service lint
        ;;
    jest)
        run_service test
        ;;
    build)
        run_service build
        ;;
    ci)
        ci
        ;;
    dev)
        print_status "Starting development environment..."
        docker-compose up dev
        ;;
    cleanup)
        cleanup
        ;;
    help)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac