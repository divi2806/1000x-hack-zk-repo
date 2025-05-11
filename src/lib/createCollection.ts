import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  Metaplex,
  keypairIdentity,
  bundlrStorage,
  toMetaplexFile,
  NftWithToken,
} from '@metaplex-foundation/js';

// Create a collection for NFTs
export async function createCollection(
  connection: Connection,
  creator: Keypair,
  name: string,
  symbol: string,
  description: string,
  imageBuffer: Buffer
): Promise<{
  collectionNft: any; // Using 'any' to accommodate different return types
  collectionMint: PublicKey;
  collectionMetadata: PublicKey;
  collectionMasterEditionAccount: PublicKey;
}> {
  // Initialize Metaplex with the creator identity
  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(creator))
    .use(bundlrStorage({
      address: 'https://devnet.bundlr.network',
      providerUrl: connection.rpcEndpoint,
      timeout: 60000,
    }));

  console.log('Creating collection NFT...');

  // Convert image buffer to Metaplex file
  const imageFile = toMetaplexFile(imageBuffer, 'collection-image.png');
  
  // Upload the image to Arweave via Bundlr
  const imageUri = await metaplex.storage().upload(imageFile);
  console.log('Uploaded image URI:', imageUri);

  // Create metadata with the image URI
  const { uri: metadataUri } = await metaplex.nfts().uploadMetadata({
    name,
    symbol,
    description,
    image: imageUri,
    external_url: 'https://zkchat.app',
    properties: {
      files: [
        {
          uri: imageUri,
          type: 'image/png',
        },
      ],
    },
    attributes: [
      {
        trait_type: 'Collection Type',
        value: 'ZKChat',
      },
    ],
  });

  console.log('Uploaded metadata URI:', metadataUri);

  // Create the collection NFT
  const collectionNft = await metaplex.nfts().create({
    name,
    symbol,
    uri: metadataUri,
    sellerFeeBasisPoints: 0, // No royalties for the collection itself
    isCollection: true,
    updateAuthority: creator,
  });

  // Log the full structure for debugging
  console.log('Created collection NFT with keys:', Object.keys(collectionNft));

  // Cast to any and extract information safely
  const nft = collectionNft as any;

  // Extract mint address
  let mintAddress: string;
  let metadataAddress: PublicKey;
  let masterEditionAddress: PublicKey;

  try {
    // Try different properties that might contain the mint address
    if (nft.mint?.address) {
      mintAddress = nft.mint.address.toString();
    } else if (nft.address) {
      mintAddress = nft.address.toString();
    } else if (nft.assetId) {
      mintAddress = nft.assetId.toString();
    } else if (nft.id) {
      mintAddress = nft.id.toString();
    } else {
      mintAddress = 'unknown';
      console.warn('Could not determine mint address from NFT result');
    }

    // Extract metadata address
    if (nft.metadataAddress) {
      metadataAddress = nft.metadataAddress;
    } else {
      metadataAddress = new PublicKey(mintAddress);
      console.warn('Could not determine metadata address, using mint address as fallback');
    }

    // Extract master edition address
    if (nft.edition?.address) {
      masterEditionAddress = nft.edition.address;
    } else if (nft.masterEdition?.address) {
      masterEditionAddress = nft.masterEdition.address;
    } else {
      masterEditionAddress = new PublicKey(mintAddress);
      console.warn('Could not determine master edition address, using mint address as fallback');
    }
  } catch (error) {
    console.error('Error extracting addresses:', error);
    // Default fallback values
    mintAddress = 'unknown';
    metadataAddress = new PublicKey(creator.publicKey); // Use creator as fallback
    masterEditionAddress = new PublicKey(creator.publicKey); // Use creator as fallback
  }

  console.log('Created collection NFT with mint:', mintAddress);

  return {
    collectionNft,
    collectionMint: new PublicKey(mintAddress),
    collectionMetadata: metadataAddress,
    collectionMasterEditionAccount: masterEditionAddress,
  };
} 