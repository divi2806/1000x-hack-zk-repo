import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

async function downloadPowerOfTau() {
  try {
    const buildDir = path.resolve(process.cwd(), 'build/circuits');
    const ptauPath = path.join(buildDir, 'powersOfTau28_hez_final_08.ptau');
    
    // Create build directory if it doesn't exist
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
    }
    
    // Skip if file already exists
    if (fs.existsSync(ptauPath)) {
      console.log('Powers of Tau file already exists');
      return;
    }
    
    console.log('Downloading Powers of Tau file...');
    
    // URL to the Powers of Tau file (8 powers)
    const ptauUrl = 'https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_08.ptau';
    
    // Download the file
    const response = await axios({
      method: 'get',
      url: ptauUrl,
      responseType: 'stream'
    });
    
    // Write the file to disk
    const writer = fs.createWriteStream(ptauPath);
    response.data.pipe(writer);
    
    return new Promise<void>((resolve, reject) => {
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
    console.error('Error downloading Powers of Tau file:', error);
    throw error;
  }
}

// Run the download if this file is executed directly
if (require.main === module) {
  downloadPowerOfTau().catch(console.error);
}

export default downloadPowerOfTau; 