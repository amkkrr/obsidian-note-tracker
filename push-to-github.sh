#!/bin/bash

# GitHub Repository Setup Script
# Run this script after creating the repository on GitHub.com

echo "🚀 GitHub Repository Setup Script"
echo "================================="
echo ""

# Check if repository URL is provided
if [ -z "$1" ]; then
    echo "❌ Error: Repository URL required"
    echo ""
    echo "Usage: $0 <github-repo-url>"
    echo "Example: $0 https://github.com/username/obsidian-note-tracker.git"
    echo ""
    echo "Steps to create repository:"
    echo "1. Go to https://github.com/new"
    echo "2. Repository name: obsidian-note-tracker"
    echo "3. Description: Advanced Obsidian plugin for tracking note view counts with enterprise-grade architecture"
    echo "4. Choose Public"
    echo "5. Do NOT initialize with README (we already have files)"
    echo "6. Click 'Create repository'"
    echo "7. Copy the repository URL and run: $0 <url>"
    exit 1
fi

REPO_URL="$1"

echo "📋 Repository URL: $REPO_URL"
echo ""

# Verify git status
echo "🔍 Checking Git status..."
git status --porcelain
if [ $? -ne 0 ]; then
    echo "❌ Git repository not properly initialized"
    exit 1
fi

# Add remote origin
echo "🔗 Adding remote origin..."
git remote add origin "$REPO_URL"
if [ $? -ne 0 ]; then
    echo "⚠️ Remote origin might already exist, trying to set URL..."
    git remote set-url origin "$REPO_URL"
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo ""
    echo "🎯 Next steps:"
    echo "1. Visit your repository: ${REPO_URL%.git}"
    echo "2. Enable GitHub Actions (should auto-start)"
    echo "3. Set up branch protection rules"
    echo "4. Add repository topics: obsidian-plugin, typescript, note-tracking"
    echo "5. Create first release: git tag v1.0.0 && git push origin v1.0.0"
    echo ""
    echo "📊 Repository Stats:"
    echo "- Files: $(git ls-files | wc -l)"
    echo "- Commits: $(git rev-list --count HEAD)"
    echo "- Latest commit: $(git log -1 --format='%h - %s')"
else
    echo ""
    echo "❌ Failed to push to GitHub"
    echo "Please check:"
    echo "1. Repository URL is correct"
    echo "2. You have write access to the repository"
    echo "3. Network connection is stable"
    echo ""
    echo "Manual push command:"
    echo "git push -u origin main"
fi