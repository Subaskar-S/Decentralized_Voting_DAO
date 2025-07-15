@echo off
echo.
echo ========================================
echo   DAO Governance System - GitHub Setup
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "contracts" (
    echo ERROR: Please run this script from the project root directory
    echo Current directory: %CD%
    pause
    exit /b 1
)

echo Current project status:
git status
echo.

echo Please follow these steps:
echo.
echo 1. Go to https://github.com
echo 2. Click "New Repository"
echo 3. Repository name: decentralized-voting-dao
echo 4. Description: Complete DAO system with quadratic voting, IPFS integration, and React frontend
echo 5. Make it PUBLIC
echo 6. Do NOT initialize with README
echo 7. Click "Create repository"
echo.

set /p username="Enter your GitHub username: "
if "%username%"=="" (
    echo ERROR: Username cannot be empty
    pause
    exit /b 1
)

echo.
echo Setting up remote repository...
git remote remove origin 2>nul
git remote add origin https://github.com/%username%/decentralized-voting-dao.git

echo.
echo Renaming branch to main...
git branch -M main

echo.
echo Repository remote configured:
git remote -v

echo.
echo Ready to push to GitHub!
echo Run this command when you're ready:
echo.
echo   git push -u origin main
echo.

set /p push="Push to GitHub now? (y/n): "
if /i "%push%"=="y" (
    echo.
    echo Pushing to GitHub...
    git push -u origin main
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ========================================
        echo   SUCCESS! Repository uploaded to GitHub
        echo ========================================
        echo.
        echo Your repository is now available at:
        echo https://github.com/%username%/decentralized-voting-dao
        echo.
        echo Next steps:
        echo 1. Add repository topics (dao, governance, blockchain, etc.)
        echo 2. Enable GitHub Pages for frontend demo
        echo 3. Add a LICENSE file
        echo 4. Share your amazing DAO system with the world!
        echo.
    ) else (
        echo.
        echo Push failed. Please check your credentials and try again.
        echo You may need to:
        echo 1. Generate a Personal Access Token on GitHub
        echo 2. Use the token as your password when prompted
        echo.
    )
) else (
    echo.
    echo Setup complete! Run 'git push -u origin main' when ready.
)

echo.
pause
