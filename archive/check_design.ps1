$base = 'C:\Claude Code Projects\WB-Ozon-Bot-pro'
$v8 = Get-Content "$base\WB_Ozon_Card_Core_n8n_2.4.7_FULL_FIXED_v3_8.json" -Raw | ConvertFrom-Json

# Dump Build Design Concepts jsCode to separate file
$bdc = $v8.nodes | Where-Object { $_.name -eq 'Build Design Concepts' }
$bdc.parameters.jsCode | Out-File "$base\tmp_bdc.js" -Encoding utf8

# Dump Prepare Image URLs
$piu = $v8.nodes | Where-Object { $_.name -eq 'Prepare Image URLs' }
$piu.parameters.jsCode | Out-File "$base\tmp_piu.js" -Encoding utf8

# Show key connections
Write-Host "=== Key design connections ==="
$keys = @('IF Draw Flow Item','Prepare Image URLs','Design Context Keeper','Download Design Concept Image','IF Concept Image Downloaded','Send Design Concept Photo Binary','IF Has Next URL','Build Concept Fallback Text','Send Concept Text Fallback','IF Last Concept')
foreach ($k in $keys) {
    if ($v8.connections.$k) {
        Write-Host "${k}:"
        foreach ($i in 0..($v8.connections.$k.main.Count - 1)) {
            $branch = if ($i -eq 0) { "TRUE " } else { "FALSE" }
            $targets = ($v8.connections.$k.main[$i] | ForEach-Object { $_.node }) -join ', '
            Write-Host "  $branch -> $targets"
        }
    }
}

Write-Host ""
Write-Host "BDC jsCode saved to tmp_bdc.js"
Write-Host "PIU jsCode saved to tmp_piu.js"
