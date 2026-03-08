$base = 'C:\Claude Code Projects\WB-Ozon-Bot-pro'
$v8 = Get-Content "$base\WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_8.json" -Raw | ConvertFrom-Json

Write-Host "=== v3_8 LOCAL: nodes=$($v8.nodes.Count) name=$($v8.name)"
Write-Host ""
Write-Host "=== IF Draw Flow Item ==="
$v8.connections.'IF Draw Flow Item' | ConvertTo-Json -Depth 5
Write-Host ""
Write-Host "=== Build Design Concepts ==="
$v8.connections.'Build Design Concepts' | ConvertTo-Json -Depth 5
Write-Host ""

# List all node names quickly
Write-Host "=== ALL NODES ==="
foreach ($n in $v8.nodes) { Write-Host "$($n.name)" }
