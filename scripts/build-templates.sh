#!/bin/bash

# Build Templates Script
# Converts projects in the projects/ folder to template archives in templates/

set -e

echo "🚀 Building template archives from projects..."

# Create templates directory if it doesn't exist
mkdir -p templates

# Function to create template archive
create_template() {
    local project_name=$1
    local source_dir="projects/$project_name"
    local target_file="templates/$project_name.tgz"
    
    if [ ! -d "$source_dir" ]; then
        echo "❌ Project directory $source_dir not found, skipping..."
        return 1
    fi
    
    echo "📦 Creating template: $project_name"
    
    # Create clean archive with COPYFILE_DISABLE to prevent macOS system files
    COPYFILE_DISABLE=1 tar -czf "$target_file" \
        -C "$source_dir" \
        --exclude=node_modules \
        --exclude=.next \
        --exclude=.git \
        --exclude='.DS_Store' \
        --exclude='._*' \
        --exclude='**/._*' \
        --exclude='.env' \
        --exclude='.env.local' \
        --exclude='.vercel' \
        .
    
    echo "✅ Created: $target_file"
}

# Build all project templates
echo ""
echo "Building templates from projects folder..."
echo ""

# Process each project in the projects directory
for project_dir in projects/*/; do
    if [ -d "$project_dir" ]; then
        project_name=$(basename "$project_dir")
        create_template "$project_name"
    fi
done

echo ""
echo "🎉 Template building complete!"
echo ""
echo "Generated templates:"
ls -la templates/*.tgz 2>/dev/null || echo "No .tgz files found"
