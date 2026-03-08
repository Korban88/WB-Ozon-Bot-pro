$base = 'C:\Claude Code Projects\WB-Ozon-Bot-pro'
$v9 = Get-Content "$base\WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_9.json" -Raw | ConvertFrom-Json

Write-Host "Nodes: $($v9.nodes.Count)"
$n = $v9.nodes | Where-Object { $_.name -eq 'GEN: Together AI Image' }
Write-Host "New node: $($n.name) | $($n.type) | pos=$($n.position)"

$bdc = $v9.connections.'Build Design Concepts'.main[0][0].node
$gen = $v9.connections.'GEN: Together AI Image'.main[0][0].node
$t   = $v9.connections.'IF Draw Flow Item'.main[0][0].node
$f   = $v9.connections.'IF Draw Flow Item'.main[1][0].node
Write-Host "Build Design Concepts  --> $bdc"
Write-Host "GEN: Together AI Image --> $gen"
Write-Host "IF Draw Flow Item TRUE  --> $t"
Write-Host "IF Draw Flow Item FALSE --> $f"
Write-Host "OK"
