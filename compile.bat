@echo off
:: Compile CaneSugar Neural v1 paper (run twice for cross-refs)
set BIN=D:\MiKTeX\miktex\bin\x64
set TEX=d:\Temp\Project\Website\deepLearning\main.tex
echo === Pass 1 ===
"%BIN%\pdflatex.exe" -interaction=nonstopmode -file-line-error "%TEX%"
echo === Pass 2 (resolve cross-refs) ===
"%BIN%\pdflatex.exe" -interaction=nonstopmode -file-line-error "%TEX%"
echo === Done. Output: main.pdf ===
