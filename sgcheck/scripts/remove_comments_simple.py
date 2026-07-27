#!/usr/bin/env python3
"""
Simple comment remover for Python and JavaScript files.
"""
import re
import os
import sys
from pathlib import Path


def remove_python_comments(content: str) -> str:
    """Remove comments from Python code."""
    lines = content.split('\n')
    result = []
    in_docstring = False
    docstring_marker = None
    
    for line in lines:
        stripped = line.strip()
        
        # Handle docstrings
        if in_docstring:
            if docstring_marker in stripped:
                in_docstring = False
            result.append(line)
            continue
        
        # Check for docstring start
        if stripped.startswith('"""') or stripped.startswith("'''"):
            marker = '"""' if stripped.startswith('"""') else "'''"
            if stripped.count(marker) >= 2:
                # Single line docstring
                result.append(line)
                continue
            else:
                in_docstring = True
                docstring_marker = marker
                result.append(line)
                continue
        
        # Remove single-line comments
        if '#' in stripped:
            # Find comment position, accounting for strings
            in_string = False
            string_char = None
            comment_pos = -1
            
            i = 0
            while i < len(stripped):
                char = stripped[i]
                
                if not in_string:
                    if char in ['"', "'"]:
                        in_string = True
                        string_char = char
                    elif char == '#':
                        comment_pos = i
                        break
                else:
                    if char == string_char and (i == 0 or stripped[i-1] != '\\'):
                        in_string = False
                
                i += 1
            
            if comment_pos > 0:
                # There's code before the comment
                code_part = line[:len(line) - len(line.lstrip()) + comment_pos]
                result.append(code_part.rstrip())
            elif comment_pos == 0:
                # Line is just a comment - skip it
                continue
            else:
                result.append(line)
        else:
            result.append(line)
    
    return '\n'.join(result)


def remove_js_comments(content: str) -> str:
    """Remove comments from JavaScript/JSX code."""
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
            if content[i] == string_char and (i == 0 or content[i-1] != '\\'):
                in_string = False
            result.append(content[i])
            i += 1
            continue
        
        # Handle template literal end
        if in_template:
            if content[i] == '`' and (i == 0 or content[i-1] != '\\'):
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


def get_file_type(filepath: Path) -> str:
    """Determine file type based on extension."""
    ext = filepath.suffix.lower()
    if ext == '.py':
        return 'python'
    elif ext in ['.js', '.jsx']:
        return 'javascript'
    return 'unknown'


def process_file(filepath: Path, dry_run: bool = False) -> bool:
    """Process a single file to remove comments."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        file_type = get_file_type(filepath)
        
        if file_type == 'python':
            new_content = remove_python_comments(content)
        elif file_type == 'javascript':
            new_content = remove_js_comments(content)
        else:
            return False
        
        if new_content != content:
            if not dry_run:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Modified: {filepath}")
            else:
                print(f"  Would modify: {filepath}")
            return True
        else:
            print(f"  No changes: {filepath}")
            return False
            
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False


def main():
    if len(sys.argv) < 2:
        print("Usage: python remove_comments_simple.py <directory_or_file> [--dry-run]")
        sys.exit(1)
    
    target = Path(sys.argv[1])
    dry_run = '--dry-run' in sys.argv
    
    if dry_run:
        print("DRY RUN MODE - No files will be modified\n")
    
    files_processed = 0
    files_modified = 0
    
    if target.is_file():
        if process_file(target, dry_run):
            files_modified += 1
        files_processed += 1
    
    elif target.is_dir():
        extensions = {'.py', '.js', '.jsx'}
        skip_dirs = {'node_modules', '__pycache__', 'dist', '.git', 'catboost_info'}
        
        for filepath in target.rglob('*'):
            if filepath.suffix.lower() in extensions:
                if any(part in filepath.parts for part in skip_dirs):
                    continue
                if process_file(filepath, dry_run):
                    files_modified += 1
                files_processed += 1
    
    else:
        print(f"Error: {target} does not exist")
        sys.exit(1)
    
    print(f"\nSummary:")
    print(f"  Files processed: {files_processed}")
    print(f"  Files modified: {files_modified}")


if __name__ == '__main__':
    main()
