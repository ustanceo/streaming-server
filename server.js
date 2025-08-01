const NodeMediaServer = require('node-media-server');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static('public'));

// Platform stream key'leri (environment variables'dan alınacak)
const PLATFORMS = {
  youtube: process.env.YOUTUBE_STREAM_KEY || '',
  facebook: process.env.FACEBOOK_STREAM_KEY || '',
  twitch: process.env.TWITCH_STREAM_KEY || '',
  instagram: process.env.INSTAGRAM_STREAM_KEY || ''
};

// RTMP Server konfigürasyonu
const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8080,
    mediaroot: './media',
    allow_origin: '*'
  }
};

// Eğer platform key'leri varsa relay ekle
if (Object.values(PLATFORMS).some(key => key.length > 0)) {
  config.relay = {
    ffmpeg: '/usr/bin/ffmpeg',
    tasks: []
  };
  
  if (PLATFORMS.youtube) {
    config.relay.tasks.push({
      app: 'live',
      mode: 'push',
      edge: `rtmp://a.rtmp.youtube.com/live2/${PLATFORMS.youtube}`
    });
  }
  
  if (PLATFORMS.facebook) {
    config.relay.tasks.push({
      app: 'live',
      mode: 'push',
      edge: `rtmp://live-api-s.facebook.com:80/rtmp/${PLATFORMS.facebook}`
    });
  }
  
  if (PLATFORMS.twitch) {
    config.relay.tasks.push({
      app: 'live',
      mode: 'push',
      edge: `rtmp://ingest.twitch.tv/live/${PLATFORMS.twitch}`
    });
  }
}

const nms = new NodeMediaServer(config);

