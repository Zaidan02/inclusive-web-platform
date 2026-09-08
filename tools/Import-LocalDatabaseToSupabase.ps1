[CmdletBinding()]
param(
    [string]$EncryptedConnectionFile
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$backendDirectory = Join-Path $repositoryRoot 'backend'
$backupDirectory = Join-Path $backendDirectory 'var\backups'
$backupRelativePath = 'var\backups\local-staging-seed.dump'
$containerBackupPath = '/tmp/local-staging-seed.dump'

$countSql = @'
SELECT 'application_outcome_event=' || COUNT(*) FROM application_outcome_event;
SELECT 'candidate_position_interest=' || COUNT(*) FROM candidate_position_interest;
SELECT 'candidate_profile=' || COUNT(*) FROM candidate_profile;
SELECT 'candidate_profile_ai_event=' || COUNT(*) FROM candidate_profile_ai_event;
SELECT 'candidate_profile_disability=' || COUNT(*) FROM candidate_profile_disability;
SELECT 'candidate_task_skill=' || COUNT(*) FROM candidate_task_skill;
SELECT 'candidate_verification_access_event=' || COUNT(*) FROM candidate_verification_access_event;
SELECT 'candidate_verification_request=' || COUNT(*) FROM candidate_verification_request;
SELECT 'consent_record=' || COUNT(*) FROM consent_record;
SELECT 'disability=' || COUNT(*) FROM disability;
SELECT 'disability_task_assessment=' || COUNT(*) FROM disability_task_assessment;
SELECT 'employer_profile=' || COUNT(*) FROM employer_profile;
SELECT 'job_application=' || COUNT(*) FROM job_application;
SELECT 'job_definition=' || COUNT(*) FROM job_definition;
SELECT 'job_definition_task=' || COUNT(*) FROM job_definition_task;
SELECT 'job_post=' || COUNT(*) FROM job_post;
SELECT 'job_post_highlighted_task=' || COUNT(*) FROM job_post_highlighted_task;
SELECT 'user=' || COUNT(*) FROM "user";
'@

$emptyCheckSql = @'
SELECT
    (SELECT COUNT(*) FROM application_outcome_event) +
    (SELECT COUNT(*) FROM candidate_position_interest) +
    (SELECT COUNT(*) FROM candidate_profile) +
    (SELECT COUNT(*) FROM candidate_profile_ai_event) +
    (SELECT COUNT(*) FROM candidate_profile_disability) +
    (SELECT COUNT(*) FROM candidate_task_skill) +
    (SELECT COUNT(*) FROM candidate_verification_access_event) +
    (SELECT COUNT(*) FROM candidate_verification_request) +
    (SELECT COUNT(*) FROM consent_record) +
    (SELECT COUNT(*) FROM disability) +
    (SELECT COUNT(*) FROM disability_task_assessment) +
    (SELECT COUNT(*) FROM employer_profile) +
    (SELECT COUNT(*) FROM job_application) +
    (SELECT COUNT(*) FROM job_definition) +
    (SELECT COUNT(*) FROM job_definition_task) +
    (SELECT COUNT(*) FROM job_post) +
    (SELECT COUNT(*) FROM job_post_highlighted_task) +
    (SELECT COUNT(*) FROM "user");
'@

function Invoke-ComposeChecked {
    param([Parameter(Mandatory)][string[]]$Arguments)

    & docker compose @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Docker Compose command failed with exit code $LASTEXITCODE."
    }
}

function Invoke-RemoteSql {
    param([Parameter(Mandatory)][string]$Sql)

    $output = @($Sql | & docker compose exec -T -e SUPABASE_DB_URL database sh -lc 'psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -At')
    if ($LASTEXITCODE -ne 0) {
        throw 'Could not run the Supabase database check.'
    }
    return $output
}

if ($EncryptedConnectionFile) {
    if (-not (Test-Path -LiteralPath $EncryptedConnectionFile -PathType Leaf)) {
        throw "Encrypted connection file not found: $EncryptedConnectionFile"
    }
    $encryptedConnection = (Get-Content -LiteralPath $EncryptedConnectionFile -Raw).Trim()
    $secureConnection = $encryptedConnection | ConvertTo-SecureString
}
else {
    $secureConnection = Read-Host 'Paste the Supabase Session pooler URI (the input is hidden)' -AsSecureString
}
$connectionPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureConnection)

