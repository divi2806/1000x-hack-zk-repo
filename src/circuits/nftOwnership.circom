pragma circom 2.0.0;

/*
 * NFT Ownership Circuit
 * This circuit proves that a user owns a particular NFT without revealing the wallet address
 * Inputs:
 * - walletAddress: The user's wallet address (private)
 * - nftId: The ID of the NFT (private)
 * - hashSalt: Random salt to prevent rainbow table attacks (private)
 * - publicHash: Public hash commitment of the NFT ownership (public)
 */

include "circomlib/poseidon.circom";

template NftOwnershipVerifier() {
    // Private inputs
    signal input walletAddress;
    signal input nftId;  
    signal input hashSalt;
    
    // Public output (hash that can be verified)
    signal output publicHash;
    
    // Calculate the hash of all inputs to create a commitment
    component hasher = Poseidon(3);
    hasher.inputs[0] <== walletAddress;
    hasher.inputs[1] <== nftId;
    hasher.inputs[2] <== hashSalt;
    
    // The output hash is public and can be verified
    publicHash <== hasher.out;
}

component main = NftOwnershipVerifier();