// Web arayüzü
app.get('/', (req, res) => {
  const connectedPlatforms = Object.entries(PLATFORMS)
    .filter(([platform, key]) => key.length > 0)
    .map(([platform]) => platform);
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>🚀 Çoklu Platform Streaming Server</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh; color: white;
            }
            .container { 
                max-width: 800px; margin: 0 auto; background: rgba(255,255,255,0.1);
                backdrop-filter: blur(10px); border-radius: 20px; padding: 30px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            }
            .status-card { 
                background: rgba(255,255,255,0.2); padding: 20px; border-radius: 15px;
                margin: 15px 0; border-left: 4px solid #4CAF50;
            }
            .warning-card { 
                background: rgba(255,193,7,0.2); padding: 20px; border-radius: 15px;
                margin: 15px 0; border-left: 4px solid #FFC107;
            }
            .platform-list {
                display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px; margin: 20px 0;
            }
            .platform {
                background: rgba(255,255,255,0.15); padding: 15px; border-radius: 10px;
                text-align: center; transition: transform 0.3s ease;
            }
            .platform:hover { transform: translateY(-5px); }
            .platform.connected { border: 2px solid #4CAF50; }
            .platform.disconnected { border: 2px solid #f44336; }
            .rtmp-info {
                background: rgba(0,0,0,0.3); padding: 20px; border-radius: 15px;
                margin: 20px 0; font-family: 'Courier New', monospace;
            }
            .copy-btn {
                background: #4CAF50; color: white; border: none; padding: 8px 15px;
                border-radius: 5px; cursor: pointer; margin-left: 10px;
            }
            .copy-btn:hover { background: #45a049; }
            .stats {
                display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px; margin: 20px 0;
            }
            .stat-card {
                background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px;
                text-align: center;
            }
            .stat-number { font-size: 24px; font-weight: bold; color: #4CAF50; }
            h1 { text-align: center; margin-bottom: 30px; font-size: 2.5em; }
            h2 { color: #FFD700; margin-top: 30px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 Çoklu Platform Streaming Server</h1>
            
            <div class="status-card">
                <h3>✅ Server Durumu: Aktif</h3>
                <p>RTMP Streaming Server başarıyla çalışıyor!</p>
                <p><strong>Server URL:</strong> ${req.get('host')}</p>
            </div>
            
            <div class="rtmp-info">
                <h3>📡 RTMP Bağlantı Bilgileri</h3>
                <p><strong>RTMP URL:</strong> <code>rtmp://${req.get('host')}:1935/live</code> 
                   <button class="copy-btn" onclick="copyToClipboard('rtmp://${req.get('host')}:1935/live')">Kopyala</button></p>
                <p><strong>Stream Key:</strong> <code>test</code> 
                   <button class="copy-btn" onclick="copyToClipboard('test')">Kopyala</button></p>
            </div>
            
            <h2>🎯 Bağlı Platformlar</h2>
            <div class="platform-list">
                <div class="platform ${connectedPlatforms.includes('youtube') ? 'connected' : 'disconnected'}">
                    <h4>📺 YouTube Live</h4>
                    <p>${connectedPlatforms.includes('youtube') ? '✅ Bağlı' : '❌ Bağlı değil'}</p>
                </div>
                <div class="platform ${connectedPlatforms.includes('facebook') ? 'connected' : 'disconnected'}">
                    <h4>📘 Facebook Live</h4>
                    <p>${connectedPlatforms.includes('facebook') ? '✅ Bağlı' : '❌ Bağlı değil'}</p>
                </div>
                <div class="platform ${connectedPlatforms.includes('twitch') ? 'connected' : 'disconnected'}">
                    <h4>🟣 Twitch</h4>
                    <p>${connectedPlatforms.includes('twitch') ? '✅ Bağlı' : '❌ Bağlı değil'}</p>
                </div>
                <div class="platform ${connectedPlatforms.includes('instagram') ? 'connected' : 'disconnected'}">
                    <h4>📷 Instagram Live</h4>
                    <p>${connectedPlatforms.includes('instagram') ? '✅ Bağlı' : '❌ Bağlı değil'}</p>
                </div>
            </div>
            
            ${connectedPlatforms.length === 0 ? `
            <div class="warning-card">
                <h3>⚠️ Platform Key'leri Ayarlanmamış</h3>
                <p>Çoklu platform yayını için Render.com dashboard'unda Environment Variables'ları ayarlamanız gerekiyor.</p>
                <ul>
                    <li>YOUTUBE_STREAM_KEY</li>
                    <li>FACEBOOK_STREAM_KEY</li>
                    <li>TWITCH_STREAM_KEY</li>
                    <li>INSTAGRAM_STREAM_KEY</li>
                </ul>
            </div>
            ` : ''}
            
            <h2>📊 Server İstatistikleri</h2>
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number" id="activeStreams">0</div>
                    <div>Aktif Yayın</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${connectedPlatforms.length}</div>
                    <div>Bağlı Platform</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="uptime">0</div>
                    <div>Uptime (dakika)</div>
                </div>
            </div>
            
            <h2>📱 Telefon Uygulaması Ayarları</h2>
            <div class="rtmp-info">
                <h4>Önerilen Uygulamalar:</h4>
                <ul>
                    <li><strong>Android:</strong> Larix Broadcaster, CameraFi Live</li>
                    <li><strong>iOS:</strong> Larix Broadcaster, Live:Air Action Cam</li>
                </ul>
                
                <h4>Önerilen Ayarlar:</h4>
                <ul>
                    <li><strong>Video Bitrate:</strong> 2500 kbps</li>
                    <li><strong>Audio Bitrate:</strong> 128 kbps</li>
                    <li><strong>Resolution:</strong> 1280x720 (720p)</li>
                    <li><strong>FPS:</strong> 30</li>
                    <li><strong>Keyframe Interval:</strong> 2 saniye</li>
                </ul>
            </div>
        </div>
        
        <script>
            function copyToClipboard(text) {
                navigator.clipboard.writeText(text).then(() => {
                    alert('Kopyalandı: ' + text);
                });
            }
            
            // Uptime sayacı
            let startTime = Date.now();
            setInterval(() => {
                const uptime = Math.floor((Date.now() - startTime) / 60000);
                document.getElementById('uptime').textContent = uptime;
            }, 60000);
            
            // Aktif stream sayısını kontrol et (basit simülasyon)
            setInterval(() => {
                fetch('/api/stats')
                    .then(response => response.json())
                    .then(data => {
                        document.getElementById('activeStreams').textContent = data.activeStreams || 0;
                    })
                    .catch(() => {});
            }, 5000);
        </script>
    </body>
    </html>
  `);
});

// API endpoint for stats
app.get('/api/stats', (req, res) => {
  res.json({
    activeStreams: nms.getSession() ? Object.keys(nms.getSession()).length : 0,
    connectedPlatforms: Object.values(PLATFORMS).filter(key => key.length > 0).length
  });
});

// Stream olaylarını dinle
nms.on('preConnect', (id, args) => {
  console.log('[📡 Bağlantı]', `ID: ${id}`);
});

nms.on('postConnect', (id, args) => {
  console.log('[✅ Bağlandı]', `ID: ${id}`);
});

nms.on('prePublish', (id, StreamPath, args) => {
  console.log('[📤 Yayın Hazırlanıyor]', `Path: ${StreamPath}`);
});

nms.on('postPublish', (id, StreamPath, args) => {
  console.log('🔴 [YAYIN BAŞLADI!]', `Path: ${StreamPath}`);
  console.log(`📺 Yayın ${Object.values(PLATFORMS).filter(key => key.length > 0).length} platformda aktif!`);
});

nms.on('donePublish', (id, StreamPath, args) => {
  console.log('⏹️ [YAYIN BİTTİ]', `Path: ${StreamPath}`);
});

// Server başlatma
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('🌐 Web Server:', `http://0.0.0.0:${PORT}`);
  console.log('📡 RTMP Server başlatılıyor...');
});

nms.run();
console.log('🚀 Çoklu Platform Streaming Server aktif!');
console.log('📡 RTMP Port: 1935');
console.log('🌐 HTTP Port:', PORT);
