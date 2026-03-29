$p = $env:Path -split ';'
$p | Where-Object { $_ -match 'mongosh|Downloads' }
Write-Output '---'
Get-Command mongosh -ErrorAction SilentlyContinue | Format-List Name,Definition,Source,CommandType
