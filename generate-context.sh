#!/bin/bash

#
# Description:
# This script generates a comprehensive prompt for an LLM by concatenating key source
# files from the Tongo Private Donation Demo project, including TypeScript backend,
# HTML frontend, Tongo SDK integration, and Starknet.js configuration.
#
# Usage:
# ./generate-context.sh
#

# --- Configuration ---
# Get current date for the output filename (ISO 8601 format for best practices)
DATE=$(date '+%Y-%m-%d_%H-%M-%S_%Z')

# Output filename with descriptive name following best practices
OUTPUT_FILE="tongo-donation-context-${DATE}.txt"

# --- Script Body ---
# Clean up any previous output file to start fresh
rm -f "$OUTPUT_FILE"

echo "🚀 Starting LLM prompt generation for the Tongo Private Donation Demo project..."
echo "------------------------------------------------------------"
echo "Output will be saved to: $OUTPUT_FILE"
echo ""

# 1. Add a Preamble and Goal for the LLM
echo "Adding LLM preamble and goal..."
{
  echo "# Tongo Private Donation Demo Project Context & Goal"
  echo ""
  echo "## Goal for the LLM"
  echo "You are an expert blockchain developer with deep expertise in:"
  echo "- TypeScript/JavaScript development"
  echo "- Starknet smart contracts and ecosystem"
  echo "- Tongo Cash protocol (private payment system)"
  echo "- Zero-knowledge proofs and privacy-preserving cryptography"
  echo "- ElGamal encryption on Stark curve"
  echo "- Starknet.js SDK integration"
  echo "- Bun runtime and package management"
  echo "- HTML/CSS/JavaScript frontend development"
  echo "- RESTful API design"
  echo "- Environment variable management"
  echo "- RPC provider configuration"
  echo "- Account abstraction and session keys"
  echo "- Private balance encryption and decryption"
  echo "- Homomorphic encryption operations"
  echo ""
  echo "Your task is to analyze the complete context of this Tongo Private Donation Demo project. The system features:"
  echo "- TypeScript service layer for Tongo operations"
  echo "- HTML frontend for donation interface"
  echo "- Tongo SDK integration (@fatsolutions/tongo-sdk)"
  echo "- Starknet.js for blockchain interactions"
  echo "- Private donation flow (amounts hidden via ZK proofs)"
  echo "- Fund, Transfer, Rollover, and Withdraw operations"
  echo "- ElGamal-encrypted balance management"
  echo "- Bun runtime for fast TypeScript execution"
  echo ""
  echo "Please review the project structure, dependencies, source code, and configuration,"
  echo "then provide specific, actionable advice for improvement. Focus on:"
  echo "- TypeScript type safety and error handling"
  echo "- Tongo SDK integration patterns"
  echo "- Starknet.js provider configuration (RPC v0.10)"
  echo "- Private key management and security"
  echo "- ZK proof generation and validation"
  echo "- ElGamal encryption/decryption operations"
  echo "- Frontend wallet integration (Argent, Braavos)"
  echo "- Error handling and retry logic"
  echo "- State management and synchronization"
  echo "- API design and validation"
  echo "- Testing strategies (unit, integration, e2e)"
  echo "- Performance optimization"
  echo "- Production deployment strategies"
  echo "- Security best practices (private key storage, RPC authentication)"
  echo "- Privacy-preserving donation flows"
  echo "- User experience improvements"
  echo ""
  echo "---"
  echo ""
} >> "$OUTPUT_FILE"

# 2. Add the project's directory structure (cleaned up)
echo "Adding cleaned directory structure..."
echo "## Directory Structure" >> "$OUTPUT_FILE"
if command -v tree &> /dev/null; then
    echo "  -> Adding directory structure (tree -L 4)"
    # Exclude common noise from the tree view
    tree -L 4 -I "node_modules|dist|.git|.DS_Store|*.log|build|__pycache__|*.pyc|*.pyo|.pytest_cache|.mypy_cache|target|*.sierra|*.casm|Library|Temp|Logs|bun.lock" >> "$OUTPUT_FILE"
