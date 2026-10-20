[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateNotNullOrEmpty()]
    [string]$BrokerUrl,

    [ValidateRange(1, 30000)]
    [int]$BrokerTimeoutMs = 5000,

    [switch]$ValidationProbe
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$TokenRelativePath =
    'SafeScan\Secrets\biometric-broker-token.dpapi'

$EntropyLiteral =
    'SafeScan|biometric-broker-token|v1'

$TokenMinBytes =
    32

$TokenMaxBytes =
    512

function Throw-LauncherError {
    param(
        [Parameter(Mandatory)]
        [string]$Code
    )

    throw "VISION_GATEWAY_LAUNCHER_$Code"
}

function Get-FixedTokenPath {
    $LocalAppData =
        [Environment]::GetFolderPath(
            [Environment+SpecialFolder]::LocalApplicationData
        )

    if (
        [string]::IsNullOrWhiteSpace(
            $LocalAppData
        )
    ) {
        Throw-LauncherError 'LOCALAPPDATA_UNAVAILABLE'
    }

    return (
        Join-Path `
            $LocalAppData `
            $TokenRelativePath
    )
}

function Get-NormalizedBrokerUrl {
    param(
        [Parameter(Mandatory)]
        [string]$Value
    )

    $Candidate =
        $Value.Trim()

    $Uri =
        $null

    if (
        -not [Uri]::TryCreate(
            $Candidate,
            [UriKind]::Absolute,
            [ref]$Uri
        )
    ) {
        Throw-LauncherError 'BROKER_URL_INVALID'
    }

    if (
        $Uri.Scheme -ne
        [Uri]::UriSchemeHttps
    ) {
        Throw-LauncherError 'BROKER_URL_HTTPS_REQUIRED'
    }

    if (
        -not [string]::IsNullOrEmpty(
            $Uri.UserInfo
        ) -or
        -not [string]::IsNullOrEmpty(
            $Uri.Query
        ) -or
        -not [string]::IsNullOrEmpty(
            $Uri.Fragment
        )
    ) {
        Throw-LauncherError 'BROKER_URL_COMPONENTS_FORBIDDEN'
    }

    return $Uri.AbsoluteUri.TrimEnd('/')
}

function Get-NodeExecutable {
    $Command =
        Get-Command `
            node `
            -CommandType Application `
            -ErrorAction Stop |
        Select-Object `
            -First 1

    if (
        -not $Command -or
        [string]::IsNullOrWhiteSpace(
            $Command.Source
        )
    ) {
        Throw-LauncherError 'NODE_NOT_FOUND'
    }

    return $Command.Source
}

function New-ProbeProcessStartInfo {
    param(
        [Parameter(Mandatory)]
        [string]$WorkingDirectory
    )

    $PwshPath =
        Join-Path `
            $PSHOME `
            'pwsh.exe'

    if (
        -not (
            Test-Path `
                -LiteralPath $PwshPath `
                -PathType Leaf
        )
    ) {
        Throw-LauncherError 'PWSH_NOT_FOUND'
    }

    $ProbeSource =
@'
$ErrorActionPreference = 'Stop'

$token =
    [Environment]::GetEnvironmentVariable(
        'SAFESCAN_BIOMETRIC_BROKER_TOKEN',
        'Process'
    )

$url =
    [Environment]::GetEnvironmentVariable(
        'SAFESCAN_BIOMETRIC_BROKER_URL',
        'Process'
    )

$timeout =
    [Environment]::GetEnvironmentVariable(
        'SAFESCAN_BIOMETRIC_BROKER_TIMEOUT_MS',
        'Process'
    )

if (
    [string]::IsNullOrWhiteSpace(
        $token
    )
) {
    exit 41
}

$tokenBytes =
    [Text.Encoding]::UTF8.GetByteCount(
        $token
    )

if (
    $tokenBytes -lt 32 -or
    $tokenBytes -gt 512
) {
    exit 42
}

$uri =
    $null

if (
    -not [Uri]::TryCreate(
        $url,
        [UriKind]::Absolute,
        [ref]$uri
    ) -or
    $uri.Scheme -ne
        [Uri]::UriSchemeHttps
) {
    exit 43
}

$timeoutValue =
    0

if (
    -not [int]::TryParse(
        $timeout,
        [ref]$timeoutValue
    ) -or
    $timeoutValue -lt 1 -or
    $timeoutValue -gt 30000
) {
    exit 44
}

[Console]::Out.WriteLine(
    'CHILD_TOKEN_INJECTION=GREEN'
)

[Console]::Out.WriteLine(
    'CHILD_BROKER_URL_HTTPS=GREEN'
)

[Console]::Out.WriteLine(
    'CHILD_BROKER_TIMEOUT=GREEN'
)
'@

    $ProbeEncoded =
        [Convert]::ToBase64String(
            [Text.Encoding]::Unicode.GetBytes(
                $ProbeSource
            )
        )

    $Info =
        [Diagnostics.ProcessStartInfo]::new()

    $Info.FileName =
        $PwshPath

    $Info.WorkingDirectory =
        $WorkingDirectory

    $Info.UseShellExecute =
        $false

    $Info.CreateNoWindow =
        $true

    $Info.RedirectStandardOutput =
        $true

    $Info.RedirectStandardError =
        $true

    $Info.ArgumentList.Add(
        '-NoLogo'
    )

    $Info.ArgumentList.Add(
        '-NoProfile'
    )

    $Info.ArgumentList.Add(
        '-NonInteractive'
    )

    $Info.ArgumentList.Add(
        '-EncodedCommand'
    )

    $Info.ArgumentList.Add(
        $ProbeEncoded
    )

    return $Info
}

