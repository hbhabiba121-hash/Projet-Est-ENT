# setup-users.ps1 - Simplified version
Write-Host "========================================" -ForegroundColor Green
Write-Host "Setting up EST Sale Users" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Waiting for Keycloak to start (15 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host "Getting admin token..." -ForegroundColor Yellow

# Get admin token
$body = @{
    client_id = 'admin-cli'
    username = 'admin'
    password = 'admin'
    grant_type = 'password'
}

try {
    $tokenResponse = Invoke-RestMethod -Uri 'http://localhost:8080/realms/master/protocol/openid-connect/token' -Method Post -Body $body
    $token = $tokenResponse.access_token
    Write-Host "Got admin token successfully" -ForegroundColor Green
} catch {
    Write-Host "Failed to get admin token. Make sure Keycloak is running." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

Write-Host "`nCreating realm..." -ForegroundColor Yellow

# Check if realm exists
$realmUrl = "http://localhost:8080/admin/realms/est-sale"
try {
    Invoke-RestMethod -Uri $realmUrl -Method Get -Headers @{Authorization = "Bearer $token"} -ErrorAction Stop
    Write-Host "Realm already exists" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        $realmBody = '{"realm":"est-sale","enabled":true,"displayName":"EST Sale"}'
        Invoke-RestMethod -Uri "http://localhost:8080/admin/realms" -Method Post -Headers @{Authorization = "Bearer $token"; "Content-Type" = "application/json"} -Body $realmBody
        Write-Host "Realm created" -ForegroundColor Green
    } else {
        Write-Host "Error checking realm" -ForegroundColor Red
    }
}

Write-Host "`nCreating roles..." -ForegroundColor Yellow

# Create roles
$roles = @("etudiant", "enseignant", "admin")
foreach ($role in $roles) {
    $roleBody = "{`"name`":`"$role`"}"
    try {
        Invoke-RestMethod -Uri "http://localhost:8080/admin/realms/est-sale/roles" -Method Post -Headers @{Authorization = "Bearer $token"; "Content-Type" = "application/json"} -Body $roleBody -ErrorAction Stop
        Write-Host "Role '$role' created" -ForegroundColor Green
    } catch {
        Write-Host "Role '$role' already exists" -ForegroundColor Yellow
    }
}

Write-Host "`nCreating users..." -ForegroundColor Yellow

# Function to create user
function Create-User {
    param($username, $email, $firstName, $lastName, $role)
    
    Write-Host "Creating user: $username..." -ForegroundColor Yellow
    
    # Check if user exists
    $checkUrl = "http://localhost:8080/admin/realms/est-sale/users?username=$username"
    try {
        $existing = Invoke-RestMethod -Uri $checkUrl -Method Get -Headers @{Authorization = "Bearer $token"}
        if ($existing.Count -gt 0) {
            Write-Host "User '$username' already exists" -ForegroundColor Yellow
            return
        }
    } catch {
        # User doesn't exist, continue
    }
    
    # Create user
    $userBody = @"
{
    "username": "$username",
    "email": "$email",
    "firstName": "$firstName",
    "lastName": "$lastName",
    "enabled": true,
    "credentials": [{
        "type": "password",
        "value": "password",
        "temporary": false
    }]
}
"@
    
    try {
        Invoke-RestMethod -Uri "http://localhost:8080/admin/realms/est-sale/users" -Method Post -Headers @{Authorization = "Bearer $token"; "Content-Type" = "application/json"} -Body $userBody
        Write-Host "User '$username' created" -ForegroundColor Green
        
        # Wait a moment
        Start-Sleep -Seconds 1
        
        # Get user ID
        $userData = Invoke-RestMethod -Uri $checkUrl -Method Get -Headers @{Authorization = "Bearer $token"}
        $userId = $userData[0].id
        
        # Get role ID
        $roleData = Invoke-RestMethod -Uri "http://localhost:8080/admin/realms/est-sale/roles/$role" -Method Get -Headers @{Authorization = "Bearer $token"}
        $roleId = $roleData.id
        
        # Assign role
        $roleMapping = "[{`"id`":`"$roleId`",`"name`":`"$role`"}]"
        Invoke-RestMethod -Uri "http://localhost:8080/admin/realms/est-sale/users/$userId/role-mappings/realm" -Method Post -Headers @{Authorization = "Bearer $token"; "Content-Type" = "application/json"} -Body $roleMapping
        Write-Host "Role '$role' assigned to '$username'" -ForegroundColor Green
    } catch {
        Write-Host "Failed to create user '$username'" -ForegroundColor Red
        Write-Host $_.Exception.Message
    }
}

# Create all users
Create-User -username "student" -email "student@est-sale.ma" -firstName "Student" -lastName "User" -role "etudiant"
Create-User -username "teacher" -email "teacher@est-sale.ma" -firstName "Teacher" -lastName "User" -role "enseignant"
Create-User -username "admin" -email "admin@est-sale.ma" -firstName "Admin" -lastName "User" -role "admin"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Test accounts:" -ForegroundColor Yellow
Write-Host "  Student: student / password" -ForegroundColor Cyan
Write-Host "  Teacher: teacher / password" -ForegroundColor Cyan
Write-Host "  Admin: admin / password" -ForegroundColor Cyan
Write-Host ""
Write-Host "Login at: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit"docker-compose up -d