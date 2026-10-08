<#
.SYNOPSIS
  Convert a merged Hugging Face model directory to GGUF and register it with Ollama.

.EXAMPLE
  ./training/to_gguf.ps1 -ModelDir outputs/merged -Name agysyygpt

.NOTES
  Requires git, Python, and Ollama. Clones llama.cpp on first run.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$ModelDir,
  [string]$Name = "agysyygpt",
  [string]$Quant = "q4_k_m",
  [string]$LlamaCpp = "$env:USERPROFILE\.cache\llama.cpp"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $LlamaCpp)) {
  Write-Host "Cloning llama.cpp -> $LlamaCpp"
  git clone --depth 1 https://github.com/ggerganov/llama.cpp "$LlamaCpp"
}

python -m pip install -q -r "$LlamaCpp\requirements\requirements-convert_hf_to_gguf.txt"

$model = (Resolve-Path -LiteralPath $ModelDir).Path
$outfile = Join-Path $model "$Name.gguf"
python "$LlamaCpp\convert_hf_to_gguf.py" "$model" --outfile "$outfile" --outtype $Quant

$modelfile = Join-Path $model "Modelfile"
"FROM $outfile" | Set-Content -LiteralPath $modelfile -Encoding ascii
ollama create $Name -f $modelfile

Write-Host "done -> agys -p ollama -m $Name"