function New-GatewayProcessStartInfo {
    param(
        [Parameter(Mandatory)]
        [string]$WorkingDirectory
    )

    $Info =
        [Diagnostics.ProcessStartInfo]::new()

    $Info.FileName =
        Get-NodeExecutable

    $Info.WorkingDirectory =
        $WorkingDirectory

    $Info.UseShellExecute =
        $false

    $Info.ArgumentList.Add(
        'src/index.mjs'
    )

    return $Info
}

try {
    Add-Type `
        -AssemblyName `
        System.Security.Cryptography.ProtectedData `
        -ErrorAction Stop
}
catch {
    Throw-LauncherError 'DPAPI_ASSEMBLY_UNAVAILABLE'
}

if (-not $IsWindows) {
    Throw-LauncherError 'WINDOWS_REQUIRED'
}

$NormalizedBrokerUrl =
    Get-NormalizedBrokerUrl `
        -Value $BrokerUrl

$TokenPath =
    Get-FixedTokenPath

if (
    -not (
        Test-Path `
            -LiteralPath $TokenPath `
            -PathType Leaf
    )
) {
    Throw-LauncherError 'DPAPI_TOKEN_FILE_NOT_FOUND'
}

$GatewayRoot =
    Split-Path `
        -Parent `
        $PSScriptRoot

$GatewayEntry =
    Join-Path `
        $GatewayRoot `
        'src\index.mjs'

if (
    -not (
        Test-Path `
            -LiteralPath $GatewayEntry `
            -PathType Leaf
    )
) {
    Throw-LauncherError 'GATEWAY_ENTRY_NOT_FOUND'
}

[byte[]]$CipherBytes =
    $null

[byte[]]$EntropyBytes =
    $null

[byte[]]$PlainBytes =
    $null

[string]$TokenString =
    $null

$ProcessInfo =
    $null

$Child =
    $null

try {
    $CipherBytes =
        [IO.File]::ReadAllBytes(
            $TokenPath
        )

    if (
        -not $CipherBytes -or
        $CipherBytes.Length -lt 1
    ) {
        Throw-LauncherError 'DPAPI_TOKEN_FILE_EMPTY'
    }

    $EntropyBytes =
        [Text.Encoding]::UTF8.GetBytes(
            $EntropyLiteral
        )

    try {
        $PlainBytes =
            [System.Security.Cryptography.ProtectedData]::Unprotect(
                $CipherBytes,
                $EntropyBytes,
                [System.Security.Cryptography.DataProtectionScope]::CurrentUser
            )
    }
    catch {
        Throw-LauncherError 'DPAPI_UNPROTECT_FAILED'
    }

    if (
        -not $PlainBytes -or
        $PlainBytes.Length -lt $TokenMinBytes -or
        $PlainBytes.Length -gt $TokenMaxBytes
    ) {
        Throw-LauncherError 'TOKEN_LENGTH_INVALID'
    }

    try {
        $StrictUtf8 =
            [Text.UTF8Encoding]::new(
                $false,
                $true
            )

        $TokenString =
            $StrictUtf8.GetString(
                $PlainBytes
            )
    }
    catch {
        Throw-LauncherError 'TOKEN_UTF8_INVALID'
    }

    if (
        [string]::IsNullOrWhiteSpace(
            $TokenString
        ) -or
        $TokenString -ne
            $TokenString.Trim()
    ) {
        Throw-LauncherError 'TOKEN_FORMAT_INVALID'
    }

    if ($ValidationProbe) {
        $ProcessInfo =
            New-ProbeProcessStartInfo `
                -WorkingDirectory $GatewayRoot
    }
    else {
        $ProcessInfo =
            New-GatewayProcessStartInfo `
                -WorkingDirectory $GatewayRoot
    }

    $ProcessInfo.Environment[
        'SAFESCAN_BIOMETRIC_BROKER_URL'
    ] =
        $NormalizedBrokerUrl

    $ProcessInfo.Environment[
        'SAFESCAN_BIOMETRIC_BROKER_TIMEOUT_MS'
    ] =
        [string]$BrokerTimeoutMs

    $ProcessInfo.Environment[
        'SAFESCAN_BIOMETRIC_BROKER_TOKEN'
    ] =
        $TokenString

    $Child =
        [Diagnostics.Process]::new()

    $Child.StartInfo =
        $ProcessInfo

    if (
        -not $Child.Start()
    ) {
        Throw-LauncherError 'CHILD_START_FAILED'
    }

    # ProcessStartInfo keeps managed strings internally. After Process.Start(),
    # remove the token reference from the parent-side environment collection.
    # .NET strings are immutable and cannot be cryptographically wiped; byte[]
    # buffers are zeroized below on a best-effort basis.
    $null = $ProcessInfo.Environment.Remove(
        'SAFESCAN_BIOMETRIC_BROKER_TOKEN'
    )

    $TokenString =
        $null

    if ($PlainBytes) {
        [Array]::Clear(
            $PlainBytes,
            0,
            $PlainBytes.Length
        )
    }

    if ($ValidationProbe) {
        $ProbeOutput =
            $Child.StandardOutput.ReadToEnd()

        # Drain stderr without echoing it. The probe is designed never to
        # include secret material, but launcher failures remain code-only.
        $null =
            $Child.StandardError.ReadToEnd()

        $Child.WaitForExit()

        if ($Child.ExitCode -ne 0) {
            Throw-LauncherError "VALIDATION_PROBE_EXIT_$($Child.ExitCode)"
        }

        $ExpectedProbeLines =
            @(
                'CHILD_TOKEN_INJECTION=GREEN'
                'CHILD_BROKER_URL_HTTPS=GREEN'
                'CHILD_BROKER_TIMEOUT=GREEN'
            )

        $ActualProbeLines =
            @(
                $ProbeOutput `
                    -split '\r?\n' |
                Where-Object {
                    $_ -ne ''
                }
            )

        $ProbeDiff =
            @(
                Compare-Object `
                    -ReferenceObject $ExpectedProbeLines `
                    -DifferenceObject $ActualProbeLines
            )

        if ($ProbeDiff.Count -ne 0) {
            Throw-LauncherError 'VALIDATION_PROBE_OUTPUT_INVALID'
        }

        Write-Output 'DPAPI_DECRYPTION=GREEN'
        Write-Output 'TOKEN_LENGTH=VALID'
        Write-Output 'CHILD_TOKEN_INJECTION=GREEN'
        Write-Output 'CHILD_BROKER_URL_HTTPS=GREEN'
        Write-Output 'CHILD_BROKER_TIMEOUT=GREEN'
        Write-Output 'PLAINTEXT_OUTPUT=NO'
        Write-Output 'HTTP_CALL=NO'
    }
    else {
        Write-Output 'VISION_GATEWAY_CHILD_STARTED=GREEN'
        Write-Output "VISION_GATEWAY_CHILD_PID=$($Child.Id)"
        Write-Output 'BROKER_TOKEN_SOURCE=DPAPI_CURRENT_USER'
        Write-Output 'PLAINTEXT_OUTPUT=NO'

        $Child.WaitForExit()

        if ($Child.ExitCode -ne 0) {
            Throw-LauncherError "GATEWAY_EXIT_$($Child.ExitCode)"
        }
    }
}
finally {
    if (
        $ProcessInfo -and
        $ProcessInfo.Environment.ContainsKey(
            'SAFESCAN_BIOMETRIC_BROKER_TOKEN'
        )
    ) {
        $null = $ProcessInfo.Environment.Remove(
            'SAFESCAN_BIOMETRIC_BROKER_TOKEN'
        )
    }

    $TokenString =
        $null

    if ($PlainBytes) {
        [Array]::Clear(
            $PlainBytes,
            0,
            $PlainBytes.Length
        )
    }

    if ($EntropyBytes) {
        [Array]::Clear(
            $EntropyBytes,
            0,
            $EntropyBytes.Length
        )
    }

    if ($CipherBytes) {
        [Array]::Clear(
            $CipherBytes,
            0,
            $CipherBytes.Length
        )
    }

    if ($Child) {
        $Child.Dispose()
    }
}
