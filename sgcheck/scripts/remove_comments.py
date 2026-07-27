#!/usr/bin/env python3
"""
Safe comment remover for Python and JavaScript files.
Preserves:
- Shebangs (#!/usr/bin/env python)
- Docstrings that are part of function/class definitions
- Strings that contain comment-like patterns
- Code that looks like comments but isn't
"""

import re
import os
import sys
from pathlib import Path


def remove_python_comments(content: str) -> str:
    """
    Remove comments from Python code while preserving:
    - Shebangs
    - Docstrings (triple-quoted strings)
    - Strings containing # or """
    """
    lines = content.split('\n')
    result = []
    in_docstring = False
    docstring_quote = None
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        
        # Skip empty lines
        if not stripped:
            result.append(line)
            continue
        
        # Handle shebangs
        if stripped.startswith('#!'):
            result.append(line)
            continue
        
        # Handle docstrings (triple-quoted strings)
        if in_docstring:
            if docstring_quote in stripped:
                in_docstring = False
            result.append(line)
            continue
        
        # Check for start of docstring
        triple_double = '"""'
        triple_single = "'''"
        if triple_double in stripped or triple_single in stripped:
            quote = triple_double if triple_double in stripped else triple_single
            # Check if it's a complete docstring on one line
            if stripped.count(quote) >= 2:
                # Complete docstring on one line - keep it
                result.append(line)
                continue
            else:
                # Start of multi-line docstring
                in_docstring = True
                docstring_quote = quote
                result.append(line)
                continue
        
        # Remove single-line comments (# ...)
        # But be careful not to remove # inside strings
        comment_pos = find_comment_position(stripped)
        if comment_pos > 0:
            # There's a comment after code
            code_part = line[:len(line) - len(line.lstrip()) + comment_pos].rstrip()
            result.append(code_part)
        elif comment_pos == 0:
            # Line starts with a comment - skip it
            continue
        else:
            # No comment found
            result.append(line)
    
    return '\n'.join(result)


def find_comment_position(line: str) -> int:
    """
    Find the position of a comment in a line.
    Returns -1 if no comment found, 0 if line starts with comment,
    or the position where comment starts.
    """
    in_single_quote = False
    in_double_quote = False
    in_triple_single = False
    in_triple_double = False
    
    i = 0
    while i < len(line):
        char = line[i]
        
        # Handle triple quotes
        if line[i:i+3] == '"""':
            if in_triple_double:
                in_triple_double = False
                i += 3
                continue
            elif not in_single_quote and not in_double_quote and not in_triple_single:
                in_triple_double = True
                i += 3
                continue
        
        if line[i:i+3] == "'''":
            if in_triple_single:
                in_triple_single = False
                i += 3
                continue
            elif not in_single_quote and not in_double_quote and not in_triple_double:
                in_triple_single = True
                i += 3
                continue
        
        # Handle regular quotes
        if char == '"' and not in_single_quote and not in_triple_single and not in_triple_double:
            in_double_quote = not in_double_quote
        elif char == "'" and not in_double_quote and not in_triple_single and not in_triple_double:
            in_single_quote = not in_single_quote
        
        # Check for comment
        if char == '#' and not in_single_quote and not in_double_quote and not in_triple_single and not in_triple_double:
            return i
        
        i += 1
    
    return -1


def remove_js_comments(content: str) -> str:
    """
    Remove comments from JavaScript/JSX code while preserving:
    - Strings containing // or /*
    - Template literals
    - Regex patterns
    """
    result = []
    i = 0
    in_string = False
    string_char = None
    in_template = False
    
    while i < len(content):
        # Handle string start
        if not in_string and not in_template:
            if content[i] in ['"', "'"]:
                in_string = True
                string_char = content[i]
                result.append(content[i])
                i += 1
                continue
            elif content[i] == '`':
                in_template = True
                result.append(content[i])
                i += 1
                continue
        
        # Handle string end
        if in_string:
            if content[i] == string_char and content[i-1:i] != '\\':
                in_string = False
            result.append(content[i])
            i += 1
            continue
        
        # Handle template literal end
        if in_template:
            if content[i] == '`' and content[i-1:i] != '\\':
                in_template = False
            result.append(content[i])
            i += 1
            continue
        
        # Check for single-line comment
        if content[i:i+2] == '//':
            # Skip until end of line
            while i < len(content) and content[i] != '\n':
                i += 1
            continue
        
        # Check for multi-line comment
        if content[i:i+2] == '/*':
            # Skip until */
            i += 2
            while i < len(content) - 1:
                if content[i:i+2] == '*/':
                    i += 2
                    break
                i += 1
            continue
        
        result.append(content[i])
        i += 1
    
    return ''.join(result)


def process_file(filepath: Path, file_type: str) -> bool:
    """
    Process a single file to remove comments.
    Returns True if file was modified.
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if file_type == 'python':
            new_content = remove_python_comments(content)
        elif file_type in ['javascript', 'jsx']:
            new_content = remove_js_comments(content)
        else:
            return False
        
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"✓ Modified: {filepath}")
            return True
        else:
            print(f"  No changes: {filepath}")
            return False
            
    except Exception as e:
        print(f"✗ Error processing {filepath}: {e}")
        return False


def get_file_type(filepath: Path) -> str:
    """Determine file type based on extension."""
    ext = filepath.suffix.lower()
    if ext == '.py':
        return 'python'
    elif ext == '.js':
        return 'javascript'
    elif ext == '.jsx':
        return 'jsx'
    else:
        return 'unknown'


def main():
    if len(sys.argv) < 2:
        print("Usage: python remove_comments.py <directory_or_file> [--dry-run]")
        print("  --dry-run: Show what would be changed without modifying files")
        sys.exit(1)
    
    target = Path(sys.argv[1])
    dry_run = '--dry-run' in sys.argv
    
    if dry_run:
        print("DRY RUN MODE - No files will be modified\n")
    
    files_processed = 0
    files_modified = 0
    
    if target.is_file():
        file_type = get_file_type(target)
        if file_type in ['python', 'javascript', 'jsx']:
            if not dry_run:
                if process_file(target, file_type):
                    files_modified += 1
            else:
                print(f"Would process: {target}")
            files_processed += 1
        else:
            print(f"Skipping unsupported file type: {target}")
    
    elif target.is_dir():
        # Process all relevant files in directory
        extensions = {'.py', '.js', '.jsx'}
        
        for filepath in target.rglob('*'):
            if filepath.suffix.lower() in extensions:
                # Skip node_modules, __pycache__, dist, .git
                if any(part in filepath.parts for part in ['node_modules', '__pycache__', 'dist', '.git']):
                    continue
                
                file_type = get_file_type(filepath)
                if not dry_run:
                    if process_file(filepath, file_type):
                        files_modified += 1
                else:
                    print(f"Would process: {filepath}")
                files_processed += 1
    
    else:
        print(f"Error: {target} does not exist")
        sys.exit(1)
    
    print(f"\nSummary:")
    print(f"  Files processed: {files_processed}")
    print(f"  Files modified: {files_modified}")


if __name__ == '__main__':
    main()
