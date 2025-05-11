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
  collectionNft: NftWithToken;
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

  console.log('Created collection NFT with mint:', collectionNft.mint.address.toBase58());

  return {
    collectionNft,
    collectionMint: collectionNft.mint.address,
    collectionMetadata: collectionNft.metadataAddress,
    collectionMasterEditionAccount: collectionNft.edition.address,
  };
} 