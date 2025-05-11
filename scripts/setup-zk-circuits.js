#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Constants
// Updated to a working URL for Powers of Tau
const PTAU_URL = 'https://dweb.link/ipfs/QmTsLr5QxZm3ZQJeJnRkJrjr3Qwf2cTYzNhAVePQSw533w';
const PTAU_PATH = path.resolve(__dirname, '../build/circuits/powersOfTau28_hez_final_08.ptau');
const CIRCUIT_PATH = path.resolve(__dirname, '../src/circuits/nftOwnership.circom');
const BUILD_DIR = path.resolve(__dirname, '../build/circuits');

// Make sure build directory exists
if (!fs.existsSync(BUILD_DIR)) {
  fs.mkdirSync(BUILD_DIR, { recursive: true });
}

async function downloadPowerOfTau() {
  if (fs.existsSync(PTAU_PATH)) {
    console.log('Powers of Tau file already exists, skipping download');
    return;
  }
  
  console.log('Downloading Powers of Tau file from', PTAU_URL);
  console.log('This is a large file (approx. 100MB) and might take a while...');
  
  try {
    const response = await axios({
      method: 'get',
      url: PTAU_URL,
      responseType: 'stream',
      timeout: 300000, // 5 minute timeout for large file
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    // Write the file to disk
    const writer = fs.createWriteStream(PTAU_PATH);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log('Powers of Tau file downloaded successfully');
        resolve();
      });
      
      writer.on('error', (err) => {
        console.error('Error downloading Powers of Tau file:', err);
        reject(err);
      });
    });
  } catch (error) {
    console.error('Error downloading Powers of Tau file:', error.message);
    console.log('Alternative download method: trying with curl');
    
    try {
      // Try alternative download method using curl
      execSync(`curl -L "${PTAU_URL}" -o "${PTAU_PATH}"`, {
        stdio: 'inherit'
      });
      console.log('Powers of Tau file downloaded successfully using curl');
      return;
    } catch (curlError) {
      console.error('Error downloading with curl:', curlError);
      throw new Error('Failed to download Powers of Tau file');
    }
  }
}

async function compileCircuit() {
  try {
    console.log('Compiling circuit using circom...');
    
    execSync(`npx circom ${CIRCUIT_PATH} --r1cs --wasm --sym -o ${BUILD_DIR}`, {
      stdio: 'inherit'
    });
    
    console.log('Circuit compiled successfully');
  } catch (error) {
    console.error('Error compiling circuit:', error);
    throw error;
  }
}

async function generateZKey() {
  try {
    console.log('Generating proving key...');
    
    const snarkjs = require('snarkjs');
    
    await snarkjs.zKey.newZKey(
      path.join(BUILD_DIR, 'nftOwnership.r1cs'),
      PTAU_PATH,
      path.join(BUILD_DIR, 'nftOwnership.zkey')
    );
    
    console.log('Proving key generated successfully');
    
    console.log('Exporting verification key...');
    
    const vKey = await snarkjs.zKey.exportVerificationKey(
      path.join(BUILD_DIR, 'nftOwnership.zkey')
    );
    
    fs.writeFileSync(
      path.join(BUILD_DIR, 'verification_key.json'),
      JSON.stringify(vKey, null, 2)
    );
    
    console.log('Verification key exported successfully');
  } catch (error) {
    console.error('Error generating keys:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('Setting up ZK circuits for ZKChat');
    
    // Install circom if it doesn't exist
    try {
      execSync('which circom', { stdio: 'ignore' });
      console.log('circom is already installed');
    } catch (error) {
      console.log('Installing circom...');
      execSync('npm install -g circom', { stdio: 'inherit' });
    }
    
    // Download Powers of Tau file
    await downloadPowerOfTau();
    
    // Compile circuit
    await compileCircuit();
    
    // Generate proving and verification keys
    await generateZKey();
    
    console.log('ZK circuit setup completed successfully!');
  } catch (error) {
    console.error('Error setting up ZK circuits:', error);
    process.exit(1);
  }
}

main().catch(console.error); 