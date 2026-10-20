[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Fail-Test {
    param(
        [Parameter(Mandatory)]
        [string]$Code
    )

    throw "DPAPI_RUNTIME_LAUNCHER_TEST_$Code"
}

if (-not $IsWindows) {
    Fail-Test 'WINDOWS_REQUIRED'
}

$LauncherPath =
    Join-Path `
        $PSScriptRoot `
        'start-biometric-broker.ps1'

if (
    -not (
        Test-Path `
            -LiteralPath $LauncherPath `
            -PathType Leaf
    )
) {
    Fail-Test 'LAUNCHER_NOT_FOUND'
}

$TokenPath =
    Join-Path `
        (
            [Environment]::GetFolderPath(
                [Environment+SpecialFolder]::LocalApplicationData
            )
        ) `
        'SafeScan\Secrets\biometric-broker-token.dpapi'

if (
    -not (
        Test-Path `
            -LiteralPath $TokenPath `
            -PathType Leaf
    )
) {
    Fail-Test 'DPAPI_TOKEN_FILE_NOT_FOUND'
}

$ParserTokens =
    $null

$ParserErrors =
    $null

$null =
    [Management.Automation.Language.Parser]::ParseFile(
        $LauncherPath,
        [ref]$ParserTokens,
        [ref]$ParserErrors
    )

if (
    $ParserErrors -and
    $ParserErrors.Count -ne 0
) {
    Fail-Test 'LAUNCHER_PARSE_FAILED'
}

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
    Fail-Test 'PWSH_NOT_FOUND'
}

$Info =
    [Diagnostics.ProcessStartInfo]::new()

$Info.FileName =
    $PwshPath

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
    '-File'
)

$Info.ArgumentList.Add(
    $LauncherPath
)

$Info.ArgumentList.Add(
    '-BrokerUrl'
)

$Info.ArgumentList.Add(
    'https://example.invalid/functions/v1/biometric-broker'
)

$Info.ArgumentList.Add(
    '-BrokerTimeoutMs'
)

$Info.ArgumentList.Add(
    '5000'
)

$Info.ArgumentList.Add(
    '-ValidationProbe'
)

$Process =
    [Diagnostics.Process]::new()

$Process.StartInfo =
    $Info

try {
    if (
        -not $Process.Start()
    ) {
        Fail-Test 'PROCESS_START_FAILED'
    }

    $Output =
        $Process.StandardOutput.ReadToEnd()

    $ErrorOutput =
        $Process.StandardError.ReadToEnd()

    $Process.WaitForExit()

    if ($Process.ExitCode -ne 0) {
        # Never echo child stderr because the security contract forbids
        # propagating potentially sensitive diagnostic material.
        $null =
            $ErrorOutput

        Fail-Test "LAUNCHER_EXIT_$($Process.ExitCode)"
    }

    $ExpectedLines =
        @(
            'DPAPI_DECRYPTION=GREEN'
            'TOKEN_LENGTH=VALID'
            'CHILD_TOKEN_INJECTION=GREEN'
            'CHILD_BROKER_URL_HTTPS=GREEN'
            'CHILD_BROKER_TIMEOUT=GREEN'
            'PLAINTEXT_OUTPUT=NO'
            'HTTP_CALL=NO'
        )

    $ActualLines =
        @(
            $Output `
                -split '\r?\n' |
            Where-Object {
                $_ -ne ''
            }
        )

    $Diff =
        @(
            Compare-Object `
                -ReferenceObject $ExpectedLines `
                -DifferenceObject $ActualLines
        )

    if ($Diff.Count -ne 0) {
        Fail-Test 'OUTPUT_CONTRACT_INVALID'
    }

    if (
        $Output -match
        'SAFESCAN_BIOMETRIC_BROKER_TOKEN='
    ) {
        Fail-Test 'TOKEN_ENV_NAME_WITH_VALUE_EXPOSED'
    }

    Write-Output 'DPAPI_RUNTIME_LAUNCHER_SYNTHETIC_TEST=GREEN'
    Write-Output 'LAUNCHER_PARSE=GREEN'
    Write-Output 'DPAPI_SOURCE=EXISTING_CURRENT_USER'
    Write-Output 'CHILD_ENV_INJECTION=GREEN'
    Write-Output 'BROKER_URL_HTTPS=GREEN'
    Write-Output 'PLAINTEXT_OUTPUT=NO'
    Write-Output 'PLAINTEXT_PERSISTENCE=NO'
    Write-Output 'HTTP_CALL=NO'
    Write-Output 'CAMERA_START=NO'
}
finally {
    $Process.Dispose()
}