else
    echo "  -> WARNING: 'tree' command not found. Using find instead."
    echo "NOTE: 'tree' command was not found. Directory listing:" >> "$OUTPUT_FILE"
    find . -maxdepth 3 -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' -not -path '*/build/*' -not -path '*/target/*' -not -path '*/Library/*' -not -path '*/Temp/*' -not -path '*/Logs/*' | head -50 >> "$OUTPUT_FILE"
fi
echo "" >> "$OUTPUT_FILE"

# 3. Add Core Project and Configuration Files
echo "Adding core project and configuration files..."
CORE_FILES=(
  "README.md"
  "package.json"
  "tsconfig.json"
  ".gitignore"
  "$0" # This script itself
)

for file in "${CORE_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  -> Adding $file"
    echo "## FILE: $file" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "---" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
  else
    echo "  -> WARNING: $file not found. Skipping."
  fi
done

# 4. Add TypeScript Source Files
echo "Adding TypeScript source files..."
if [ -d "src" ]; then
  echo "  -> Found src/ directory; adding its files"
  # Find all TypeScript files
  find "src" -type f -name "*.ts" \
    -not -path "*/node_modules/*" \
    | sort | while read -r src_file; do
      echo "  -> Adding TypeScript file: $src_file"
      echo "## FILE: $src_file" >> "$OUTPUT_FILE"
      cat "$src_file" >> "$OUTPUT_FILE"
      echo "" >> "$OUTPUT_FILE"
      echo "---" >> "$OUTPUT_FILE"
      echo "" >> "$OUTPUT_FILE"
    done
  
  # Add HTML files
  find "src" -type f -name "*.html" \
    -not -path "*/node_modules/*" \
    | sort | while read -r html_file; do
      echo "  -> Adding HTML file: $html_file"
      echo "## FILE: $html_file" >> "$OUTPUT_FILE"
      cat "$html_file" >> "$OUTPUT_FILE"
      echo "" >> "$OUTPUT_FILE"
      echo "---" >> "$OUTPUT_FILE"
      echo "" >> "$OUTPUT_FILE"
    done
else
  echo "  -> WARNING: src/ directory not found."
fi

# 5. Add Documentation Files
echo "Adding documentation files..."
if [ -d "docs" ]; then
  find "docs" -type f \( -name "*.md" -o -name "*.txt" \) \
    | sort | while read -r doc_file; do
      echo "  -> Adding documentation file: $doc_file"
      echo "## FILE: $doc_file" >> "$OUTPUT_FILE"
      cat "$doc_file" >> "$OUTPUT_FILE"
      echo "" >> "$OUTPUT_FILE"
      echo "---" >> "$OUTPUT_FILE"
      echo "" >> "$OUTPUT_FILE"
    done
else
  echo "  -> No docs directory found. Skipping."
fi

# 6. Add Deployment Configuration
echo "Adding deployment configuration..."
if [ -d "deployment" ]; then
  find "deployment" -type f \( -name "*.yaml" -o -name "*.yml" -o -name "*.sh" -o -name "*.md" \) \
    | sort | while read -r deploy_file; do
      echo "  -> Adding deployment file: $deploy_file"
      echo "## FILE: $deploy_file" >> "$OUTPUT_FILE"
      cat "$deploy_file" >> "$OUTPUT_FILE"
      echo "" >> "$OUTPUT_FILE"
      echo "---" >> "$OUTPUT_FILE"
      echo "" >> "$OUTPUT_FILE"
    done
else
  echo "  -> No deployment directory found. Skipping."
fi

# 7. Add Configuration Files (never include .env)
echo "Adding additional configuration files..."
# Never include .env to avoid secret exposure
if [ -f ".env" ]; then
  echo "  -> WARNING: .env detected but will NOT be included to avoid exposing secrets."
fi

CONFIG_FILES=(
  ".env.example"
)

for config_file in "${CONFIG_FILES[@]}"; do
  if [ -f "$config_file" ]; then
    echo "  -> Adding config file: $config_file"
    echo "## FILE: $config_file" >> "$OUTPUT_FILE"
    cat "$config_file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "---" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
  fi
done

# --- Completion Summary ---
echo ""
echo "-------------------------------------"
echo "✅ Prompt generation complete!"
echo "Generated on: $(date '+%A, %B %d, %Y at %I:%M:%S %p %Z')"
echo ""
echo "This context file now includes:"
echo "  ✓ A clear goal and preamble for the LLM"
echo "  ✓ A cleaned project directory structure"
echo "  ✓ Core project files (README.md, package.json, tsconfig.json)"
echo "  ✓ TypeScript source code (config.ts, tongo-service.ts, demo.ts, types.ts)"
echo "  ✓ HTML frontend (index.html)"
echo "  ✓ Documentation files"
echo "  ✓ Deployment configuration"
echo "  ✓ Configuration files (excluding .env)"
echo ""
echo "File size: $(du -h "$OUTPUT_FILE" | cut -f1)"
echo "Total lines: $(wc -l < "$OUTPUT_FILE" | xargs)"
echo ""
echo "You can now use the content of '$OUTPUT_FILE' as a context prompt for your LLM."
echo "Perfect for getting comprehensive code reviews, architecture advice, or feature suggestions!"
echo ""
echo "💡 Tip: This is especially useful for:"
echo "   - Tongo SDK integration optimization"
echo "   - TypeScript type safety improvements"
echo "   - Starknet.js provider configuration"
echo "   - Private key management and security"
echo "   - ZK proof generation patterns"
echo "   - ElGamal encryption operations"
echo "   - Frontend wallet integration"
echo "   - Error handling and retry logic"
echo "   - State management strategies"
echo "   - API design and validation"
echo "   - Testing strategy recommendations"
echo "   - Production deployment readiness"
echo ""
echo "🎯 Key areas to focus on:"
echo "   - Tongo Cash protocol integration"
echo "   - Private donation flow implementation"
echo "   - ZK proof generation and validation"
echo "   - ElGamal-encrypted balance management"
echo "   - Frontend wallet connection (Argent, Braavos)"
echo "   - RPC provider configuration (v0.10)"
echo "   - Error handling and logging strategies"
echo "   - Private key security best practices"
echo "   - User experience improvements"
echo "   - Performance optimization"
echo ""

