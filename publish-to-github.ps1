# publish-to-github.ps1
# This script publishes updates to your GitHub repository while stripping your private bets for security.

# Get path of database file
$dbPath = "$PSScriptRoot\ufc-db.js"
if (!(Test-Path $dbPath)) {
    Write-Error "ufc-db.js not found!"
    exit 1
}

Write-Host "Reading database..."
$content = Get-Content -Raw -Path $dbPath

# Extract and parse the JSON block
if ($content -match 'window\.EMBEDDED_DATA\s*=\s*(\{[\s\S]*\});?\s*$') {
    $jsonText = $Matches[1]
    
    # Parse the JSON
    try {
        $data = ConvertFrom-Json $jsonText
    } catch {
        Write-Error "Failed to parse JSON content from ufc-db.js!"
        exit 1
    }

    Write-Host "Stripping private wagers for security..."
    # Clear the bets array to keep your bets private
    $data.bets = @()

    # Reassemble the clean JavaScript string
    $cleanJson = ConvertTo-Json $data -Depth 100
    $cleanContent = "window.EMBEDDED_DATA = $cleanJson;"

    Write-Host "Preparing clean files for commit..."
    
    # Temporarily swap the database with the clean version
    Rename-Item -Path $dbPath -NewName "ufc-db-temp.js"
    Set-Content -Path $dbPath -Value $cleanContent -Encoding UTF8

    try {
        # Check if git is initialized
        if (!(git rev-parse --is-inside-work-tree 2>$null)) {
            Write-Host "Initializing Git repository in UFC folder..."
            git init
            # Set default branch to main
            git checkout -b main 2>$null
        }

        # Stage files (index.html, ufc-db.js, .gitignore, and the publish script)
        git add index.html ufc-db.js .gitignore publish-to-github.ps1

        # Commit changes
        Write-Host "Creating git commit..."
        git commit -m "Update UFC fight card and dashboard"

        # Check if remote exists
        $remote = git remote get-url origin 2>$null
        if ($null -eq $remote) {
            Write-Warning "No GitHub remote repository 'origin' is configured yet."
            Write-Warning "To push to GitHub, run: git remote add origin <your-github-repo-url>"
        } else {
            Write-Host "Pushing clean card update to GitHub..."
            git push origin main
        }
    } finally {
        # Always restore your original database with bets
        if (Test-Path $dbPath) {
            Remove-Item -Path $dbPath -Force
        }
        Rename-Item -Path "$PSScriptRoot\ufc-db-temp.js" -NewName "ufc-db.js"
        Write-Host "Database restored locally with your private wagers intact."
    }
} else {
    Write-Error "ufc-db.js is not formatted correctly. Could not find EMBEDDED_DATA."
}
