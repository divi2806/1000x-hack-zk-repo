const { Octokit } = require('@octokit/rest');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function createGitHubRepo() {
  try {
    console.log('🚀 Starting GitHub repository creation for ZKChat project...');
    
    // Check if git is installed
    try {
      execSync('git --version', { stdio: 'ignore' });
    } catch (error) {
      console.error('❌ Git is not installed. Please install Git first.');
      process.exit(1);
    }

    // Check if already a git repo
    const isGitRepo = fs.existsSync(path.join(process.cwd(), '.git'));
    if (!isGitRepo) {
      console.log('Initializing git repository...');
      execSync('git init');
    } else {
      console.log('Git repository already initialized.');
    }

    // Get GitHub token
    let token = process.env.GITHUB_TOKEN;
    if (!token) {
      token = await prompt('Enter your GitHub personal access token: ');
      if (!token) {
        console.error('❌ GitHub token is required.');
        process.exit(1);
      }
    }

    // Get repo name
    let repoName = '1000x-zkchat-hackathon';
    const customRepoName = await prompt(`Enter repository name (default: ${repoName}): `);
    if (customRepoName) {
      repoName = customRepoName;
    }

    // Get repo visibility
    let isPrivate = false;
    const visibility = await prompt('Make repository private? (y/N): ');
    if (visibility.toLowerCase() === 'y') {
      isPrivate = true;
    }

    // Create GitHub repository
    console.log(`Creating GitHub repository: ${repoName}...`);
    const octokit = new Octokit({ auth: token });
    
    try {
      const { data: repoData } = await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        private: isPrivate,
        description: 'ZKChat application with Solana NFT gating and zero-knowledge proofs - 1000x Hackathon',
        has_issues: true,
        has_projects: true,
        has_wiki: true,
        auto_init: false
      });
      
      console.log(`✅ GitHub repository created: ${repoData.html_url}`);
      
      // Add remote
      console.log('Adding GitHub remote...');
      try {
        execSync(`git remote add origin ${repoData.clone_url}`);
      } catch (error) {
        // If already exists, set the URL
        execSync(`git remote set-url origin ${repoData.clone_url}`);
      }
      
      // Create .env file with GitHub token
      const envPath = path.join(process.cwd(), '.env.local');
      if (!fs.existsSync(envPath)) {
        fs.writeFileSync(envPath, `GITHUB_TOKEN=${token}\n`);
        console.log('Created .env.local file with GitHub token.');
      }
      
      // Create .gitignore if it doesn't exist
      const gitignorePath = path.join(process.cwd(), '.gitignore');
      if (!fs.existsSync(gitignorePath)) {
        fs.writeFileSync(gitignorePath, `
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
`);
        console.log('Created .gitignore file.');
      }
      
      console.log('\n🎉 Repository setup complete!');
      console.log(`Repository URL: ${repoData.html_url}`);
      console.log('\nNext steps:');
      console.log('1. Run: npm run publish-github');
      console.log('   or');
      console.log('2. Manually push your code:');
      console.log('   git add .');
      console.log('   git commit -m "Initial commit"');
      console.log('   git push -u origin main');
      
      return repoData.html_url;
    } catch (error) {
      console.error('❌ Failed to create GitHub repository:', error.message);
      if (error.status === 422) {
        console.error('Repository might already exist or name is invalid.');
      }
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error setting up GitHub repository:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
createGitHubRepo(); 