# setup-users.ps1
Write-Host "========================================" -ForegroundColor Green
Write-Host "Setting up EST Sale Users" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Wait for services to be ready
Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check if Keycloak is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/health/ready" -UseBasicParsing -TimeoutSec 5
    Write-Host "✓ Keycloak is ready" -ForegroundColor Green
} catch {
    Write-Host "✗ Keycloak is not ready. Make sure Docker is running." -ForegroundColor Red
    Write-Host "Run: docker-compose up -d" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

# Get admin token
Write-Host "Getting admin token..." -ForegroundColor Yellow
$body = @{
    client_id = 'admin-cli'
    username = 'admin'
    password = 'admin'
    grant_type = 'password'
}

try {
    $tokenResponse = Invoke-RestMethod -Uri 'http://localhost:8080/realms/master/protocol/openid-connect/token' -Method Post -Body $body
    $token = $tokenResponse.access_token
    Write-Host "✓ Got admin token" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed to get admin token" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Read-Host "Press Enter to exit"
    exit
}

# Check if realm exists
Write-Host "Checking realm..." -ForegroundColor Yellow
try {
    $realmCheck = Invoke-RestMethod -Uri "http://localhost:8080/admin/realms/est-sale" -Method Get -Headers @{Authorization = "Bearer $token"} -ErrorAction SilentlyContinue
    Write-Host "✓ Realm 'est-sale' already exists" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "Creating realm 'est-sale'..." -ForegroundColor Yellow
        $realmBody = @{
            realm = "est-sale"
            enabled = $true
            displayName = "EST Sale"
        } | ConvertTo-Json
        Invoke-RestMethod -Uri "http://localhost:8080/admin/realms" -Method Post -Headers @{Authorization = "Bearer $token"; "Content-Type" = "application/json"} -Body $realmBody
        Write-Host "✓ Realm created" -ForegroundColor Green
    } else {
        Write-Host "✗ Error checking realm" -ForegroundColor Red
    }
}

# Create roles
Write-Host "Creating roles..." -ForegroundColor Yellow
$roles = @("etudiant", "enseignant", "admin")
foreach ($role in $roles) {
    $roleBody = @{name = $role} | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri "http://localhost:8080/admin/realms/est-sale/roles" -Method Post -Headers @{Authorization = "Bearer $token"; "Content-Type" = "application/json"} -Body $roleBody -ErrorAction SilentlyContinue
        Write-Host "✓ Role '$role' created" -ForegroundColor Green
    } catch {
        Write-Host "→ Role '$role' already exists" -ForegroundColor Yellow
    }
}

# Function to create user
function Create-User {
    param($username, $email, $firstName, $lastName, $role)
    
    Write-Host "Creating user: $username..." -ForegroundColor Yellow
    
    # Check if user already exists
    $existingUsers = Invoke-RestMethod -Uri "http://localhost:8080/admin/realms/est-sale/users?username=$username" -Method Get -Headers @{Authorization = "Bearer $token"}
    if ($existingUsers.Count -gt 0) {
        Write-Host "→ User '$username' already exists" -ForegroundColor Yellow
        return
    }
    
    # Create user
    $userBody = @{
        username = $username
        email = $email
        firstName = $firstName
        lastName = $lastName
        enabled = $true
        credentials = @(
            @{
                type = "password"
                value = "password"
                temporary = $false
            }
        )
    } | ConvertTo-Json -Depth 3
    
    try {
        Invoke-RestMethod -Uri "http://localhost:8080/admin/realms/est-sale/users" -Method Post -Headers @{Authorization = "Bearer $token"; "Content-Type" = "application/json"} -Body $userBody
        Write-Host "✓ User '$username' created" -ForegroundColor Green
        
        # Wait a moment for user to be available
        Start-Sleep -Seconds 1
        
        # Get user ID and assign role
        $newUser = Invoke-RestMethod -Uri "http://localhost:8080/admin/realms/est-sale/users?username=$username" -Method Get -Headers @{Authorization = "Bearer $token"}
        $userId = $newUser[0].id
        
        # Get role ID
        $roleInfo = Invoke-RestMethod -Uri "http://localhost:8080/admin/realms/est-sale/roles/$role" -Method Get -Headers @{Authorization = "Bearer $token"}
        $roleId = $roleInfo.id
        
        # Assign role
        $roleMapping = @(@{id = $roleId; name = $role}) | ConvertTo-Json
        Invoke-RestMethod -Uri "http://localhost:8080/admin/realms/est-sale/users/$userId/role-mappings/realm" -Method Post -Headers @{Authorization = "Bearer $token"; "Content-Type" = "application/json"} -Body $roleMapping
        Write-Host "✓ Role '$role' assigned to '$username'" -ForegroundColor Green
    } catch {
        Write-Host "✗ Failed to create user '$username'" -ForegroundColor Red
        Write-Host $_.Exception.Message
    }
}

# Create users
Write-Host "`nCreating users..." -ForegroundColor Yellow
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
Read-Host "Press Enter to exit"