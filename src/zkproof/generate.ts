import * as snarkjs from 'snarkjs';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Utility function to generate a random field element
export function randomFieldElement(): bigint {
  const max = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
  const randomHex = Array.from({ length: 64 }, () => 
    "0123456789abcdef"[Math.floor(Math.random() * 16)]
  ).join("");
  
  return BigInt("0x" + randomHex) % max;
}

// Compile the circuit and generate verification keys
export async function setupCircuit() {
  try {
    const circuitPath = path.resolve(process.cwd(), 'src/circuits/nftOwnership.circom');
    const buildDir = path.resolve(process.cwd(), 'build/circuits');
    
    // Create build directory if it doesn't exist
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
    }
    
    console.log('Compiling circuit...');
    
    // Compile the circuit to generate r1cs file using circom
    execSync(`npx circom ${circuitPath} --r1cs --wasm --sym -o ${buildDir}`);
    
    console.log('Circuit compiled successfully. Generating proving key...');
    
    // Generate a zKey file (proving key)
    await snarkjs.zKey.newZKey(
      path.join(buildDir, 'nftOwnership.r1cs'),
      path.join(buildDir, 'powersOfTau28_hez_final_08.ptau'), // You'd need to download this file
      path.join(buildDir, 'nftOwnership.zkey')
    );
    
    console.log('Proving key generated successfully. Creating verification key...');
    
    // Export the verification key
    const vKey = await snarkjs.zKey.exportVerificationKey(path.join(buildDir, 'nftOwnership.zkey'));
    fs.writeFileSync(
      path.join(buildDir, 'verification_key.json'),
      JSON.stringify(vKey, null, 2)
    );
    
    console.log('ZK circuit setup completed successfully!');
    return true;
  } catch (error) {
    console.error('Error during circuit setup:', error);
    return false;
  }
}

// Generate a ZK proof for NFT ownership
export async function generateNftOwnershipProof(
  walletAddress: string, 
  nftId: string
): Promise<{ proof: any; publicSignals: any; } | null> {
  try {
    const buildDir = path.resolve(process.cwd(), 'build/circuits');
    const wasmPath = path.join(buildDir, 'nftOwnership_js/nftOwnership.wasm');
    const zkeyPath = path.join(buildDir, 'nftOwnership.zkey');
    
    // Check if compiled files exist
    if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath)) {
      console.error('Circuit files not found. Run setupCircuit() first.');
      return null;
    }
    
    // Convert inputs to field elements
    const walletAddressField = BigInt("0x" + Buffer.from(walletAddress).toString('hex'));
    const nftIdField = BigInt("0x" + Buffer.from(nftId).toString('hex'));
    const hashSalt = randomFieldElement();
    
    // Circuit inputs
    const input = {
      walletAddress: walletAddressField.toString(),
      nftId: nftIdField.toString(),
      hashSalt: hashSalt.toString()
    };
    
    console.log('Generating ZK proof...');
    
    // Generate proof
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      wasmPath,
      zkeyPath
    );
    
    console.log('ZK proof generated successfully!');
    return { proof, publicSignals };
  } catch (error) {
    console.error('Error generating ZK proof:', error);
    return null;
  }
}

// Verify a ZK proof
export async function verifyProof(proof: any, publicSignals: any): Promise<boolean> {
  try {
    const buildDir = path.resolve(process.cwd(), 'build/circuits');
    const vkeyPath = path.join(buildDir, 'verification_key.json');
    
    if (!fs.existsSync(vkeyPath)) {
      console.error('Verification key not found. Run setupCircuit() first.');
      return false;
    }
    
    // Load verification key
    const vkey = JSON.parse(fs.readFileSync(vkeyPath, 'utf-8'));
    
    // Verify the proof
    const isValid = await snarkjs.groth16.verify(vkey, publicSignals, proof);
    
    console.log('Proof verification result:', isValid);
    return isValid;
  } catch (error) {
    console.error('Error verifying ZK proof:', error);
    return false;
  }
} 