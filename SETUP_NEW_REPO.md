# Setting Up Your New GitHub Repository

This guide will help you disconnect this project from the original repository and set it up with your own GitHub account.

## Step 1: Remove the Old Git Remote

Remove the connection to the original repository:

```bash
git remote remove origin
```

Verify it's removed:
```bash
git remote -v
```

(Should show no output)

## Step 2: Create a New Repository on GitHub

1. Go to [GitHub](https://github.com) and sign in
2. Click the **"+"** icon in the top right → **"New repository"**
3. Fill in the details:
   - **Repository name**: `gdc-dental-app` (or your preferred name)
   - **Description**: "Dental practice management application"
   - **Visibility**: Choose Private or Public
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click **"Create repository"**

## Step 3: Connect to Your New Repository

After creating the repository, GitHub will show you commands. Use these:

```bash
# Add your new repository as the remote origin
git remote add origin https://github.com/YOUR_USERNAME/gdc-dental-app.git

# Or if you prefer SSH:
# git remote add origin git@github.com:YOUR_USERNAME/gdc-dental-app.git

# Verify the remote is set correctly
git remote -v
```

## Step 4: Push Your Code

```bash
# Make sure you're on the main/master branch
git branch

# If you need to rename the branch to main:
# git branch -M main

# Push to your new repository
git push -u origin main
# or if your branch is named master:
# git push -u origin master
```

## Step 5: Verify Everything is Independent

1. Check that your `.env` files are in `.gitignore`:
   ```bash
   git check-ignore server/.env client/.env
   ```
   (Should show the file paths if they're ignored)

2. Verify no sensitive data is tracked:
   ```bash
   git ls-files | grep -E "\.env|config|secret"
   ```
   (Should not show any .env files)

3. Check your remote:
   ```bash
   git remote -v
   ```
   (Should show YOUR repository, not the original one)

## Step 6: Update Documentation (Optional)

If you want to update any references in the code:
- Check `package.json` files (already updated)
- Update README.md if needed
- Add your repository URL to package.json if desired

## Important Notes

✅ **DO NOT** commit `.env` files - they contain sensitive credentials
✅ **DO NOT** commit `node_modules/` - they're in `.gitignore`
✅ **DO** keep your Supabase credentials secure
✅ **DO** use environment variables for all configuration

## Next Steps

After setting up your repository:

1. Complete the Supabase setup (see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md))
2. Configure your environment variables
3. Run the application locally
4. Deploy when ready (Vercel, Netlify, Railway, etc.)

## Troubleshooting

### "Remote origin already exists"
If you get this error, remove it first:
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/gdc-dental-app.git
```

### "Permission denied"
Make sure you're authenticated with GitHub:
```bash
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

For SSH, ensure your SSH key is added to GitHub.

### "Branch not found"
Check your current branch:
```bash
git branch
```
If it's `master`, either:
- Push to master: `git push -u origin master`
- Or rename to main: `git branch -M main` then `git push -u origin main`

---

Your project is now completely independent and ready to be pushed to your own GitHub repository!