try {
    $connectionUrl = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($connectionPointer)
    if ($connectionUrl -notmatch '^postgres(?:ql)?://') {
        throw 'The value is not a PostgreSQL connection URI.'
    }
    if ($connectionUrl -notmatch '(?:pooler\.supabase\.com|db\.[a-z0-9]+\.supabase\.co)') {
        throw 'The connection URI does not appear to belong to Supabase.'
    }
    if ($connectionUrl -match 'YOUR-PASSWORD|\[.*PASSWORD.*\]') {
        throw 'Replace the password placeholder in the Supabase URI before running the import.'
    }
    if ($connectionUrl -notmatch '[?&]sslmode=') {
        $connectionUrl += $(if ($connectionUrl.Contains('?')) { '&sslmode=require' } else { '?sslmode=require' })
    }

    $env:SUPABASE_DB_URL = $connectionUrl
    Push-Location $backendDirectory
    try {
        Write-Host '1/5 Checking the local PostgreSQL service...'
        Invoke-ComposeChecked -Arguments @('up', '-d', 'database')

        Write-Host '2/5 Checking that the Supabase application tables are empty...'
        $remoteCheckOutput = Invoke-RemoteSql -Sql $emptyCheckSql
        $remoteCountText = $remoteCheckOutput | Where-Object { $_ -match '^\d+$' } | Select-Object -Last 1
        if ($null -eq $remoteCountText) {
            throw 'Supabase did not return a valid application-row count.'
        }
        $remoteRowCount = [int64]$remoteCountText
        if ($remoteRowCount -ne 0) {
            throw "Import stopped: the Supabase application tables already contain $remoteRowCount rows. Nothing was overwritten."
        }

        Write-Host '3/5 Creating a fresh data-only backup of the local application tables...'
        New-Item -ItemType Directory -Force -Path $backupDirectory | Out-Null
        Invoke-ComposeChecked -Arguments @(
            'exec', '-T', 'database',
            'pg_dump', '-U', 'app', '-d', 'app',
            '--format=custom', '--data-only', '--schema=public',
            '--no-owner', '--no-privileges',
            '--exclude-table=doctrine_migration_versions',
            "--file=$containerBackupPath"
        )
        Invoke-ComposeChecked -Arguments @('cp', "database:$containerBackupPath", $backupRelativePath)

        $archiveList = @(& docker compose exec -T database pg_restore --list $containerBackupPath)
        if ($LASTEXITCODE -ne 0) {
            throw 'Could not read the PostgreSQL backup contents.'
        }
        $restoreList = @($archiveList | Where-Object { $_ -notmatch 'SEQUENCE SET public candidate_position_interest_id_seq1 ' })
        if ($restoreList.Count -ne ($archiveList.Count - 1)) {
            throw 'Could not identify exactly one obsolete local sequence entry in the backup.'
        }
        $restoreList | & docker compose exec -T database dd of=/tmp/local-staging-seed.list status=none
        if ($LASTEXITCODE -ne 0) {
            throw 'Could not create the filtered PostgreSQL restore list.'
        }

        Write-Host '4/5 Restoring the backup to Supabase in one transaction...'
        Invoke-ComposeChecked -Arguments @(
            'exec', '-T', '-e', 'SUPABASE_DB_URL', 'database', 'sh', '-lc',
            "pg_restore --use-list=/tmp/local-staging-seed.list --dbname=`"`$SUPABASE_DB_URL`" --data-only --no-owner --no-privileges --single-transaction --exit-on-error '$containerBackupPath'"
        )

        Write-Host '5/5 Comparing local and Supabase table counts...'
        $localCounts = @($countSql | & docker compose exec -T database psql -U app -d app -v ON_ERROR_STOP=1 -At)
        if ($LASTEXITCODE -ne 0) {
            throw 'Could not read the local verification counts.'
        }
        $remoteCounts = @(Invoke-RemoteSql -Sql $countSql)
        $differences = @(Compare-Object -ReferenceObject $localCounts -DifferenceObject $remoteCounts)
        if ($differences.Count -gt 0) {
            $differences | Format-Table | Out-String | Write-Host
            throw 'The restore completed, but the verification counts differ.'
        }

        Write-Host ''
        Write-Host 'Database import completed and verified successfully.' -ForegroundColor Green
        Write-Host "Backup: $backupDirectory\local-staging-seed.dump"
        Write-Warning 'Database rows do not copy binary files. Upload the local candidate verification document and employer logo to their Supabase Storage buckets separately.'
    }
    finally {
        Pop-Location
    }
}
finally {
    Remove-Item Env:SUPABASE_DB_URL -ErrorAction SilentlyContinue
    if ($connectionPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($connectionPointer)
    }
    $connectionUrl = $null
}
