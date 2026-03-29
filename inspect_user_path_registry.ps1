try {
    $reg = Get-ItemProperty -Path 'HKCU:\Environment' -Name Path -ErrorAction Stop
    Write-Output $reg.Path
} catch {
    Write-Output 'No user PATH registry entry found.'
}
