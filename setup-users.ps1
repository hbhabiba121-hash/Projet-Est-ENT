# setup-users.ps1 - Updated to import realm file
Write-Host "========================================" -ForegroundColor Green
Write-Host "Setting up EST Sale Users" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "Waiting for Keycloak to start (15 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Check if realm file exists and import it
if (Test-Path "est-sale-realm.json") {
    Write-Host "Found realm file! Importing existing configuration..." -ForegroundColor Green
    Write-Host "This will create the exact same users as on my machine." -ForegroundColor Yellow
    Write-Host ""
    
    # Copy realm file to container
    docker cp est-sale-realm.json keycloak-ent:/opt/keycloak/data/import/
    
    # Import the realm (this will replace existing)
    docker exec keycloak-ent /opt/keycloak/bin/kc.sh import \
      --file /opt/keycloak/data/import/est-sale-realm.json
    
    Write-Host "`n✓ Realm imported successfully!" -ForegroundColor Green
    Write-Host "You now have the exact same users as on my machine." -ForegroundColor Green
} else {
    Write-Host "No realm file found. Please run the export first." -ForegroundColor Red
    Write-Host "Run: docker exec keycloak-ent /opt/keycloak/bin/kc.sh export --realm est-sale --users realm_file --dir /opt/keycloak/data/import" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Login at: http://localhost:3000" -ForegroundColor Yellow
Write-Host "Use the same credentials as my machine" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"git add setup-users.ps1