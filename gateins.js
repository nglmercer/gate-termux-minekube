const axios = require('axios');
const fs = require('fs');
const os = require('os');

const platform = os.platform();
const arch = os.arch();

function getOSinfo() {
  return {
    platform: platform,
    os: platform === 'win32' ? 'windows' : platform,
    arch: arch === 'x64' ? 'amd64' : arch === 'arm64' ? 'arm64' : 'unknown'
  };
}

async function getGateVersions() {
  try {
    const response = await axios.get('https://api.github.com/repos/minekube/gate/releases');
    const releases = response.data;
    
    const versions = releases.map(release => {
      const version = release.tag_name.replace(/^v/, '');
      const downloads = [];
      
      release.assets.forEach(asset => {
        const match = asset.name.match(/(windows|linux)/i);
        if (!match) return;
        
        const osValue = match[0].toLowerCase();
        const assetArch = asset.name.includes('amd64') ? 'amd64' : 
                          asset.name.includes('arm64') ? 'arm64' : 'unknown';
        
        downloads.push({
          os: osValue,
          arch: assetArch,
          download_url: asset.browser_download_url,
          filename: asset.name
        });
      });
  
      return {
        version: version,
        downloads: downloads
      };
    });
    
    return versions.filter(v => v.downloads.length > 0);
  } catch (error) {
    console.error('Error al obtener las versiones:', error.message);
    return [];
  }
}

function download_urlbyOS(versions, os, arch) {
  if (versions.length > 0) {
    const download = versions[0].downloads.find(d => d.os === os && d.arch === arch);
    if (download) {
      console.log(`Descargando: ${download.filename}`);
      downloadFile(download.download_url, download.filename);
    } else {
      console.log(`No se encontró un asset para OS: ${os} y arquitectura: ${arch}`);
    }
  }
}

// Uso
(async () => {
  const versions = await getGateVersions();
  console.log(versions);

  if (versions.length > 0) {
    const osinfo = getOSinfo();
    download_urlbyOS(versions, osinfo.os, osinfo.arch);
  }
})();

// Función para descargar un archivo desde una URL utilizando Axios y responseType 'stream'
async function downloadFile(url, filename) {
  try {
    const writer = fs.createWriteStream(filename);
    const response = await axios({
      url: url,
      method: 'GET',
      responseType: 'stream'
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`Descarga completada: ${filename}`);
        resolve();
      });
      writer.on('error', (err) => {
        fs.unlink(filename, () => {}); // Elimina el archivo en caso de error
        console.error(`Error al descargar: ${err.message}`);
        reject(err);
      });
    });
  } catch (error) {
    console.error(`Error en la petición de descarga: ${error.message}`);
  }
}
