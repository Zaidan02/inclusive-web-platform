param(
    [string]$ApiBase = 'http://127.0.0.1:8081',
    [string]$FixturePassword = 'Pass123!@#'
)

$ErrorActionPreference = 'Stop'

function Get-LoginToken([string]$Email) {
    $body = @{ email = $Email; password = $FixturePassword } | ConvertTo-Json
    return (Invoke-RestMethod -Uri "$ApiBase/api/login_check" -Method Post -ContentType 'application/json' -Body $body).token
}

function Get-HttpStatus([string]$Method, [string]$Path, [string]$Token = '') {
    $headers = @{}
    if ($Token) { $headers['X-Auth-Token'] = $Token }

    try {
        $parameters = @{
            UseBasicParsing = $true
            Uri = "$ApiBase$Path"
            Method = $Method
            Headers = $headers
        }
        if ($Method -ne 'GET') {
            $parameters.ContentType = 'application/json'
            $parameters.Body = '{}'
        }
        return (Invoke-WebRequest @parameters).StatusCode
    } catch {
        if ($_.Exception.Response) {
            return [int]$_.Exception.Response.StatusCode
        }
        throw
    }
}

$protectedRoutes = @(
    @('GET', '/api/session'),
    @('GET', '/api/admin/users'),
    @('GET', '/api/admin/users/archived'),
    @('GET', '/api/admin/candidate-profiles'),
    @('GET', '/api/admin/applications'),
    @('GET', '/api/admin/applications/999/download/application'),
    @('PATCH', '/api/admin/users/999'),
    @('PATCH', '/api/admin/users/999/archive'),
    @('PATCH', '/api/admin/users/999/restore'),
    @('DELETE', '/api/admin/users/999'),
    @('POST', '/api/admin/job-catalogue/import'),
    @('GET', '/api/verifier/requests'),
    @('GET', '/api/verifier/requests/999/document'),
    @('PATCH', '/api/verifier/requests/999'),
    @('GET', '/api/candidate/profile'),
    @('PATCH', '/api/candidate/profile'),
    @('GET', '/api/candidate/matches'),
    @('POST', '/api/candidate/jobs/999/apply'),
    @('GET', '/api/candidate/applications'),
    @('POST', '/api/candidate/profile/ai-suggestions'),
    @('POST', '/api/candidate/profile/ai-confirm'),
    @('GET', '/api/candidate/privacy'),
    @('GET', '/api/candidate/privacy/export'),
    @('DELETE', '/api/candidate/privacy/ai-consent'),
    @('DELETE', '/api/candidate/privacy/account'),
    @('GET', '/api/employer/profile'),
    @('POST', '/api/employer/profile'),
    @('PATCH', '/api/employer/profile'),
    @('GET', '/api/employer/applications'),
    @('PATCH', '/api/employer/applications/999/status'),
    @('GET', '/api/employer/applications/999/download/application'),
    @('DELETE', '/api/employer/applications/999'),
    @('GET', '/api/employer/job-definitions/999'),
    @('POST', '/api/employer/jobs'),
    @('GET', '/api/employer/jobs'),
    @('PUT', '/api/employer/jobs/999'),
    @('DELETE', '/api/employer/jobs/999')
)

$results = foreach ($route in $protectedRoutes) {
    $actual = Get-HttpStatus $route[0] $route[1]
    [PSCustomObject]@{ Test = "anonymous $($route[0]) $($route[1])"; Expected = 401; Actual = $actual }
}

$admin = Get-LoginToken 'admin@join.local'
$verifier = Get-LoginToken 'verifier@join.local'
$employer = Get-LoginToken 'employer@join.local'
$candidate = Get-LoginToken 'candidate@join.local'
$forged = 'eyJhbGciOiJSUzI1NiJ9.eyJyb2xlcyI6WyJST0xFX1ZFUklGSUVSIl19.invalid'

$roleTests = @(
    @('forged token -> verifier', 'GET', '/api/verifier/requests', $forged, 401),
    @('candidate -> verifier', 'GET', '/api/verifier/requests', $candidate, 403),
    @('verifier -> admin', 'GET', '/api/admin/users', $verifier, 403),
    @('employer -> candidate', 'GET', '/api/candidate/profile', $employer, 403),
    @('candidate -> employer', 'GET', '/api/employer/profile', $candidate, 403),
    @('admin -> employer', 'GET', '/api/employer/profile', $admin, 403),
    @('valid admin', 'GET', '/api/admin/users', $admin, 200),
    @('valid verifier', 'GET', '/api/verifier/requests', $verifier, 200),
    @('valid candidate', 'GET', '/api/candidate/profile', $candidate, 200),
    @('valid candidate privacy', 'GET', '/api/candidate/privacy', $candidate, 200),
    @('employer -> candidate privacy', 'GET', '/api/candidate/privacy', $employer, 403),
    @('valid employer', 'GET', '/api/employer/profile', $employer, 200),
    @('public jobs', 'GET', '/api/jobs', '', 200),
    @('public job definitions', 'GET', '/api/job-definitions', '', 200)
)

foreach ($test in $roleTests) {
    $results += [PSCustomObject]@{
        Test = $test[0]
        Expected = $test[4]
        Actual = Get-HttpStatus $test[1] $test[2] $test[3]
    }
}

$results | Format-Table -AutoSize
$failed = @($results | Where-Object { $_.Expected -ne $_.Actual })
Write-Host "Authorization checks: $($results.Count); failures: $($failed.Count)"
if ($failed.Count -gt 0) { exit 1 }
